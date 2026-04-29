import { create } from "zustand";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface WorkspaceState {
  // Connection State
  connectionStatus: ConnectionStatus;
  setConnectionStatus: (status: ConnectionStatus) => void;
  activeSocket: WebSocket | null;
  setActiveSocket: (socket: WebSocket | null) => void;

  // UI State
  copied: boolean;
  setCopied: (copied: boolean) => void;
  messages: string[];
  addMessage: (message: string) => void;
  inputMessage: string;
  setInputMessage: (message: string) => void;
  notification: string | null;
  setNotification: (notification: string | null) => void;

  // Player/Call State
  selectedPlayerId: string | null;
  setSelectedPlayerId: (id: string | null) => void;
  incomingCallUserId: string | null;
  setIncomingCallUserId: (id: string | null) => void;
  callStatus: string | null;
  setCallStatus: (status: string | null) => void;
  activeCallUserId: string | null;
  setActiveCallUserId: (idOrFn: string | null | ((current: string | null) => string | null)) => void;

  // Group Call State
  isMeetingZone: boolean;
  setIsMeetingZone: (is: boolean) => void;
  groupCallActive: boolean;
  setGroupCallActive: (active: boolean) => void;
  groupCallParticipants: string[];
  setGroupCallParticipants: (participantsOrFn: string[] | ((prev: string[]) => string[])) => void;
  amInGroupCall: boolean;
  setAmInGroupCall: (amIn: boolean) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  zoneMessage: string | null;
  setZoneMessage: (msg: string | null) => void;
  zonePlayerCount: number;
  setZonePlayerCount: (count: number) => void;

  // Reset helpers
  resetWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  connectionStatus: "connecting",
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  activeSocket: null,
  setActiveSocket: (socket) => set({ activeSocket: socket }),

  copied: false,
  setCopied: (copied) => set({ copied }),
  messages: [],
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  inputMessage: "",
  setInputMessage: (inputMessage) => set({ inputMessage }),
  notification: null,
  setNotification: (notification) => set({ notification }),

  selectedPlayerId: null,
  setSelectedPlayerId: (id) => set({ selectedPlayerId: id }),
  incomingCallUserId: null,
  setIncomingCallUserId: (id) => set({ incomingCallUserId: id }),
  callStatus: null,
  setCallStatus: (status) => set({ callStatus: status }),
  activeCallUserId: null,
  setActiveCallUserId: (idOrFn) => set((state) => ({ 
    activeCallUserId: typeof idOrFn === "function" ? idOrFn(state.activeCallUserId) : idOrFn 
  })),

  isMeetingZone: false,
  setIsMeetingZone: (is) => set({ isMeetingZone: is }),
  groupCallActive: false,
  setGroupCallActive: (active) => set({ groupCallActive: active }),
  groupCallParticipants: [],
  setGroupCallParticipants: (participantsOrFn) => set((state) => ({ 
    groupCallParticipants: typeof participantsOrFn === "function" ? participantsOrFn(state.groupCallParticipants) : participantsOrFn 
  })),
  amInGroupCall: false,
  setAmInGroupCall: (amIn) => set({ amInGroupCall: amIn }),
  isMuted: false,
  setIsMuted: (muted) => set({ isMuted: muted }),
  zoneMessage: null,
  setZoneMessage: (msg) => set({ zoneMessage: msg }),
  zonePlayerCount: 0,
  setZonePlayerCount: (count) => set({ zonePlayerCount: count }),

  resetWorkspace: () => set({
    connectionStatus: "connecting",
    activeSocket: null,
    copied: false,
    messages: [],
    inputMessage: "",
    notification: null,
    selectedPlayerId: null,
    incomingCallUserId: null,
    callStatus: null,
    activeCallUserId: null,
    isMeetingZone: false,
    groupCallActive: false,
    groupCallParticipants: [],
    amInGroupCall: false,
    isMuted: false,
    zoneMessage: null,
    zonePlayerCount: 0,
  }),
}));
