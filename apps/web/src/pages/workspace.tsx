import { useEffect, useState, useRef } from "react";
import { PhaserGame } from "../components/PhaserGame";
import { MeetingSummaryModal } from "../components/MeetingSummaryModal";
import { KnowledgeLibraryModal } from "../components/KnowledgeLibraryModal";
import { MemorySidebar } from "../components/MemorySidebar";
import { useDashboardStore } from "../store/useDashboardStore";
import { API_BASE, WS_BASE } from "../utils/config";
import "../styles/workspaceRoom.css";

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
  ownerName: _ownerName,
  getToken,
  onBack }: {
    workspace: Workspace,
    displayName: string,
    ownerName: string,
    getToken: () => Promise<string | null>,
    onBack: () => void
  }) {
  const { selectedMembers } = useDashboardStore();
  const [_connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [_copied, _setCopied] = useState(false);
  const [_messages, setMessages] = useState<string[]>([]);
  const [_inputMessage, _setInputMessage] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const [activeSocket, setActiveSocket] = useState<WebSocket | null>(null);
  const [_selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [_incomingCallUserId, setIncomingCallUserId] = useState<string | null>(null);
  const [_callStatus, setCallStatus] = useState<string | null>(null);
  const [activeCallUserId, setActiveCallUserId] = useState<string | null>(null);
  const [zoneMessage, setZoneMessage] = useState<string | null>(null);
  const [_zonePlayerCount, setZonePlayerCount] = useState<number>(0);
  
  // Group Call State
  const [_isMeetingZone, setIsMeetingZone] = useState(false);
  const [_groupCallActive, setGroupCallActive] = useState(false);
  const [_groupCallParticipants, setGroupCallParticipants] = useState<string[]>([]);
  const [amInGroupCall, setAmInGroupCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [_notification, setNotification] = useState<string | null>(null);
  
  // Summary State
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [highlightOffset, setHighlightOffset] = useState<number | null>(null);
  
  // Library State
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [_isNearLibrary, setIsNearLibrary] = useState(false);

  // Memory State
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);

  // Call Timer State
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (activeCallUserId || amInGroupCall) {
      if (!callStartTime) {
        setCallStartTime(Date.now());
      }
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - (callStartTime || Date.now())) / 1000));
      }, 1000);
    } else {
      setCallStartTime(null);
      setElapsedSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeCallUserId, amInGroupCall, callStartTime]);

  const formatElapsed = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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

          if (data.type === "CURRENT_PLAYERS") {
            const players = data.payload?.players || [];
            setOnlineUserIds(players.map((p: any) => p.userId));
            // Let it fall through for Phaser
          }

          if (data.type === "NEW_PLAYER") {
            const newUserId = data.payload?.userId;
            if (newUserId) setOnlineUserIds(prev => [...prev.filter(id => id !== newUserId), newUserId]);
            // Let it fall through for Phaser
          }

          if (data.type === "PLAYER_LEFT") {
            const leftUserId = data.payload?.userId;
            if (leftUserId) setOnlineUserIds(prev => prev.filter(id => id !== leftUserId));
            // Let it fall through for Phaser
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



  const endCall = () => {
    if (!activeCallUserId) return;
    window.dispatchEvent(new CustomEvent("end-call", { detail: { userId: activeCallUserId } }));
    setCallStatus("Call Ended");
    setActiveCallUserId(null);
  };
  const initiateCall = () => {
    if (_selectedPlayerId) {
      setCallStatus("Dialing...");
      setActiveCallUserId(_selectedPlayerId);
      window.dispatchEvent(new CustomEvent("initiate-call", { detail: { userId: _selectedPlayerId } }));
      setSelectedPlayerId(null);
    }
  };

  const acceptCall = () => {
    if (_incomingCallUserId) {
      setCallStatus("Connecting...");
      setActiveCallUserId(_incomingCallUserId);
      window.dispatchEvent(new CustomEvent("accept-call", { detail: { userId: _incomingCallUserId } }));
      setIncomingCallUserId(null);
    }
  };

  const declineCall = () => {
    if (_incomingCallUserId) {
      window.dispatchEvent(new CustomEvent("decline-call", { detail: { userId: _incomingCallUserId } }));
      setIncomingCallUserId(null);
    }
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
    <div className="workspace-view">
      
      {/* Sidebar Overlay */}
      <aside className="workspace-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-icon">
            {workspace.name.substring(0, 1).toUpperCase()}
          </div>
          <div className="sidebar-title">
            <h2>{workspace.name}</h2>
            <p><span className="status-dot"></span> {onlineUserIds.length + 1} {onlineUserIds.length + 1 === 1 ? 'person' : 'people'} online</p>
          </div>
        </div>

        <div className="sidebar-nav">
          <nav className="nav-menu">
            <div className="nav-section-title">Navigation</div>
            <a href="#" className="nav-item active">
              <div className="nav-item-content">
                <div className="nav-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                </div>
                <span>Presence</span>
              </div>
            </a>
            
            <a href="#" className="nav-item">
              <div className="nav-item-content">
                <div className="nav-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
                <span>Action Items</span>
              </div>
              <span className="nav-badge">4</span>
            </a>

            <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); setIsLibraryOpen(true); }}>
              <div className="nav-item-content">
                <div className="nav-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                </div>
                <span>Files</span>
              </div>
            </a>

            <a href="#" className="nav-item">
              <div className="nav-item-content">
                <div className="nav-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                </div>
                <span>Chat</span>
              </div>
            </a>

            <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); setIsMemoryOpen(true); }}>
              <div className="nav-item-content">
                <div className="nav-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                </div>
                <span>Memory</span>
              </div>
            </a>
          </nav>
        </div>

        {/* Group Call Actions (Only in Meeting Zone) */}
        {_isMeetingZone && (
          <div className="sidebar-group-call" style={{ padding: '0 var(--space-6) var(--space-4) var(--space-6)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button 
              className="btn-primary" 
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: _groupCallActive ? 0.5 : 1, cursor: _groupCallActive ? 'not-allowed' : 'pointer' }}
              onClick={startGroupCall}
              disabled={_groupCallActive}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
              Start Meeting
            </button>
            
            <button 
              className="btn-primary" 
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: 'var(--color-secondary-dark)', opacity: (!_groupCallActive || amInGroupCall) ? 0.5 : 1, cursor: (!_groupCallActive || amInGroupCall) ? 'not-allowed' : 'pointer' }}
              onClick={joinGroupCall}
              disabled={!_groupCallActive || amInGroupCall}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
              Join Meeting
            </button>
          </div>
        )}

        {onlineUserIds.length > 0 && (
          <div className="sidebar-online">
            <div className="nav-section-title">Online Now</div>
            <div className="online-list">
               {onlineUserIds.map(wsId => {
                 const lastUnderscore = wsId.lastIndexOf('_');
                 const baseId = lastUnderscore > 0 ? wsId.substring(0, lastUnderscore) : wsId;
                 const member = selectedMembers.find(m => m.user.id === baseId);
                 const name = member?.user.name || member?.user.email || 'Unknown User';
                 const avatarUrl = member?.user.avatarUrl || `https://i.pravatar.cc/100?u=${baseId}`;
                 
                 return (
                   <div className="online-user" key={wsId}>
                     <div className="online-avatar">
                       <img src={avatarUrl} alt={name} />
                       <span className="status-dot"></span>
                     </div>
                     <div className="online-user-info">
                       <p>{name}</p>
                       <span>In Workspace</span>
                     </div>
                   </div>
                 );
               })}
            </div>
          </div>
        )}

        <div className="sidebar-footer">
          <div className="current-user">
            <img src="https://i.pravatar.cc/100?img=60" alt="Current User" />
            <div className="current-user-info">
              <p>Current User</p>
              <span>{displayName}</span>
            </div>
          </div>
          <button className="settings-btn" onClick={onBack}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          </button>
        </div>
      </aside>

      <div className="workspace-game-container">
        <PhaserGame socket={activeSocket} />

        {/* Bottom Calling Bar Overlay */}
        <div className="call-controls-container">
          <div className="call-controls-bar">
            {zoneMessage ? (
              <div className="zone-indicator">
                <span className="status-dot"></span> {zoneMessage.replace('Zone: ', '')}
              </div>
            ) : (
              <div className="zone-indicator" style={{ backgroundColor: 'var(--color-tertiary-dark)', color: 'var(--color-text-muted)' }}>
                <span className="status-dot" style={{ backgroundColor: 'var(--color-text-light)' }}></span> NOT IN ZONE
              </div>
            )}
            
            <div className="control-buttons">
              <button 
                className="control-btn" 
                onClick={toggleMute}
              >
                <div className="disabled-icon-wrapper">
                  {isMuted ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                  )}
                </div>
                <span>MUTE</span>
              </button>

              <button className="control-btn disabled">
                <div className="disabled-icon-wrapper">
                  <span className="red-cross">×</span>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                </div>
                <span>VIDEO</span>
              </button>

              <button className="control-btn disabled">
                <div className="disabled-icon-wrapper">
                  <span className="red-cross">×</span>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                </div>
                <span>SCREEN</span>
              </button>

              <button 
                className={`btn-end-call ${(!activeCallUserId && !amInGroupCall) ? 'inactive' : ''}`}
                onClick={() => {
                  if (activeCallUserId) endCall();
                  if (amInGroupCall) leaveGroupCall();
                }}
                disabled={!activeCallUserId && !amInGroupCall}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path><line x1="23" y1="1" x2="1" y2="23"></line></svg>
                END
              </button>
            </div>
          </div>
        </div>

      <MeetingSummaryModal 
        isOpen={isSummaryModalOpen} 
        onClose={() => {
          setIsSummaryModalOpen(false);
          setHighlightOffset(null);
        }} 
        data={summaryData} 
        highlightOffset={highlightOffset}
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

      <MemorySidebar 
        isOpen={isMemoryOpen}
        onClose={() => setIsMemoryOpen(false)}
        workspaceId={workspace.id}
        getToken={getToken}
        onViewSource={(sessionId, offset) => {
          setHighlightOffset(offset);
          fetchSummary(sessionId);
        }}
      />
      
      {/* Call UI Overlays */}
      {_selectedPlayerId && (
        <div className="call-popup-overlay" style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', background: 'var(--color-surface)', padding: '16px', borderRadius: '8px', boxShadow: 'var(--shadow-lg)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Call {
            selectedMembers.find(m => m.user.id === (_selectedPlayerId.includes('_') ? _selectedPlayerId.substring(0, _selectedPlayerId.lastIndexOf('_')) : _selectedPlayerId))?.user.name || 'User'
          }?</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-primary" onClick={initiateCall}>Call</button>
            <button className="btn-secondary" onClick={() => setSelectedPlayerId(null)}>Cancel</button>
          </div>
        </div>
      )}

      {_incomingCallUserId && (
        <div className="call-popup-overlay incoming" style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', background: 'var(--color-primary)', color: 'white', padding: '16px', borderRadius: '8px', boxShadow: 'var(--shadow-lg)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Incoming call from {
            selectedMembers.find(m => m.user.id === (_incomingCallUserId.includes('_') ? _incomingCallUserId.substring(0, _incomingCallUserId.lastIndexOf('_')) : _incomingCallUserId))?.user.name || 'User'
          }</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-primary" style={{ backgroundColor: 'white', color: 'var(--color-primary)' }} onClick={acceptCall}>Accept</button>
            <button className="btn-secondary" style={{ backgroundColor: 'transparent', borderColor: 'white', color: 'white' }} onClick={declineCall}>Decline</button>
          </div>
        </div>
      )}

      {_callStatus && !_incomingCallUserId && !_selectedPlayerId && (
        <div className="call-status-toast" style={{ position: 'absolute', top: '20px', right: '20px', background: 'var(--color-surface)', padding: '12px 16px', borderRadius: '8px', boxShadow: 'var(--shadow-md)', zIndex: 1000, fontWeight: 600 }}>
          {_callStatus}
        </div>
      )}

      {_notification && (
        <div className="notification-toast" style={{ position: 'absolute', top: '80px', right: '20px', background: 'var(--color-secondary-dark)', color: 'white', padding: '12px 16px', borderRadius: '8px', boxShadow: 'var(--shadow-md)', zIndex: 1000, fontWeight: 600 }}>
          {_notification}
        </div>
      )}

      {/* Right Sidebar - Call Overlay */}
      {((_groupCallActive && amInGroupCall) || activeCallUserId) && (
        <div className="call-right-sidebar">
          <div className="meeting-area-header">
            <span className="live-indicator"><span className="live-dot"></span> LIVE</span>
            <h2>{amInGroupCall ? "Meeting Area" : "1-on-1 Call"}</h2>
          </div>
          
          <div className="elapsed-time-box">
             <div className="time">{formatElapsed(elapsedSeconds)}</div>
             <div className="time-label">ELAPSED TIME</div>
          </div>

          <div className="in-call-section">
            <div className="in-call-header">
              IN THE CALL — {amInGroupCall ? (_groupCallParticipants.length > 0 ? _groupCallParticipants.length : 2) : 2}
            </div>
            
            <div className="participant-list">
               {/* Current User */}
               <div className="call-participant-item active-speaker">
                 <div className="cp-avatar-wrap">
                   <img src="https://i.pravatar.cc/100?img=60" className="cp-avatar" alt="Current User" />
                   <div className="cp-status-dot red-mute"></div>
                 </div>
                 <div className="cp-info">
                   <p className="cp-name">{displayName}</p>
                   <p className="cp-subtext">{isMuted ? "Muted" : "Speaking..."}</p>
                 </div>
               </div>

               {/* Other Participants */}
               {activeCallUserId && !amInGroupCall && (
                 (() => {
                   const callUserBaseId = activeCallUserId.includes('_') ? activeCallUserId.substring(0, activeCallUserId.lastIndexOf('_')) : activeCallUserId;
                   const member = selectedMembers.find(m => m.user.id === callUserBaseId);
                   const name = member?.user.name || member?.user.email || 'User';
                   const avatarUrl = member?.user.avatarUrl || `https://i.pravatar.cc/100?u=${callUserBaseId}`;
                   
                   return (
                     <div className="call-participant-item" key={activeCallUserId}>
                       <div className="cp-avatar-wrap">
                         <img src={avatarUrl} className="cp-avatar" alt={name} />
                         <div className="cp-status-dot green"></div>
                       </div>
                       <div className="cp-info">
                         <p className="cp-name">{name}</p>
                         <p className="cp-subtext">Joined recently</p>
                       </div>
                     </div>
                   );
                 })()
               )}

               {amInGroupCall && _groupCallParticipants.map(participantId => {
                 const baseId = participantId.includes('_') ? participantId.substring(0, participantId.lastIndexOf('_')) : participantId;
                 const member = selectedMembers.find(m => m.user.id === baseId);
                 const name = member?.user.name || member?.user.email || 'User';
                 const avatarUrl = member?.user.avatarUrl || `https://i.pravatar.cc/100?u=${baseId}`;

                 return (
                   <div className="call-participant-item" key={participantId}>
                     <div className="cp-avatar-wrap">
                       <img src={avatarUrl} className="cp-avatar" alt={name} />
                       <div className="cp-status-dot green"></div>
                     </div>
                     <div className="cp-info">
                       <p className="cp-name">{name}</p>
                       <p className="cp-subtext">Joined recently</p>
                     </div>
                   </div>
                 );
               })}
            </div>
          </div>
          
          <div className="call-actions-bottom">
            <button className="btn-sidebar-leave" onClick={() => {
                  if (activeCallUserId) endCall();
                  if (amInGroupCall) leaveGroupCall();
                }}>
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
               Leave Call
            </button>
            <button className="btn-sidebar-end-all" onClick={() => {
                  if (activeCallUserId) endCall();
                  if (amInGroupCall) leaveGroupCall();
                }}>
               <div className="end-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path><line x1="23" y1="1" x2="1" y2="23"></line></svg>
                  End Meeting for All
               </div>
               <span className="end-desc">Ending the meeting will generate an AI summary</span>
            </button>
          </div>
        </div>
      )}

      {/* End of workspace-game-container */}
      </div>
    </div>
  );
}
