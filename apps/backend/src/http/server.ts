import express, { type Express } from "express";
import {route as httproute} from "./routes/index.js"
import { webhooksRouter } from "./routes/webhook.js";
import { clerkMiddleware } from "@clerk/express";
export function createHttpApp(): Express {
	const app = express();

	app.disable("x-powered-by");
	app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhooksRouter);
	app.use(express.json());
    app.use(clerkMiddleware()) // Clerk Middleware For Authentication
	app.use('/api/v1', httproute);

	return app;
}
