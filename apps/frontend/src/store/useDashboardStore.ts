import { create } from "zustand";

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  role?: string | null;
};

export type WorkspaceMember = {
  workspaceId: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  };
};

export type View = "landing" | "dashboard" | "workspace";

interface DashboardState {
  // Navigation
  view: View;
  setView: (view: View) => void;

  // Workspace Data
  workspaces: Workspace[];
  setWorkspaces: (workspaces: Workspace[]) => void;
  selectedWorkspace: Workspace | null;
  setSelectedWorkspace: (workspace: Workspace | null) => void;
  selectedMembers: WorkspaceMember[];
  setSelectedMembers: (members: WorkspaceMember[]) => void;

  // Dialog & UI State
  showJoinDialog: boolean;
  setShowJoinDialog: (show: boolean) => void;
  showCreateDialog: boolean;
  setShowCreateDialog: (show: boolean) => void;
  joinInput: string;
  setJoinInput: (input: string) => void;
  createName: string;
  setCreateName: (name: string) => void;

  // Loading & Feedback
  loadingWorkspaces: boolean;
  setLoadingWorkspaces: (loading: boolean) => void;
  loadingMembers: boolean;
  setLoadingMembers: (loading: boolean) => void;
  submitting: boolean;
  setSubmitting: (submitting: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  success: string | null;
  setSuccess: (success: string | null) => void;

  // Reset helpers
  resetFeedback: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  // Navigation
  view: "landing",
  setView: (view) => set({ view }),

  // Workspace Data
  workspaces: [],
  setWorkspaces: (workspaces) => set({ workspaces }),
  selectedWorkspace: null,
  setSelectedWorkspace: (selectedWorkspace) => set({ selectedWorkspace }),
  selectedMembers: [],
  setSelectedMembers: (selectedMembers) => set({ selectedMembers }),

  // Dialog & UI State
  showJoinDialog: false,
  setShowJoinDialog: (showJoinDialog) => set({ showJoinDialog }),
  showCreateDialog: false,
  setShowCreateDialog: (showCreateDialog) => set({ showCreateDialog }),
  joinInput: "",
  setJoinInput: (joinInput) => set({ joinInput }),
  createName: "",
  setCreateName: (createName) => set({ createName }),

  // Loading & Feedback
  loadingWorkspaces: false,
  setLoadingWorkspaces: (loadingWorkspaces) => set({ loadingWorkspaces }),
  loadingMembers: false,
  setLoadingMembers: (loadingMembers) => set({ loadingMembers }),
  submitting: false,
  setSubmitting: (submitting) => set({ submitting }),
  error: null,
  setError: (error) => set({ error }),
  success: null,
  setSuccess: (success) => set({ success }),

  // Reset helpers
  resetFeedback: () => set({ error: null, success: null }),
}));
