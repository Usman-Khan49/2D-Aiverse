import express, { type Express } from "express";
import cors from "cors";
import {route as httproute} from "./routes/index.js"
import { webhooksRouter } from "./routes/webhook.js";
import { clerkMiddleware } from "@clerk/express";
export function createHttpApp(): Express {
	const app = express();
	const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
	const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY;
	const clerkSecretKey = process.env.CLERK_SECRET_KEY;

	if (!clerkPublishableKey) {
		throw new Error("CLERK_PUBLISHABLE_KEY is missing in apps/backend/.env");
	}

	if (!clerkSecretKey) {
		throw new Error("CLERK_SECRET_KEY is missing in apps/backend/.env");
	}

	const corsOptions = {
		origin: frontendOrigin,
		credentials: true,
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
	};

	app.disable("x-powered-by");
	app.use(cors(corsOptions));
	app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhooksRouter);
	app.use(express.json());
	app.use(
		clerkMiddleware({
			publishableKey: clerkPublishableKey,
			secretKey: clerkSecretKey,
		}),
	); // Clerk Middleware For Authentication
	app.use('/api/v1', httproute);

	return app;
}
