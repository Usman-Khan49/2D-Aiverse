import { Router, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { db } from "../../db/client.js";

export const sessionRoute = Router();

// Middleware to ensure user is signed in
const requiredSignedIn = (req: Request, res: Response, next: any) => {
    const { userId } = getAuth(req);
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
};

sessionRoute.use(requiredSignedIn);

/**
 * GET /api/sessions/:sessionId/summary
 * Fetches the meeting summary and transcript segments for a given session.
 */
sessionRoute.get("/:sessionId/summary", async (req, res) => {
    const { sessionId } = req.params;
    const { userId } = getAuth(req);

    if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required" });
    }

    try {
        // 1. Fetch the summary
        const summary = await db.summary.findUnique({
            where: { sessionId },
        });

        if (!summary) {
            return res.status(404).json({ error: "Summary not found for this session" });
        }

        // 2. Fetch the transcript segments
        const transcript = await db.transcript.findMany({
            where: { sessionId },
            orderBy: { timestamp: "asc" },
        });

        // 3. Return combined data
        // Flatten the 'raw' AI data into the summary object for the frontend
        const formattedSummary = {
            ...summary,
            ...(typeof summary.raw === 'object' ? (summary.raw as any) : {})
        };

        return res.json({
            summary: formattedSummary,
            transcript,
        });
    } catch (error) {
        console.error("[SessionRoute] Error fetching summary:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
