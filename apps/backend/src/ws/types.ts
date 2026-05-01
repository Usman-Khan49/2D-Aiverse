import { WebSocket } from "ws";

export type WorkspaceSocket = WebSocket & {
	workspaceRouteId?: string;
	workspaceId?: string;
	userId?: string;
	authenticated?: boolean;
	authTimeout?: NodeJS.Timeout;
	x?: number;
	y?: number;
	anim?: string;
	audioZone?: string;
	inGroupCall?: boolean;
};

export type WsMessage = {
	type?: string;
	requestId?: string;
	payload?: {
		token?: string;
		workspaceId?: string;
		message?: string;
		ts?: number;
		x?: number;
		y?: number;
		anim?: string;
		userId?: string;
		targetUserId?: string;
		signal?: any;
		chunk?: string;
		mimeType?: string;
	};
};

