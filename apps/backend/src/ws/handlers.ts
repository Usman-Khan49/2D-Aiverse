import { WebSocket } from "ws";
import { verifyToken } from "@clerk/express";
import { WorkspaceSocket, WsMessage } from "./types.js";
import { sendJson, validateWorkspaceMembership } from "./utils.js";
import { joinWorkspace, getRoom } from "./room-manager.js";

export async function handleMessage(ws: WorkspaceSocket, raw: unknown, routeWorkspaceId: string) {
	let data: WsMessage;
	try {
		const serialized =
			typeof raw === "string"
				? raw
				: Buffer.isBuffer(raw)
					? raw.toString("utf8")
					: (raw as any).toString();
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
		await handleAuth(ws, data, routeWorkspaceId);
		return;
	}

	if (data.type === "JOIN_WORKSPACE") {
		handleJoinWorkspace(ws, data, routeWorkspaceId);
		return;
	}
	if (data.type === "CHAT_MESSAGE") {
		handleChatMessage(ws, data, routeWorkspaceId);
		return;
	}
	sendJson(ws, {
		type: "ERROR",
		payload: {
			code: "UNKNOWN_EVENT",
			message: "Unsupported message type",
		},
	});
}

async function handleAuth(ws: WorkspaceSocket, data: WsMessage, routeWorkspaceId: string) {
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
}

function handleChatMessage(ws: WorkspaceSocket, data: WsMessage, routeWorkspaceId: string) {
	const message = data.payload?.message;
	if (!message) {
		sendJson(ws, {
			type: "ERROR",
			payload: {
				code: "INVALID_MESSAGE",
				message: "Message is required",
			},
		});
		return;
	}

	const room = getRoom(routeWorkspaceId);
	if (!room) return;

	const payload = {
		type: "CHAT_MESSAGE",
		payload: {
			userId: ws.userId,
			message,
			ts: Date.now(),
		},
	};

	for (const client of room) {
		sendJson(client, payload);
	}
}


function handleJoinWorkspace(ws: WorkspaceSocket, data: WsMessage, routeWorkspaceId: string) {
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
}
