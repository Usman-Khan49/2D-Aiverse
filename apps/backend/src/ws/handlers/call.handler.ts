import { WorkspaceSocket, WsMessage } from "../core/types.js";
import { sendJson } from "../core/utils.js";
import { getRoom, groupCalls, broadcastToRoom } from "../core/room-manager.js";

export function handleWebRtcSignal(ws: WorkspaceSocket, data: WsMessage, routeWorkspaceId: string) {
  const { targetUserId, signal } = data.payload || {};
  if (!targetUserId || !signal) return;

  const room = getRoom(routeWorkspaceId);
  if (!room) return;

  const targetClient = Array.from(room).find(c => (c as WorkspaceSocket).userId === targetUserId);
  if (targetClient) {
    sendJson(targetClient as WorkspaceSocket, {
      type: "WEBRTC_SIGNAL",
      payload: {
        userId: ws.userId,
        signal: signal
      }
    });
  }
}

export function handleJoinAudioZone(ws: WorkspaceSocket, data: WsMessage, routeWorkspaceId: string) {
  const zoneId = (data.payload as any)?.zoneId;
  if (!zoneId) return;

  ws.audioZone = zoneId;
  const room = getRoom(routeWorkspaceId);
  if (!room) return;

  const playersInZone: string[] = [];
  for (const client of room) {
    if (client !== ws && client.audioZone === zoneId && client.userId) {
      playersInZone.push(client.userId);
      sendJson(client, {
        type: "USER_JOINED_AUDIO_ZONE",
        payload: { userId: ws.userId, zoneId }
      });
    }
  }

  sendJson(ws, {
    type: "AUDIO_ZONE_PLAYERS",
    payload: { zoneId, players: playersInZone }
  });
}

export function handleLeaveAudioZone(ws: WorkspaceSocket, routeWorkspaceId: string) {
  const oldZone = ws.audioZone;
  if (!oldZone) return;

  ws.audioZone = undefined;
  const room = getRoom(routeWorkspaceId);
  if (!room) return;

  for (const client of room) {
    if (client !== ws && client.audioZone === oldZone && client.userId) {
      sendJson(client, {
        type: "USER_LEFT_AUDIO_ZONE",
        payload: { userId: ws.userId, zoneId: oldZone }
      });
    }
  }
}

export function handleStartGroupCall(ws: WorkspaceSocket, routeWorkspaceId: string) {
  if (!ws.userId) return;
  if (groupCalls.has(routeWorkspaceId)) {
    sendJson(ws, { type: "ERROR", payload: { message: "Group call already active" } });
    return;
  }

  ws.inGroupCall = true;
  const participants = new Set<string>();
  participants.add(ws.userId);
  groupCalls.set(routeWorkspaceId, { starterId: ws.userId, participants });

  broadcastToRoom(routeWorkspaceId, "GROUP_CALL_STARTED", {
    starterId: ws.userId,
    participants: Array.from(participants)
  });
}

export function handleJoinGroupCall(ws: WorkspaceSocket, routeWorkspaceId: string) {
  if (!ws.userId) return;
  const call = groupCalls.get(routeWorkspaceId);
  if (!call) {
    sendJson(ws, { type: "ERROR", payload: { message: "No active group call" } });
    return;
  }

  ws.inGroupCall = true;
  broadcastToRoom(routeWorkspaceId, "USER_JOINED_GROUP_CALL", { userId: ws.userId });
  call.participants.add(ws.userId);

  sendJson(ws, {
    type: "GROUP_CALL_JOINED_SUCCESS",
    payload: { participants: Array.from(call.participants) }
  });
}

export function handleCallNegotiation(ws: WorkspaceSocket, data: WsMessage, routeWorkspaceId: string) {
  const { targetUserId } = data.payload || {};
  if (!targetUserId) return;

  const room = getRoom(routeWorkspaceId);
  if (!room) return;

  const targetClient = Array.from(room).find(c => (c as WorkspaceSocket).userId === targetUserId);
  if (targetClient) {
    sendJson(targetClient as WorkspaceSocket, {
      type: data.type as string,
      payload: { userId: ws.userId }
    });
  }
}
