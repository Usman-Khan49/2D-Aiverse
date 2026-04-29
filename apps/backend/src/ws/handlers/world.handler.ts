import { WorkspaceSocket, WsMessage } from "../core/types.js";
import { sendJson } from "../core/utils.js";
import { getRoom, joinWorkspace, groupCalls } from "../core/room-manager.js";

export function handleJoinWorkspace(ws: WorkspaceSocket, data: WsMessage, routeWorkspaceId: string) {
  const nextWorkspaceId = data.payload?.workspaceId?.trim();
  if (!nextWorkspaceId) {
    sendJson(ws, {
      type: "ERROR",
      payload: { code: "INVALID_WORKSPACE", message: "workspaceId is required" },
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

export function handlePlayerMovement(ws: WorkspaceSocket, data: WsMessage, routeWorkspaceId: string) {
  const { x, y, anim } = data.payload || {};
  if (x === undefined || y === undefined) return;

  ws.x = x;
  ws.y = y;
  ws.anim = anim || "turn";

  const room = getRoom(routeWorkspaceId);
  if (!room) return;

  const payload = {
    type: "PLAYER_MOVED",
    payload: {
      userId: ws.userId,
      x: ws.x,
      y: ws.y,
      anim: ws.anim,
    },
  };

  for (const client of room) {
    if (client !== ws) {
      sendJson(client, payload);
    }
  }
}

export function sendCurrentPlayers(ws: WorkspaceSocket, routeWorkspaceId: string) {
  const room = getRoom(routeWorkspaceId);
  if (!room) return;

  const currentPlayers: any[] = [];
  for (const client of room) {
    if (client.userId && client.userId !== ws.userId) {
      currentPlayers.push({
        userId: client.userId,
        x: client.x,
        y: client.y,
        anim: client.anim,
      });
    }
  }
  sendJson(ws, {
    type: "CURRENT_PLAYERS",
    payload: { players: currentPlayers },
  });
}

export function sendGroupCallState(ws: WorkspaceSocket, routeWorkspaceId: string) {
  const call = groupCalls.get(routeWorkspaceId);
  if (call) {
    sendJson(ws, {
      type: "GROUP_CALL_STATE",
      payload: {
        active: true,
        starterId: call.starterId,
        participants: Array.from(call.participants)
      }
    });
  } else {
    sendJson(ws, {
      type: "GROUP_CALL_STATE",
      payload: { active: false }
    });
  }
}
