import { type Server } from "node:http";
import type { Duplex } from "node:stream";
import { verifyToken } from "@clerk/express";
import { WebSocketServer, WebSocket } from "ws";
import { db } from "../db/client.js";

type WorkspaceSocket = WebSocket & {
	workspaceRouteId?: string;
	workspaceId?: string;
	userId?: string;
	authenticated?: boolean;
	authTimeout?: NodeJS.Timeout;
};

type WsMessage = {
	type?: string;
	requestId?: string;
	payload?: {
		token?: string;
		workspaceId?: string;
	};
};

const WORKSPACE_PATH_RE = /^\/ws\/workspaces\/([^/]+)$/;

const sendJson = (ws: WebSocket, data: unknown) => {
	if (ws.readyState === WebSocket.OPEN) {
		ws.send(JSON.stringify(data));
	}
};

const rejectUpgrade = (socket: Duplex, statusCode: number, message: string) => {
	if (!socket.destroyed && socket.writable) {
		socket.write(
			`HTTP/1.1 ${statusCode} ${message}\r\nContent-Type: text/plain\r\nConnection: close\r\n\r\n${message}`,
		);
	}
	socket.destroy();
};

const validateWorkspaceMembership = async (workspaceId: string, userId: string) => {
	const membership = await db.workspaceMember.findUnique({
		where: {
			workspaceId_userId: {
				workspaceId,
				userId,
			},
		},
		select: {
			workspaceId: true,
		},
	});

	return Boolean(membership);
};

