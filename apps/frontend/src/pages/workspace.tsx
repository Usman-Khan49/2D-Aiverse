import { useEffect, useState, useRef } from "react";
import { PhaserGame } from "../components/PhaserGame";
import { MeetingSummaryModal } from "../components/MeetingSummaryModal";
import { KnowledgeLibraryModal } from "../components/KnowledgeLibraryModal";

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
  const [activeCallUserId, setActiveCallUserId] = useState<string | null>(null);
  const [zoneMessage, setZoneMessage] = useState<string | null>(null);
  const [zonePlayerCount, setZonePlayerCount] = useState<number>(0);
  
  // Group Call State
  const [isMeetingZone, setIsMeetingZone] = useState(false);
  const [groupCallActive, setGroupCallActive] = useState(false);
  const [groupCallParticipants, setGroupCallParticipants] = useState<string[]>([]);
  const [amInGroupCall, setAmInGroupCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  
  // Summary State
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);
  
  // Library State
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isNearLibrary, setIsNearLibrary] = useState(false);




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
          
          // Also dispatch a specific event for React components to listen to
          if (data.type) {
            window.dispatchEvent(new CustomEvent(data.type, { detail: data.payload }));
          }
          
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
    let cancelled = false;
  
    const loadTurn = async () => {
      const token = await getToken();
      const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:4000/api/v1";
      try {
        const response = await fetch(`${API_BASE}/turn/credentials`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          credentials: "include",
        });
        if (!response.ok) return;
  
        const { iceServers } = await response.json();
        if (!cancelled && iceServers) {
          console.log("Loaded TURN ICE servers from backend");
          window.dispatchEvent(
            new CustomEvent("webrtc-ice-servers", { detail: { iceServers } }),
          );
        }
      } catch(err) {
        console.error("Failed to load TURN servers", err);
      }
    };
  
    void loadTurn();
  
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  const fetchSummary = async (sessionId: string) => {
    const token = await getToken();
    const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:4000/api/v1";
    
    try {
      const response = await fetch(`${API_BASE}/sessions/${sessionId}/summary`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: "include",
      });
      
      if (!response.ok) throw new Error("Failed to fetch summary");
      
      const data = await response.json();
      setSummaryData(data);
      setIsSummaryModalOpen(true);
    } catch (err) {
      console.error("Error fetching summary:", err);
      setNotification("Failed to load meeting summary.");
      setTimeout(() => setNotification(null), 4000);
    }
  };

  useEffect(() => {
    const handlePlayerSelected = (e: Event) => {
      const event = e as CustomEvent<{ userId: string }>;
      setSelectedPlayerId(event.detail.userId);
    };
    const handleIncomingCall = (e: Event) => {
      const event = e as CustomEvent<{ userId: string }>;
      setIncomingCallUserId(event.detail.userId);
    };
    const handleCallStatus = (e: Event) => {
      const event = e as CustomEvent<{ status: string }>;
      const status = event.detail.status;
      setCallStatus(status);
      if (
        status === "Call Declined" ||
        status === "Call Ended" ||
        status === "Call Ended by Peer" ||
        status === "Connection Failed" ||
        status === "Network Blocked (ICE Failed)"
      ) {
        setActiveCallUserId(null);
      }
    };
    const handleCallEnded = (e: Event) => {
      const event = e as CustomEvent<{ userId?: string }>;
      const endedUserId = event.detail?.userId;
      setActiveCallUserId((current) => (endedUserId && current !== endedUserId ? current : null));
    };

    const handleZoneEntered = (e: Event) => {
      const event = e as CustomEvent<{ type: string | null }>;
      const zoneType = event.detail.type;
      
      setIsMeetingZone(zoneType === "meeting");

      if (zoneType) {
        setZoneMessage(`Zone: ${zoneType.charAt(0).toUpperCase() + zoneType.slice(1)}`);
      } else {
        setZoneMessage(null);
        setZonePlayerCount(0);
      }
    };

    const handleGroupCallState = (e: Event) => {
      const data = (e as CustomEvent).detail;
      setGroupCallActive(data.active);
      if (data.active) {
        setGroupCallParticipants(data.participants || []);
        setZonePlayerCount((data.participants || []).length);
      } else {
        setGroupCallParticipants([]);
        setAmInGroupCall(false);
        setZonePlayerCount(0);
      }
    };

    const handleGroupCallStarted = (e: Event) => {
      const data = (e as CustomEvent).detail;
      setGroupCallActive(true);
      setGroupCallParticipants(data.participants || []);
      setZonePlayerCount((data.participants || []).length);
      
      // Show notification to the room
      setNotification(`A group call has started in the Meeting zone!`);
      setTimeout(() => setNotification(null), 4000);
    };

    const handleGroupCallUserJoined = (e: Event) => {
      const data = (e as CustomEvent).detail;
      setGroupCallParticipants(prev => {
        const next = [...prev.filter(p => p !== data.userId), data.userId];
        setZonePlayerCount(next.length);
        return next;
      });
    };

    const handleGroupCallUserLeft = (e: Event) => {
      const data = (e as CustomEvent).detail;
      setGroupCallParticipants(prev => {
        const next = prev.filter(p => p !== data.userId);
        setZonePlayerCount(next.length);
        return next;
      });
    };

    const handleGroupCallEnded = () => {
      setGroupCallActive(false);
      setGroupCallParticipants([]);
      setAmInGroupCall(false);
      setZonePlayerCount(0);
      setNotification(`The group call has ended.`);
      setTimeout(() => setNotification(null), 4000);
    };

    const handleGroupCallParticipants = (e: Event) => {
      const data = (e as CustomEvent).detail;
      setGroupCallParticipants(data.players || []);
      setZonePlayerCount((data.players || []).length);
    };

    window.addEventListener("player-selected", handlePlayerSelected);
    window.addEventListener("incoming-call", handleIncomingCall);
    window.addEventListener("call-status", handleCallStatus);
    window.addEventListener("call-ended", handleCallEnded);
    window.addEventListener("zone-entered", handleZoneEntered);
    
    // Group Call events
    window.addEventListener("group-call-state", handleGroupCallState);
    window.addEventListener("group-call-started", handleGroupCallStarted);
    window.addEventListener("group-call-user-joined", handleGroupCallUserJoined);
    window.addEventListener("group-call-user-left", handleGroupCallUserLeft);
    window.addEventListener("group-call-ended", handleGroupCallEnded);
    window.addEventListener("group-call-participants", handleGroupCallParticipants);
    
    const handleSummaryReady = (e: Event) => {
      const data = (e as CustomEvent).detail;
      console.log("AI Summary is ready!", data.sessionId);
      setNotification("✨ AI Meeting Summary is ready!");
      fetchSummary(data.sessionId);
    };
    window.addEventListener("SUMMARY_READY", handleSummaryReady);
    
    const handleNearLibrary = (e: Event) => {
      setIsNearLibrary((e as CustomEvent).detail.near);
    };
    const handleOpenLibrary = () => {
      setIsLibraryOpen(true);
    };

    window.addEventListener("near-library", handleNearLibrary);
    window.addEventListener("open-library", handleOpenLibrary);
    
    return () => {
      window.removeEventListener("player-selected", handlePlayerSelected);
      window.removeEventListener("incoming-call", handleIncomingCall);
      window.removeEventListener("call-status", handleCallStatus);
      window.removeEventListener("call-ended", handleCallEnded);
      window.removeEventListener("zone-entered", handleZoneEntered);
      
      window.removeEventListener("group-call-state", handleGroupCallState);
      window.removeEventListener("group-call-started", handleGroupCallStarted);
      window.removeEventListener("group-call-user-joined", handleGroupCallUserJoined);
      window.removeEventListener("group-call-user-left", handleGroupCallUserLeft);
      window.removeEventListener("group-call-ended", handleGroupCallEnded);
      window.removeEventListener("group-call-participants", handleGroupCallParticipants);
      window.removeEventListener("SUMMARY_READY", handleSummaryReady);
      window.removeEventListener("near-library", handleNearLibrary);
      window.removeEventListener("open-library", handleOpenLibrary);
    };

  }, []);

  const initiateCall = () => {
    if (selectedPlayerId) {
      setCallStatus("Dialing...");
      setActiveCallUserId(selectedPlayerId);
      window.dispatchEvent(new CustomEvent("initiate-call", { detail: { userId: selectedPlayerId } }));
      setSelectedPlayerId(null);
    }
  };

  const acceptCall = () => {
    if (incomingCallUserId) {
      setCallStatus("Connecting...");
      setActiveCallUserId(incomingCallUserId);
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

  const endCall = () => {
    if (!activeCallUserId) return;
    window.dispatchEvent(new CustomEvent("end-call", { detail: { userId: activeCallUserId } }));
    setCallStatus("Call Ended");
    setActiveCallUserId(null);
  };

  const startGroupCall = () => {
    setAmInGroupCall(true);
    setGroupCallActive(true);
    window.dispatchEvent(new CustomEvent("start-group-call"));
  };

  const joinGroupCall = () => {
    setAmInGroupCall(true);
    window.dispatchEvent(new CustomEvent("join-group-call"));
  };

  const leaveGroupCall = () => {
    setAmInGroupCall(false);
    window.dispatchEvent(new CustomEvent("leave-group-call"));
  };

  const toggleMute = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    window.dispatchEvent(new CustomEvent("toggle-mute", { detail: { muted: newState } }));
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

      <MeetingSummaryModal 
        isOpen={isSummaryModalOpen} 
        onClose={() => setIsSummaryModalOpen(false)} 
        data={summaryData} 
      />

      <KnowledgeLibraryModal 
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        workspaceId={workspace.id}
        getToken={getToken}
        onSelectSummary={(sessionId) => {
          setIsLibraryOpen(false);
          fetchSummary(sessionId);
        }}
      />
      
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
        {/* Interaction Label */}
        {isNearLibrary && !isLibraryOpen && (
          <div style={{
            position: 'absolute',
            left: '50%',
            bottom: '100px',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '12px',
            fontWeight: 'bold',
            fontSize: '1.2rem',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            animation: 'pulse 1.5s infinite',
            zIndex: 100,
            pointerEvents: 'none'
          }}>
            📖 Press <span style={{ color: '#6366f1', background: 'white', padding: '2px 8px', borderRadius: '4px', margin: '0 4px' }}>E</span> to View Archive
          </div>
        )}

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

        {activeCallUserId && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "52px",
              transform: "translateX(-50%)",
              zIndex: 101,
              pointerEvents: "auto",
            }}
          >
            <button
              onClick={endCall}
              style={{
                padding: "8px 14px",
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "999px",
                cursor: "pointer",
                fontWeight: 700,
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              }}
            >
              End Call
            </button>
          </div>
        )}

        {/* Notification Toast */}
        {notification && (
          <div style={{
            position: "absolute",
            top: "80px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#3b82f6",
            color: "white",
            padding: "10px 20px",
            borderRadius: "20px",
            fontWeight: "bold",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            zIndex: 100,
            animation: "slideDown 0.3s ease-out"
          }}>
            {notification}
          </div>
        )}

        {/* Group Call Controls */}
        <div style={{
          position: "absolute",
          top: "100px",
          left: "20px",
          pointerEvents: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "10px"
        }}>
          <button
            onClick={startGroupCall}
            disabled={!isMeetingZone || groupCallActive || amInGroupCall}
            style={{
              padding: "10px 20px",
              background: (!isMeetingZone || groupCallActive || amInGroupCall) ? "#d1d5db" : "#10b981",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: (!isMeetingZone || groupCallActive || amInGroupCall) ? "not-allowed" : "pointer",
              fontWeight: "600",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              transition: "calc(0.2s)"
            }}
          >
            Start Group Call
          </button>

          <button
            onClick={joinGroupCall}
            disabled={!isMeetingZone || !groupCallActive || amInGroupCall}
            style={{
              padding: "10px 20px",
              background: (!isMeetingZone || !groupCallActive || amInGroupCall) ? "#d1d5db" : "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: (!isMeetingZone || !groupCallActive || amInGroupCall) ? "not-allowed" : "pointer",
              fontWeight: "600",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              transition: "calc(0.2s)"
            }}
          >
            Join Group Call
          </button>
        </div>

        {/* Group Call Overlay (Zoom-like Screen) */}
        {amInGroupCall && (
          <div style={{
            position: "absolute",
            bottom: "20px",
            right: "20px",
            width: "350px",
            background: "rgba(31, 41, 55, 0.95)",
            backdropFilter: "blur(10px)",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
            pointerEvents: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "15px",
            animation: "slideIn 0.3s ease-out"
          }}>
            <h3 style={{ margin: 0, color: "white", textAlign: "center" }}>Group Call ({groupCallParticipants.length})</h3>
            
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "10px",
              maxHeight: "300px",
              overflowY: "auto"
            }}>
              {/* Render local user */}
              <div style={{
                background: "#374151",
                borderRadius: "12px",
                aspectRatio: "1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                border: "2px solid #10b981"
              }}>
                <span style={{ color: "white", fontSize: "2em", fontWeight: "bold" }}>YOU</span>
                {isMuted && (
                  <span style={{ position: "absolute", bottom: "5px", right: "5px", fontSize: "1.2em" }}>🔇</span>
                )}
              </div>

              {/* Render remote participants */}
              {groupCallParticipants.filter(id => id !== "pending").map((userId, i) => (
                <div key={i} style={{
                  background: "#4b5563",
                  borderRadius: "12px",
                  aspectRatio: "1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative"
                }}>
                  <span style={{ color: "white", fontSize: "2em", fontWeight: "bold" }}>
                    {userId.substring(0, 2).toUpperCase()}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "10px" }}>
              <button
                onClick={toggleMute}
                style={{
                  padding: "10px 20px",
                  background: isMuted ? "#ef4444" : "#4b5563",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  flex: 1
                }}
              >
                {isMuted ? "Unmute" : "Mute"}
              </button>
              
              <button
                onClick={leaveGroupCall}
                style={{
                  padding: "10px 20px",
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  flex: 1
                }}
              >
                Hang up
              </button>
            </div>
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

        {/* Zone Message - Bottom center */}
        {zoneMessage && (
          <div style={{
            position: "absolute",
            bottom: "30px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0, 0, 0, 0.7)",
            color: "white",
            padding: "10px 20px",
            borderRadius: "20px",
            fontWeight: "bold",
            pointerEvents: "none",
            animation: "fadeIn 0.3s ease-in-out",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}>
            <div style={{ fontSize: "1.1em" }}>{zoneMessage}</div>
            <div style={{ fontSize: "0.8em", marginTop: "4px", color: "#10b981", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ 
                width: "8px", 
                height: "8px", 
                background: "#10b981", 
                borderRadius: "50%",
                display: "inline-block"
              }}></span>
              {zonePlayerCount} {zonePlayerCount === 1 ? "person" : "people"} in call
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
