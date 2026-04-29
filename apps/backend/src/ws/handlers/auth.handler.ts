import { verifyToken } from "@clerk/express";
import { WorkspaceSocket, WsMessage } from "../core/types.js";
import { sendJson, validateWorkspaceMembership } from "../core/utils.js";
import { joinWorkspace, getRoom } from "../core/room-manager.js";
import { sendCurrentPlayers, sendGroupCallState } from "./world.handler.js";

export async function handleAuth(ws: WorkspaceSocket, data: WsMessage, routeWorkspaceId: string) {
  if (data.type !== "AUTH") {
    sendJson(ws, {
      type: "ERROR",
      payload: { code: "UNAUTHORIZED", message: "Send AUTH message first" },
    });
    return;
  }

  const token = data.payload?.token?.trim();
  if (!token) {
    sendJson(ws, {
      type: "ERROR",
      payload: { code: "TOKEN_REQUIRED", message: "AUTH requires token" },
    });
    ws.close(1008, "Unauthorized");
    return;
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    sendJson(ws, {
      type: "ERROR",
      payload: { code: "SERVER_MISCONFIGURED", message: "CLERK_SECRET_KEY is missing" },
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
        payload: { code: "UNAUTHORIZED", message: "Invalid token subject" },
      });
      ws.close(1008, "Unauthorized");
      return;
    }

    const isMember = await validateWorkspaceMembership(routeWorkspaceId, userId);
    if (!isMember) {
      sendJson(ws, {
        type: "ERROR",
        payload: { code: "FORBIDDEN", message: "User is not a member of this workspace" },
      });
      ws.close(1008, "Forbidden");
      return;
    }

    ws.userId = userId + "_" + Math.random().toString(36).substring(2, 9);
    ws.authenticated = true;

    if (ws.authTimeout) {
      clearTimeout(ws.authTimeout);
      ws.authTimeout = undefined;
    }

    ws.x = 400;
    ws.y = 300;
    ws.anim = "turn";

    joinWorkspace(ws, routeWorkspaceId);
    sendJson(ws, {
      type: "CONNECTED",
      payload: { workspaceId: routeWorkspaceId, userId: ws.userId },
    });

    const room = getRoom(routeWorkspaceId);
    if (room) {
      sendCurrentPlayers(ws, routeWorkspaceId);
      sendGroupCallState(ws, routeWorkspaceId);

      for (const client of room) {
        if (client !== ws) {
          sendJson(client, {
            type: "NEW_PLAYER",
            payload: {
              userId: ws.userId,
              x: ws.x,
              y: ws.y,
              anim: ws.anim,
            },
          });
        }
      }
    }
  } catch (error) {
    console.error("WebSocket auth failed", error);
    sendJson(ws, {
      type: "ERROR",
      payload: { code: "UNAUTHORIZED", message: "Token verification failed" },
    });
    ws.close(1008, "Unauthorized");
  }
}
