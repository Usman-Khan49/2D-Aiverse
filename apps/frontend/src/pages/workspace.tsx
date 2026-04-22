import { useEffect, useState } from "react";
const WS_BASE =
  import.meta.env.VITE_WS_BASE_URL?.replace(/\/$/, "") ??
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
  onBack 
}: { 
  workspace: Workspace, 
  displayName: string, 
  ownerName: string, 
  getToken: () => Promise<string | null>,
  onBack: () => void 
}) {
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [copied, setCopied] = useState(false);

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

  useEffect(() => {
    let socket: WebSocket | null = null;
    let closedByUnmount = false;

    const connect = async () => {
      setConnectionStatus("connecting");
      const wsUrl = `${WS_BASE}/ws/workspaces/${encodeURIComponent(workspace.id)}`;
      socket = new WebSocket(wsUrl);

      socket.onopen = async () => {
        console.log("Connected to WebSocket");

        try {
          const token = await getToken();
          if (!token) {
            console.error("Missing Clerk token for WebSocket auth");
            socket?.close(1008, "Missing auth token");
            return;
          }

          socket?.send(
            JSON.stringify({
              type: "AUTH",
              payload: { token },
            }),
          );
        } catch (authError) {
          console.error("Failed to authenticate WebSocket", authError);
          socket?.close(1008, "Auth failed");
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as {
            type?: string;
            payload?: { workspaceId?: string; message?: string };
          };

          if (data.type === "CONNECTED") {
            setConnectionStatus("connected");
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
        } catch (err) {
          console.error("Failed to parse WS message", err);
        }
      };

      socket.onclose = () => {
        console.log("WebSocket disconnected");
        if (!closedByUnmount) {
          setConnectionStatus("disconnected");
        }
      };

      socket.onerror = (event) => {
        console.error("WebSocket error", event);
      };
    };

    void connect();

    return () => {
      closedByUnmount = true;
      socket?.close();
    };
  }, [workspace.id, getToken]);

  return (
    <div className="workspace-room" style={{ textAlign: "left", padding: "16px", border: "1px solid #ccc", borderRadius: "8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <button onClick={onBack}>&larr; Back to Dashboard</button>
        <button onClick={handleShare} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {copied ? "Copied Link!" : "Share Link \u279a"}
        </button>
      </div>
      <h2>{workspace.name} (Room)</h2>
      
      <div style={{ marginBottom: "16px" }}>
        <strong>Status:</strong>{" "}
        <span style={{ 
          color: connectionStatus === "connected" ? "green" : 
                 connectionStatus === "connecting" ? "orange" : "red" 
        }}>
          {connectionStatus.toUpperCase()}
        </span>
      </div>

      <p><strong>Your Name:</strong> {displayName}</p>
      <p><strong>Workspace Owner:</strong> {ownerName || "Loading..."}</p>
      <p style={{ marginTop: "16px", fontStyle: "italic", fontSize: "0.9em" }}>
        When you entered this view, a WebSocket connection was established with the server for this specific workspace. Leaving the view closes the connection.
      </p>
    </div>
  );
}
