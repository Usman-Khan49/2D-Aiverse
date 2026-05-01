import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "../../db/client.js";
import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { Prisma } from "@prisma/client";

const chatRoute = Router();

chatRoute.post("/:workspaceId/query", async (req, res) => {
    const { workspaceId } = req.params;
    const { userId } = getAuth(req);
    const { question, scope, sessionId } = req.body;

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!question) return res.status(400).json({ error: "Question is required" });

    try {
        // 1. Generate embedding for the question
        const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
        const result = await model.embedContent({
            content: { role: "user", parts: [{ text: question }] },
            taskType: TaskType.RETRIEVAL_QUERY,
            outputDimensionality: 768,
        } as any);
        const questionVector = `[${result.embedding.values.join(",")}]`;

        // 2. Search for similar passages in pgvector
        const passages: any[] = await db.$queryRaw`
            SELECT 
                content,
                "sourceType",
                "sourceId",
                "sessionId",
                "wordOffset",
                1 - (vector <=> ${questionVector}::vector) AS similarity
            FROM "Embedding"
            WHERE "workspaceId" = ${workspaceId}
            ${sessionId && scope === 'session' ? Prisma.sql`AND "sessionId" = ${sessionId}` : Prisma.empty}
            ORDER BY vector <=> ${questionVector}::vector
            LIMIT 5
        `;

        if (passages.length === 0) {
            return res.json({
                answer: "I couldn't find any relevant information in your meeting history to answer that question.",
                sources: []
            });
        }

        // 3. Construct the RAG prompt for Gemini
        const context = passages
            .map((p, i) => `[Source ${i+1}]: ${p.content}`)
            .join("\n\n");

        const chatModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const prompt = `
            You are "RoomMind", an AI meeting assistant. 
            Below is some relevant context retrieved from the user's meeting history (transcripts and summaries).
            Use ONLY the provided context to answer the user's question. 
            If the answer isn't in the context, say you don't know based on the recorded history.
            
            Keep your answer concise, professional, and grounded in the facts provided.
            
            CONTEXT:
            ${context}
            
            USER QUESTION:
            "${question}"
            
            ANSWER:
        `;

        const chatResult = await chatModel.generateContent(prompt);
        const answer = chatResult.response.text();

        // 4. Return answer + source metadata for the UI
        return res.json({
            answer,
            sources: passages.map(p => ({
                sessionId: p.sessionId,
                sourceType: p.sourceType,
                similarity: Math.round(p.similarity * 100) / 100,
                wordOffset: p.wordOffset,
                preview: p.content.slice(0, 150) + "..."
            }))
        });

    } catch (error) {
        console.error("[ChatRoute] Error in RAG query:", error);
        res.status(500).json({ error: "Failed to process AI query" });
    }
});

export default chatRoute;