export function setupWebSocket(server: Server) {
	const wss = new WebSocketServer({ noServer: true });

	// Workspace rooms only exist while at least one connection is active.
	const rooms = new Map<string, Set<WorkspaceSocket>>();

	const leaveWorkspace = (ws: WorkspaceSocket) => {
		if (!ws.workspaceId) {
			return;
		}

		const room = rooms.get(ws.workspaceId);
		if (!room) {
			ws.workspaceId = undefined;
			return;
		}

		room.delete(ws);
		const closedWorkspaceId = ws.workspaceId;
		ws.workspaceId = undefined;

		if (room.size === 0) {
			rooms.delete(closedWorkspaceId);
			console.log(`Workspace ${closedWorkspaceId} room closed (empty)`);
		}
	};

	const joinWorkspace = (ws: WorkspaceSocket, workspaceId: string) => {
		leaveWorkspace(ws);

		let room = rooms.get(workspaceId);
		if (!room) {
			room = new Set<WorkspaceSocket>();
			rooms.set(workspaceId, room);
			console.log(`Workspace ${workspaceId} room initialized`);
		}

		room.add(ws);
		ws.workspaceId = workspaceId;
	};

	wss.on("connection", (socket: WebSocket) => {
		const ws = socket as WorkspaceSocket;
		const routeWorkspaceId = ws.workspaceRouteId;

		ws.authenticated = false;

		ws.authTimeout = setTimeout(() => {
			if (!ws.authenticated && ws.readyState === WebSocket.OPEN) {
				sendJson(ws, {
					type: "ERROR",
					payload: {
						code: "AUTH_TIMEOUT",
						message: "Authentication timeout",
					},
				});
				ws.close(1008, "Authentication timeout");
			}
		}, 10_000);

		if (!routeWorkspaceId) {
			sendJson(ws, {
				type: "ERROR",
				payload: {
					code: "INVALID_ROUTE",
					message: "Missing workspace route",
				},
			});
			ws.close(1008, "Invalid route");
			return;
		}

		ws.on("message", async (raw) => {
			let data: WsMessage;
			try {
				const serialized =
					typeof raw === "string"
						? raw
						: Buffer.isBuffer(raw)
							? raw.toString("utf8")
							: raw.toString();
				data = JSON.parse(serialized) as WsMessage;
			} catch {
				sendJson(ws, {
					type: "ERROR",
					payload: {
						code: "BAD_MESSAGE",
						message: "Invalid JSON payload",
					},
				});
				return;
			}

			if (data.type === "PING") {
				sendJson(ws, { type: "PONG", requestId: data.requestId, payload: { ts: Date.now() } });
				return;
			}

			if (!ws.authenticated) {
				if (data.type !== "AUTH") {
					sendJson(ws, {
						type: "ERROR",
						payload: {
							code: "UNAUTHORIZED",
							message: "Send AUTH message first",
						},
					});
					return;
				}

				const token = data.payload?.token?.trim();
				if (!token) {
					sendJson(ws, {
						type: "ERROR",
						payload: {
							code: "TOKEN_REQUIRED",
							message: "AUTH requires token",
						},
					});
					ws.close(1008, "Unauthorized");
					return;
				}

				const secretKey = process.env.CLERK_SECRET_KEY;
				if (!secretKey) {
					sendJson(ws, {
						type: "ERROR",
						payload: {
							code: "SERVER_MISCONFIGURED",
							message: "CLERK_SECRET_KEY is missing",
						},
					});
					ws.close(1011, "Server misconfigured");
					return;
				}

				try {
					const verified = await verifyToken(token, { secretKey });
					const userId = verified.sub;

					if (!userId) {
						sendJson(ws, {
							type: "ERROR",
							payload: {
								code: "UNAUTHORIZED",
								message: "Invalid token subject",
							},
						});
						ws.close(1008, "Unauthorized");
						return;
					}

					const isMember = await validateWorkspaceMembership(routeWorkspaceId, userId);
					if (!isMember) {
						sendJson(ws, {
							type: "ERROR",
							payload: {
								code: "FORBIDDEN",
								message: "User is not a member of this workspace",
							},
						});
						ws.close(1008, "Forbidden");
						return;
					}

					ws.userId = userId;
					ws.authenticated = true;
					if (ws.authTimeout) {
						clearTimeout(ws.authTimeout);
						ws.authTimeout = undefined;
					}

					joinWorkspace(ws, routeWorkspaceId);
					sendJson(ws, {
						type: "CONNECTED",
						payload: {
							workspaceId: routeWorkspaceId,
							userId,
						},
					});
				} catch (error) {
					console.error("WebSocket auth failed", error);
					sendJson(ws, {
						type: "ERROR",
						payload: {
							code: "UNAUTHORIZED",
							message: "Token verification failed",
						},
					});
					ws.close(1008, "Unauthorized");
				}

				return;
			}

			if (data.type === "JOIN_WORKSPACE") {
				const nextWorkspaceId = data.payload?.workspaceId?.trim();
				if (!nextWorkspaceId) {
					sendJson(ws, {
						type: "ERROR",
						payload: {
							code: "INVALID_WORKSPACE",
							message: "workspaceId is required",
						},
					});
					return;
				}

				if (nextWorkspaceId !== routeWorkspaceId) {
					sendJson(ws, {
						type: "ERROR",
						payload: {
							code: "ROUTE_MISMATCH",
							message: "Reconnect using /ws/workspaces/:workspaceId for another workspace",
						},
					});
					return;
				}

				joinWorkspace(ws, nextWorkspaceId);
				sendJson(ws, { type: "JOINED", payload: { workspaceId: nextWorkspaceId } });
				return;
			}

			sendJson(ws, {
				type: "ERROR",
				payload: {
					code: "UNKNOWN_EVENT",
					message: "Unsupported message type",
				},
			});
		});

		ws.on("close", () => {
			if (ws.authTimeout) {
				clearTimeout(ws.authTimeout);
				ws.authTimeout = undefined;
			}
			leaveWorkspace(ws);
		});
	});

	server.on("upgrade", async (req, socket, head) => {
		let url: URL;
		try {
			url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
		} catch {
			rejectUpgrade(socket, 400, "Bad Request");
			return;
		}

		const workspaceMatch = url.pathname.match(WORKSPACE_PATH_RE);
		if (!workspaceMatch?.[1]) {
			rejectUpgrade(socket, 404, "Not Found");
			return;
		}

		const workspaceId = decodeURIComponent(workspaceMatch[1]);

		wss.handleUpgrade(req, socket, head, (upgradedSocket) => {
			const ws = upgradedSocket as WorkspaceSocket;
			ws.workspaceRouteId = workspaceId;
			wss.emit("connection", ws, req);
		});
	});

	return wss;
}
