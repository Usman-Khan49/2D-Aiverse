import { useEffect } from "react";
import { useWorkspaceStore } from "../store/useWorkspaceStore";

export const useWorkspaceCalls = (getToken: () => Promise<string | null>) => {
  const {
    setSelectedPlayerId,
    setIncomingCallUserId,
    setCallStatus,
    setActiveCallUserId,
    setIsMeetingZone,
    setGroupCallActive,
    setGroupCallParticipants,
    setAmInGroupCall,
    setZoneMessage,
    setZonePlayerCount,
    setNotification,
  } = useWorkspaceStore();

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
      if (["Call Declined", "Call Ended", "Call Ended by Peer", "Connection Failed", "Network Blocked (ICE Failed)"].includes(status)) {
        setActiveCallUserId(null);
      }
    };
    const handleCallEnded = (e: Event) => {
      const event = e as CustomEvent<{ userId?: string }>;
      const endedUserId = event.detail?.userId;
      setActiveCallUserId((current: string | null) => (endedUserId && current !== endedUserId ? current : null));
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
      setNotification(`A group call has started in the Meeting zone!`);
      setTimeout(() => setNotification(null), 4000);
    };
    const handleGroupCallUserJoined = (e: Event) => {
      const data = (e as CustomEvent).detail;
      setGroupCallParticipants((prev: string[]) => {
        const next = [...prev.filter((p: string) => p !== data.userId), data.userId];
        setZonePlayerCount(next.length);
        return next;
      });
    };
    const handleGroupCallUserLeft = (e: Event) => {
      const data = (e as CustomEvent).detail;
      setGroupCallParticipants((prev: string[]) => {
        const next = prev.filter((p: string) => p !== data.userId);
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
    window.addEventListener("group-call-state", handleGroupCallState);
    window.addEventListener("group-call-started", handleGroupCallStarted);
    window.addEventListener("group-call-user-joined", handleGroupCallUserJoined);
    window.addEventListener("group-call-user-left", handleGroupCallUserLeft);
    window.addEventListener("group-call-ended", handleGroupCallEnded);
    window.addEventListener("group-call-participants", handleGroupCallParticipants);

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
    };
  }, [
    setSelectedPlayerId,
    setIncomingCallUserId,
    setCallStatus,
    setActiveCallUserId,
    setIsMeetingZone,
    setGroupCallActive,
    setGroupCallParticipants,
    setAmInGroupCall,
    setZoneMessage,
    setZonePlayerCount,
    setNotification
  ]);

  // Handle TURN credentials
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
          window.dispatchEvent(new CustomEvent("webrtc-ice-servers", { detail: { iceServers } }));
        }
      } catch(err) {
        console.error("Failed to load TURN servers", err);
      }
    };
    loadTurn();
    return () => { cancelled = true; };
  }, [getToken]);

  return {
    initiateCall: (selectedPlayerId: string) => {
      setCallStatus("Dialing...");
      setActiveCallUserId(selectedPlayerId);
      window.dispatchEvent(new CustomEvent("initiate-call", { detail: { userId: selectedPlayerId } }));
      setSelectedPlayerId(null);
    },
    acceptCall: (incomingCallUserId: string) => {
      setCallStatus("Connecting...");
      setActiveCallUserId(incomingCallUserId);
      window.dispatchEvent(new CustomEvent("accept-call", { detail: { userId: incomingCallUserId } }));
      setIncomingCallUserId(null);
    },
    declineCall: (incomingCallUserId: string) => {
      window.dispatchEvent(new CustomEvent("decline-call", { detail: { userId: incomingCallUserId } }));
      setIncomingCallUserId(null);
    },
    endCall: (activeCallUserId: string) => {
      window.dispatchEvent(new CustomEvent("end-call", { detail: { userId: activeCallUserId } }));
      setCallStatus("Call Ended");
      setActiveCallUserId(null);
    },
    startGroupCall: () => {
      setAmInGroupCall(true);
      setGroupCallActive(true);
      window.dispatchEvent(new CustomEvent("start-group-call"));
    },
    joinGroupCall: () => {
      setAmInGroupCall(true);
      window.dispatchEvent(new CustomEvent("join-group-call"));
    },
    leaveGroupCall: () => {
      setAmInGroupCall(false);
      window.dispatchEvent(new CustomEvent("leave-group-call"));
    },
    toggleMute: (isMuted: boolean) => {
      window.dispatchEvent(new CustomEvent("toggle-mute", { detail: { muted: !isMuted } }));
    }
  };
};
