import { WebSocket } from "ws";
import { verifyToken } from "@clerk/express";
import { WorkspaceSocket, WsMessage } from "./types.js";
import { sendJson, validateWorkspaceMembership } from "./utils.js";
import { joinWorkspace, getRoom, groupCalls, leaveGroupCall, broadcastToRoom } from "./room-manager.js";
import { db } from "../db/client.js";
import fs from "fs";
import path from "path";

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
	if (data.type === "PLAYER_MOVEMENT") {
		handlePlayerMovement(ws, data, routeWorkspaceId);
		return;
	}
	if (data.type === "WEBRTC_SIGNAL") {
		handleWebRtcSignal(ws, data, routeWorkspaceId);
		return;
	}
	if (data.type === "GET_CURRENT_PLAYERS") {
		sendCurrentPlayers(ws, routeWorkspaceId);
		return;
	}
	if (data.type === "JOIN_AUDIO_ZONE") {
		handleJoinAudioZone(ws, data, routeWorkspaceId);
		return;
	}
	if (data.type === "LEAVE_AUDIO_ZONE") {
		handleLeaveAudioZone(ws, routeWorkspaceId);
		return;
	}
	if (data.type === "START_GROUP_CALL") {
		handleStartGroupCall(ws, routeWorkspaceId);
		return;
	}
	if (data.type === "JOIN_GROUP_CALL") {
		handleJoinGroupCall(ws, routeWorkspaceId);
		return;
	}
	if (data.type === "LEAVE_GROUP_CALL") {
		leaveGroupCall(ws);
		return;
	}
	if (
		data.type === "CALL_REQUEST" ||
		data.type === "CALL_ACCEPTED" ||
		data.type === "CALL_DECLINED" ||
		data.type === "CALL_ENDED"
	) {
		handleCallNegotiation(ws, data, routeWorkspaceId);
		return;
	}
	if (data.type === "AUDIO_CHUNK") {
		handleAudioChunk(ws, data);
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

		// Append a random string so multiple tabs from the same account don't collide
		ws.userId = userId + "_" + Math.random().toString(36).substring(2, 9);
		ws.authenticated = true;

		if (ws.authTimeout) {
			clearTimeout(ws.authTimeout);
			ws.authTimeout = undefined;
		}

		// Set default position
		ws.x = 400;
		ws.y = 300;
		ws.anim = "turn";

		joinWorkspace(ws, routeWorkspaceId);
		sendJson(ws, {
			type: "CONNECTED",
			payload: {
				workspaceId: routeWorkspaceId,
				userId: ws.userId,
			},
		});

		const room = getRoom(routeWorkspaceId);
		if (room) {
			sendCurrentPlayers(ws, routeWorkspaceId);
			sendGroupCallState(ws, routeWorkspaceId);

			// Broadcast to others that this player joined

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
			payload: {
				code: "UNAUTHORIZED",
				message: "Token verification failed",
			},
		});
		ws.close(1008, "Unauthorized");
	}
}

function handlePlayerMovement(ws: WorkspaceSocket, data: WsMessage, routeWorkspaceId: string) {
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

	// Broadcast to everyone else
	for (const client of room) {
		if (client !== ws) {
			sendJson(client, payload);
		}
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


function sendGroupCallState(ws: WorkspaceSocket, routeWorkspaceId: string) {
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
			payload: {
				active: false
			}
		});
	}
}

async function handleStartGroupCall(ws: WorkspaceSocket, routeWorkspaceId: string) {
	const userId = ws.userId;
	if (!userId) return;
	
	if (groupCalls.has(routeWorkspaceId)) {
		sendJson(ws, { type: "ERROR", payload: { message: "Group call already active" } });
		return;
	}

	// Create a session in the database
	const session = await db.session.create({
		data: {
			workspaceId: routeWorkspaceId,
			areaTag: "meeting", // Default to meeting for group calls
			// Clerk IDs look like user_2pQ... so we split by the LAST underscore to remove our random suffix
			startedById: userId.includes('_') ? userId.substring(0, userId.lastIndexOf('_')) : userId,
		}
	});

	ws.inGroupCall = true;
	const participants = new Set<string>();
	participants.add(userId);
	
	groupCalls.set(routeWorkspaceId, {
		sessionId: session.id,
		starterId: userId,
		participants
	});

	broadcastToRoom(routeWorkspaceId, "GROUP_CALL_STARTED", {
		sessionId: session.id,
		starterId: userId,
		participants: Array.from(participants)
	});
}

