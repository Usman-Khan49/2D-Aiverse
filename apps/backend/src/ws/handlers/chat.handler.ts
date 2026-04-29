import { WorkspaceSocket, WsMessage } from "../core/types.js";
import { sendJson } from "../core/utils.js";
import { getRoom } from "../core/room-manager.js";

export function handleChatMessage(ws: WorkspaceSocket, data: WsMessage, routeWorkspaceId: string) {
  const message = data.payload?.message;
  if (!message) {
    sendJson(ws, {
      type: "ERROR",
      payload: { code: "INVALID_MESSAGE", message: "Message is required" },
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
