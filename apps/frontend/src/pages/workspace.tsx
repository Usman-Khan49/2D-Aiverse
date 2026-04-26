import { useEffect, useState, useRef } from "react";
import { PhaserGame } from "../components/PhaserGame";

const WS_BASE = import.meta.env.VITE_WS_BASE_URL?.replace(/\/$/, "") ??
  "ws://localhost:4000";


type Workspace = {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  role?: string | null;
};

export function WorkspaceRoom({
  workspace,
  displayName,
  ownerName,
  getToken,
  onBack }: {
    workspace: Workspace,
    displayName: string,
    ownerName: string,
    getToken: () => Promise<string | null>,
    onBack: () => void
  }) {
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [copied, setCopied] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const [activeSocket, setActiveSocket] = useState<WebSocket | null>(null);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/workspaces/${workspace.slug || workspace.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const sendMessage = () => {
    const msg = inputMessage.trim();
    if (!msg || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;

    socketRef.current.send(
      JSON.stringify({
        type: "CHAT_MESSAGE",
        payload: { message: msg },
      }),
    );
    setInputMessage("");
  };

  useEffect(() => {
    let closedByUnmount = false;

    const connect = async () => {
      setConnectionStatus("connecting");
      const wsUrl = `${WS_BASE}/ws/workspaces/${encodeURIComponent(workspace.id)}`;
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

          socket.send(
            JSON.stringify({
              type: "AUTH",
              payload: { token },
            }),
          );
        } catch (authError) {
          console.error("Failed to authenticate WebSocket", authError);
          socket.close(1008, "Auth failed");
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as {
            type?: string;
            payload?: any;
          };

          if (data.type === "CONNECTED") {
            setConnectionStatus("connected");
            setActiveSocket(socket); // Set active socket for Phaser
            console.log(`Successfully connected to workspace room: ${data.payload?.workspaceId}`);
            return;
          }

          if (data.type === "JOINED") {
            console.log(`Joined room for workspace: ${data.payload?.workspaceId}`);
            return;
          }

          if (data.type === "ERROR") {
            console.error("WebSocket server error:", data.payload?.message ?? "Unknown error");
            return;
          }

          if (data.type === "CHAT_MESSAGE") {
            const text = data.payload?.message;
            if (text) {
              setMessages((prev) => [...prev, text]);
            }
            return;
          }

          // Dispatch all other messages (like CURRENT_PLAYERS, NEW_PLAYER, etc) to window for Phaser to pick up
          window.dispatchEvent(new CustomEvent("ws-message", { detail: data }));
          
        } catch (err) {
          console.error("Failed to parse WS message", err);
        }
      };

      socket.onclose = () => {
        console.log("WebSocket disconnected");
        if (!closedByUnmount) {
          setConnectionStatus("disconnected");
          setActiveSocket(null);
        }
      };

      socket.onerror = (event) => {
        console.error("WebSocket error", event);
      };
    };

    void connect();

    return () => {
      closedByUnmount = true;
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [workspace.id, getToken]);

  return (
    <div className="workspace-container" style={{ 
      position: "fixed", 
      top: 0, 
      left: 0, 
      width: "100vw", 
      height: "100vh",
      overflow: "hidden"
    }}>
      <PhaserGame socket={activeSocket} />
      
      <div className="workspace-ui" style={{ 
        position: "absolute", 
        top: 0, 
        left: 0, 
        width: "100%", 
        height: "100%", 
        zIndex: 1, 
        padding: "20px",
        pointerEvents: "none", // Allow clicks to pass through to Phaser by default
        display: "flex",
        flexDirection: "column",
        gap: "20px"
      }}>
        {/* Top Header UI */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          pointerEvents: "auto" // Re-enable clicks for UI elements
        }}>
          <button 
            onClick={onBack}
            style={{
              padding: "10px 20px",
              background: "rgba(255, 255, 255, 0.9)",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
            }}
          >
            &larr; Back to Dashboard
          </button>
          
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ 
              background: "rgba(255, 255, 255, 0.9)", 
              padding: "8px 16px", 
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <strong>Status:</strong>{" "}
              <span style={{
                color: connectionStatus === "connected" ? "#10b981" :
                  connectionStatus === "connecting" ? "#f59e0b" : "#ef4444",
                fontWeight: "bold"
              }}>
                {connectionStatus.toUpperCase()}
              </span>
            </div>
            
            <button 
              onClick={handleShare} 
              style={{ 
                padding: "8px 16px",
                background: "rgba(255, 255, 255, 0.9)",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex", 
                gap: "8px", 
                alignItems: "center",
                fontWeight: "600",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}
            >
              {copied ? "Copied Link!" : "Share Link \u279a"}
            </button>
          </div>
        </div>

        {/* Workspace Info Card */}
        <div style={{ 
          pointerEvents: "auto",
          background: "rgba(255, 255, 255, 0.85)", 
          padding: "20px", 
          borderRadius: "12px", 
          backdropFilter: "blur(4px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
          maxWidth: "400px"
        }}>
          <h2 style={{ margin: "0 0 10px 0", color: "#1f2937" }}>{workspace.name}</h2>
          <div style={{ fontSize: "0.9em", color: "#4b5563" }}>
            <p style={{ margin: "4px 0" }}><strong>User:</strong> {displayName}</p>
            <p style={{ margin: "4px 0" }}><strong>Owner:</strong> {ownerName || "Loading..."}</p>
          </div>
        </div>

        {/* Chat - Floating at bottom left */}
        <div style={{ 
          marginTop: "auto",
          pointerEvents: "auto",
          background: "rgba(255, 255, 255, 0.85)", 
          padding: "16px", 
          borderRadius: "12px", 
          backdropFilter: "blur(4px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
          width: "350px",
          display: "flex",
          flexDirection: "column",
          gap: "12px"
        }}>
          <h3 style={{ margin: 0, fontSize: "1.1em" }}>Chat</h3>
          <div className="messages" style={{ 
            height: "150px", 
            overflowY: "auto", 
            background: "rgba(0,0,0,0.03)", 
            padding: "10px",
            borderRadius: "8px",
            fontSize: "0.9em"
          }}>
            {messages.length === 0 && <p style={{ color: "#999" }}>No messages yet...</p>}
            {messages.map((msg, index) => (
              <div key={index} style={{ marginBottom: "4px" }}>
                <p style={{ margin: 0 }}>{msg}</p>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
              style={{ 
                flex: 1, 
                padding: "8px 12px", 
                borderRadius: "6px", 
                border: "1px solid #ddd",
                outline: "none"
              }}
            />
            <button 
              onClick={sendMessage} 
              disabled={connectionStatus !== "connected"}
              style={{
                padding: "8px 16px",
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "600",
                opacity: connectionStatus !== "connected" ? 0.5 : 1
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );

}
