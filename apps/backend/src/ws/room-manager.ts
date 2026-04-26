import { WorkspaceSocket } from "./types.js";

// Workspace rooms only exist while at least one connection is active.
const rooms = new Map<string, Set<WorkspaceSocket>>();

export const leaveWorkspace = (ws: WorkspaceSocket) => {
	if (!ws.workspaceId) {
		return;
	}

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
