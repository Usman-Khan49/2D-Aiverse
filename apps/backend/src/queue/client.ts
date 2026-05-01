import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
	console.warn("REDIS_URL not found in .env, Redis queue will not be available.");
}

export const redis = redisUrl ? new Redis(redisUrl) : null;

export const QUEUE_NAME = "ai_jobs";

export async function pushJob(type: string, data: any) {
	if (!redis) {
		console.warn("Redis not initialized, skipping job push.");
		return;
	}

	const job = JSON.stringify({
		type,
		data,
		timestamp: Date.now(),
	});

	try {
		await redis.lpush(QUEUE_NAME, job);
		console.log(`[Queue] Pushed job: ${type}`);
	} catch (err) {
		console.error("[Queue] Failed to push job:", err);
	}
}
