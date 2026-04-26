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
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [incomingCallUserId, setIncomingCallUserId] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<string | null>(null);




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
            // Don't return — let it fall through to dispatch ws-message to Phaser
            // so the scene can pick up myUserId
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

  useEffect(() => {
    const handlePlayerSelected = (e: any) => setSelectedPlayerId(e.detail.userId);
    const handleIncomingCall = (e: any) => setIncomingCallUserId(e.detail.userId);
    const handleCallStatus = (e: any) => setCallStatus(e.detail.status);

    window.addEventListener("player-selected", handlePlayerSelected);
    window.addEventListener("incoming-call", handleIncomingCall);
    window.addEventListener("call-status", handleCallStatus);
    
    return () => {
      window.removeEventListener("player-selected", handlePlayerSelected);
      window.removeEventListener("incoming-call", handleIncomingCall);
      window.removeEventListener("call-status", handleCallStatus);
    };

  }, []);

  const initiateCall = () => {
    if (selectedPlayerId) {
      setCallStatus("Dialing...");
      window.dispatchEvent(new CustomEvent("initiate-call", { detail: { userId: selectedPlayerId } }));
      setSelectedPlayerId(null);
    }
  };

  const acceptCall = () => {
    if (incomingCallUserId) {
      setCallStatus("Connecting...");
      window.dispatchEvent(new CustomEvent("accept-call", { detail: { userId: incomingCallUserId } }));
      setIncomingCallUserId(null);
    }
  };


  const declineCall = () => {
    if (incomingCallUserId) {
      window.dispatchEvent(new CustomEvent("decline-call", { detail: { userId: incomingCallUserId } }));
      setIncomingCallUserId(null);
    }
  };



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

        {/* Player Action Dialog - Appears on Right when a player is clicked */}
        {selectedPlayerId && (
          <div style={{
            position: "absolute",
            right: "20px",
            top: "100px",
            width: "250px",
            background: "white",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            pointerEvents: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "15px",
            animation: "slideIn 0.3s ease-out"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.1em" }}>Player Selected</h3>
              <button 
                onClick={() => setSelectedPlayerId(null)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2em" }}
              >
                &times;
              </button>
            </div>
            <p style={{ margin: 0, fontSize: "0.9em", color: "#666" }}>
              ID: {selectedPlayerId.substring(0, 15)}...
            </p>
            <button
              onClick={initiateCall}
              style={{
                padding: "12px",
                background: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
            >
              <span style={{ fontSize: "1.2em" }}>📞</span> Call Player
            </button>
          </div>
        )}

        {/* Call Status Indicator */}
        {callStatus && (
          <div style={{
            position: "absolute",
            left: "50%",
            top: "10px",
            transform: "translateX(-50%)",
            background: callStatus === "Connected!" ? "#10b981" : "#f59e0b",
            color: "white",
            padding: "8px 16px",
            borderRadius: "20px",
            fontWeight: "bold",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            zIndex: 100,
            animation: "fadeIn 0.3s ease-out"
          }}>
            {callStatus}
          </div>
        )}

        {/* Incoming Call Dialog - Appears on Top Center */}

        {incomingCallUserId && (
          <div style={{
            position: "absolute",
            left: "50%",
            top: "50px",
            transform: "translateX(-50%)",
            width: "300px",
            background: "white",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "0 10px 35px rgba(0,0,0,0.3)",
            pointerEvents: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "15px",
            animation: "slideDown 0.4s ease-out",
            zIndex: 100
          }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.2em", color: "#1f2937" }}>Incoming Call 📞</h3>
              <p style={{ margin: "5px 0", fontSize: "0.9em", color: "#666" }}>
                Player: {incomingCallUserId.substring(0, 15)}...
              </p>
            </div>
            
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "10px" }}>
              <button
                onClick={acceptCall}
                style={{
                  padding: "10px 15px",
                  background: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  flex: 1
                }}
              >
                Accept
              </button>
              <button
                onClick={declineCall}
                style={{
                  padding: "10px 15px",
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  flex: 1
                }}
              >
                Decline
              </button>
            </div>
          </div>
        )}

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
