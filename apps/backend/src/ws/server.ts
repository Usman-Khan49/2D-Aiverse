import { type Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { WorkspaceSocket } from "./core/types.js";
import { sendJson, rejectUpgrade } from "./core/utils.js";
import { leaveWorkspace } from "./core/room-manager.js";
import { handleMessage } from "./handlers.js";

const WORKSPACE_PATH_RE = /^\/ws\/workspaces\/([^/]+)$/;

export function setupWebSocket(server: Server) {
	const wss = new WebSocketServer({ noServer: true });

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

		ws.on("message", (raw) => handleMessage(ws, raw, routeWorkspaceId));

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
