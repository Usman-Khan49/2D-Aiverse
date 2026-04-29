import { WorkspaceSocket } from "./types.js";

// Workspace rooms only exist while at least one connection is active.
const rooms = new Map<string, Set<WorkspaceSocket>>();

export interface GroupCall {
	starterId: string;
	participants: Set<string>;
}
export const groupCalls = new Map<string, GroupCall>();

export const broadcastToRoom = (workspaceId: string, type: string, payload: any, excludeWs?: WorkspaceSocket) => {
	const room = rooms.get(workspaceId);
	if (!room) return;
	const msg = JSON.stringify({ type, payload });
	for (const client of room) {
		if (client !== excludeWs && client.readyState === 1) { // 1 = OPEN
			client.send(msg);
		}
	}
};

export const leaveGroupCall = (ws: WorkspaceSocket) => {
	const workspaceId = ws.workspaceId;
	if (!workspaceId || !ws.userId) return;

	const call = groupCalls.get(workspaceId);
	if (!call) return;

	if (call.starterId === ws.userId) {
		// Starter left, end the call
		groupCalls.delete(workspaceId);
		broadcastToRoom(workspaceId, "GROUP_CALL_ENDED", { reason: "starter_left" });
		
		// Unset inGroupCall on all players
		const room = rooms.get(workspaceId);
		if (room) {
			for (const client of room) {
				client.inGroupCall = false;
			}
		}
	} else if (call.participants.has(ws.userId)) {
		// Participant left
		call.participants.delete(ws.userId);
		ws.inGroupCall = false;
		broadcastToRoom(workspaceId, "USER_LEFT_GROUP_CALL", { userId: ws.userId });
		
		if (call.participants.size === 0) {
			// No one left, end call
			groupCalls.delete(workspaceId);
			broadcastToRoom(workspaceId, "GROUP_CALL_ENDED", { reason: "empty" });
		}
	}
};

export const leaveWorkspace = (ws: WorkspaceSocket) => {
	if (!ws.workspaceId) {
		return;
	}

	leaveGroupCall(ws);

	const room = rooms.get(ws.workspaceId);
	if (!room) {
		ws.workspaceId = undefined;
		return;
	}

	// Broadcast PLAYER_LEFT to everyone else in the room
	if (ws.userId) {
		const payload = JSON.stringify({
			type: "PLAYER_LEFT",
			payload: { userId: ws.userId },
		});
		for (const client of room) {
			if (client !== ws && client.readyState === 1) { // 1 = OPEN
				client.send(payload);
			}
		}
	}

	room.delete(ws);
	const closedWorkspaceId = ws.workspaceId;
	ws.workspaceId = undefined;

	if (room.size === 0) {
		rooms.delete(closedWorkspaceId);
		console.log(`Workspace ${closedWorkspaceId} room closed (empty)`);
	}
};

export const joinWorkspace = (ws: WorkspaceSocket, workspaceId: string) => {
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

export const getRoom = (workspaceId: string) => rooms.get(workspaceId);
