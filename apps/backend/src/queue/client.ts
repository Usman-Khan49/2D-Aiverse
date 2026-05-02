import * as celery from "celery-node";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379/0";

const client = celery.createClient(
	redisUrl,
	redisUrl,
	"ai_jobs"
);

const task = client.createTask("process_meeting_pipeline");

export async function pushJob(type: string, data: any) {
	if (type === "PROCESS_MEETING") {
		try {
			console.log(`[Queue] Dispatching Celery task for session: ${data.sessionId}`);
			await task.applyAsync([data]);
			console.log(`[Queue] Successfully pushed Celery job.`);
		} catch (err) {
			console.error("[Queue] Failed to push Celery job:", err);
		}
	} else {
		console.warn(`[Queue] Unknown job type for Celery: ${type}`);
	}
}
