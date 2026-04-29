import { WorkspaceSocket, WsMessage } from "./core/types.js";
import { sendJson } from "./core/utils.js";
import { leaveGroupCall } from "./core/room-manager.js";
import { handleAuth } from "./handlers/auth.handler.js";
import { handleJoinWorkspace, handlePlayerMovement, sendCurrentPlayers } from "./handlers/world.handler.js";
import { handleChatMessage } from "./handlers/chat.handler.js";
import { 
  handleWebRtcSignal, 
  handleJoinAudioZone, 
  handleLeaveAudioZone, 
  handleStartGroupCall, 
  handleJoinGroupCall, 
  handleCallNegotiation 
} from "./handlers/call.handler.js";

export async function handleMessage(ws: WorkspaceSocket, raw: unknown, routeWorkspaceId: string) {
  let data: WsMessage;
  try {
    const serialized = typeof raw === "string" ? raw : (raw as any).toString();
    data = JSON.parse(serialized) as WsMessage;
  } catch {
    sendJson(ws, { type: "ERROR", payload: { code: "BAD_MESSAGE", message: "Invalid JSON" } });
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

  switch (data.type) {
    case "JOIN_WORKSPACE":
      handleJoinWorkspace(ws, data, routeWorkspaceId);
      break;
    case "CHAT_MESSAGE":
      handleChatMessage(ws, data, routeWorkspaceId);
      break;
    case "PLAYER_MOVEMENT":
      handlePlayerMovement(ws, data, routeWorkspaceId);
      break;
    case "WEBRTC_SIGNAL":
      handleWebRtcSignal(ws, data, routeWorkspaceId);
      break;
    case "GET_CURRENT_PLAYERS":
      sendCurrentPlayers(ws, routeWorkspaceId);
      break;
    case "JOIN_AUDIO_ZONE":
      handleJoinAudioZone(ws, data, routeWorkspaceId);
      break;
    case "LEAVE_AUDIO_ZONE":
      handleLeaveAudioZone(ws, routeWorkspaceId);
      break;
    case "START_GROUP_CALL":
      handleStartGroupCall(ws, routeWorkspaceId);
      break;
    case "JOIN_GROUP_CALL":
      handleJoinGroupCall(ws, routeWorkspaceId);
      break;
    case "LEAVE_GROUP_CALL":
      leaveGroupCall(ws);
      break;
    case "CALL_REQUEST":
    case "CALL_ACCEPTED":
    case "CALL_DECLINED":
    case "CALL_ENDED":
      handleCallNegotiation(ws, data, routeWorkspaceId);
      break;
    default:
      sendJson(ws, { type: "ERROR", payload: { code: "UNKNOWN_EVENT", message: "Unsupported type" } });
  }
}
