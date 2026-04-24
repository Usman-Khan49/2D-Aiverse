import { WebSocket } from "ws";

export type WorkspaceSocket = WebSocket & {
	workspaceRouteId?: string;
	workspaceId?: string;
	userId?: string;
	authenticated?: boolean;
	authTimeout?: NodeJS.Timeout;
};

export type WsMessage = {
	type?: string;
	requestId?: string;
	payload?: {
		token?: string;
		workspaceId?: string;
		message?: string;
		ts?: number;
	};
};
