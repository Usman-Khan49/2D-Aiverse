import { Router } from "express";
import { getAuth } from "@clerk/express";

export const turnRoute = Router();

turnRoute.get("/credentials", async (req, res) => {
    const { userId } = getAuth(req);
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const apiKey = process.env.METERED_TURN_API_KEY;
    const baseUrl = process.env.METERED_TURN_CREDENTIALS_URL;

    if (!apiKey || !baseUrl) {
        return res.status(500).json({ error: "TURN credentials not configured" });
    }

    try {
        const url = `${baseUrl}?apiKey=${encodeURIComponent(apiKey)}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            return res.status(502).json({ error: "TURN provider error" });
        }

        const data = await response.json() as any;
        const iceServers = data.iceServers ?? data;
        return res.json({ iceServers });
    } catch (err) {
        console.error("TURN fetch error", err);
        return res.status(500).json({ error: "Failed to fetch TURN credentials" });
    }
});