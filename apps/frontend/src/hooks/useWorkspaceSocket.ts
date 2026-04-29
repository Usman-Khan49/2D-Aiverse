import { useEffect, useRef } from "react";
import { useWorkspaceStore } from "../store/useWorkspaceStore";

const WS_BASE = import.meta.env.VITE_WS_BASE_URL?.replace(/\/$/, "") ?? "ws://localhost:4000";

export const useWorkspaceSocket = (workspaceId: string, getToken: () => Promise<string | null>) => {
  const { setConnectionStatus, setActiveSocket, addMessage } = useWorkspaceStore();
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let closedByUnmount = false;

    const connect = async () => {
      setConnectionStatus("connecting");
      const wsUrl = `${WS_BASE}/ws/workspaces/${encodeURIComponent(workspaceId)}`;
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = async () => {
        console.log("Connected to WebSocket");
        try {
          const token = await getToken();
          if (!token) {
            console.error("Missing Clerk token for WebSocket auth");
            socket.close(1008, "Missing auth token");
            return;
          }
          socket.send(JSON.stringify({ type: "AUTH", payload: { token } }));
        } catch (authError) {
          console.error("Failed to authenticate WebSocket", authError);
          socket.close(1008, "Auth failed");
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "CONNECTED") {
            setConnectionStatus("connected");
            setActiveSocket(socket);
          }
          if (data.type === "CHAT_MESSAGE") {
            const text = data.payload?.message;
            if (text) addMessage(text);
            return;
          }
          // Dispatch to Phaser
          window.dispatchEvent(new CustomEvent("ws-message", { detail: data }));
        } catch (err) {
          console.error("Failed to parse WS message", err);
        }
      };

      socket.onclose = () => {
        if (!closedByUnmount) {
          setConnectionStatus("disconnected");
          setActiveSocket(null);
        }
      };
    };

    connect();

    return () => {
      closedByUnmount = true;
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [workspaceId, getToken, setConnectionStatus, setActiveSocket, addMessage]);

  const sendMessage = (msg: string) => {
    if (!msg.trim() || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({ type: "CHAT_MESSAGE", payload: { message: msg.trim() } }));
  };

  return { sendMessage };
};
