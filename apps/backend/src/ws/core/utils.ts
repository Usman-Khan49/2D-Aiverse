import { WebSocket } from "ws";
import type { Duplex } from "node:stream";
import { db } from "../../db/client.js";

export const sendJson = (ws: WebSocket, data: unknown) => {
	if (ws.readyState === WebSocket.OPEN) {
		ws.send(JSON.stringify(data));
	}
};

export const rejectUpgrade = (socket: Duplex, statusCode: number, message: string) => {
	if (!socket.destroyed && socket.writable) {
		socket.write(
			`HTTP/1.1 ${statusCode} ${message}\r\nContent-Type: text/plain\r\nConnection: close\r\n\r\n${message}`,
		);
	}
	socket.destroy();
};

export const validateWorkspaceMembership = async (workspaceId: string, userId: string) => {
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