function handleAudioChunk(ws: WorkspaceSocket, data: WsMessage) {
	const workspaceId = ws.workspaceId;
	if (!workspaceId || !ws.inGroupCall) return;
	
	const call = groupCalls.get(workspaceId);
	if (!call) return;

	const { chunk } = data.payload || {};
	if (!chunk) return;

	const buffer = Buffer.from(chunk, 'base64');
	const filePath = path.join(process.cwd(), 'recordings', `${call.sessionId}.webm`);

	// Append to file asynchronously
	fs.appendFile(filePath, buffer, (err) => {
		if (err) {
			console.error(`Failed to save audio chunk for session ${call.sessionId}`, err);
		}
	});
}

function handleJoinGroupCall(ws: WorkspaceSocket, routeWorkspaceId: string) {
	if (!ws.userId) return;
	const call = groupCalls.get(routeWorkspaceId);
	if (!call) {
		sendJson(ws, { type: "ERROR", payload: { message: "No active group call" } });
		return;
	}

	ws.inGroupCall = true;
	
	// Notify EXISTING participants to expect a WebRTC offer from us
	// We wait until they get USER_JOINED_GROUP_CALL
	broadcastToRoom(routeWorkspaceId, "USER_JOINED_GROUP_CALL", { userId: ws.userId });
	
	call.participants.add(ws.userId);

	// Let the joiner know they are in and who to call
	sendJson(ws, {
		type: "GROUP_CALL_JOINED_SUCCESS",
		payload: {
			participants: Array.from(call.participants)
		}
	});
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

function handleJoinAudioZone(ws: WorkspaceSocket, data: WsMessage, routeWorkspaceId: string) {
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
				payload: {
					userId: ws.userId,
					zoneId
				}
			});
		}
	}

	sendJson(ws, {
		type: "AUDIO_ZONE_PLAYERS",
		payload: {
			zoneId,
			players: playersInZone
		}
	});
}

function handleLeaveAudioZone(ws: WorkspaceSocket, routeWorkspaceId: string) {
	const oldZone = ws.audioZone;
	if (!oldZone) return;

	ws.audioZone = undefined;
	const room = getRoom(routeWorkspaceId);
	if (!room) return;

	for (const client of room) {
		if (client !== ws && client.audioZone === oldZone && client.userId) {
			sendJson(client, {
				type: "USER_LEFT_AUDIO_ZONE",
				payload: {
					userId: ws.userId,
					zoneId: oldZone
				}
			});
		}
	}
}

function handleWebRtcSignal(ws: WorkspaceSocket, data: WsMessage, routeWorkspaceId: string) {
	const { targetUserId, signal } = data.payload || {};
	if (!targetUserId || !signal) return;

	const room = getRoom(routeWorkspaceId);
	if (!room) return;

	// Find the target user in the same room
	const targetClient = Array.from(room).find(c => (c as WorkspaceSocket).userId === targetUserId);

	if (targetClient) {
		sendJson(targetClient as WorkspaceSocket, {
			type: "WEBRTC_SIGNAL",
			payload: {
				userId: ws.userId, // Who sent the signal
				signal: signal
			}
		});
	}
}

function sendCurrentPlayers(ws: WorkspaceSocket, routeWorkspaceId: string) {
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
		payload: { players: currentPlayers } as any,
	});
}

function handleCallNegotiation(ws: WorkspaceSocket, data: WsMessage, routeWorkspaceId: string) {
	const { targetUserId } = data.payload || {};
	if (!targetUserId) return;

	const room = getRoom(routeWorkspaceId);
	if (!room) return;

	const targetClient = Array.from(room).find(c => (c as WorkspaceSocket).userId === targetUserId);

	if (targetClient) {
		sendJson(targetClient as WorkspaceSocket, {
			type: data.type as string,
			payload: {
				userId: ws.userId, // Who sent this
			}
		});
	}
}
