import { Redis } from "ioredis";
import { broadcastToRoom } from "../ws/room-manager.js";

const redisUrl = process.env.REDIS_URL;
const CHANNEL_NAME = "summary_notifications";

// In-memory mapping of sessionId to workspaceId for routing notifications
// This helps us know which room to broadcast to when a summary is ready
const sessionToWorkspace = new Map<string, string>();

export function registerSession(sessionId: string, workspaceId: string) {
    sessionToWorkspace.set(sessionId, workspaceId);
    // Cleanup after 1 hour to prevent memory leaks
    setTimeout(() => sessionToWorkspace.delete(sessionId), 3600000);
}

export function startNotificationListener() {
    if (!redisUrl) return;

    const subscriber = new Redis(redisUrl);
    
    subscriber.subscribe(CHANNEL_NAME, (err) => {
        if (err) {
            console.error("[NotificationListener] Failed to subscribe:", err);
            return;
        }
        console.log(`[NotificationListener] Subscribed to ${CHANNEL_NAME}`);
    });

    subscriber.on("message", (channel, message) => {
        if (channel === CHANNEL_NAME) {
            try {
                const data = JSON.parse(message);
                if (data.type === "SUMMARY_READY") {
                    const { sessionId } = data;
                    const workspaceId = sessionToWorkspace.get(sessionId);
                    
                    console.log(`[NotificationListener] Summary ready for session ${sessionId}`);
                    
                    if (workspaceId) {
                        broadcastToRoom(workspaceId, "SUMMARY_READY", { sessionId });
                    } else {
                        // Fallback: broadcast to everyone if workspaceId is unknown
                        // This is rare but ensures the user gets the message
                        console.warn(`[NotificationListener] Workspace ID unknown for session ${sessionId}, skipping targeted broadcast.`);
                    }
                }
            } catch (err) {
                console.error("[NotificationListener] Error parsing message:", err);
            }
        }
    });
}
