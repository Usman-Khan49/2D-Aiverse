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

export type View = "landing" | "dashboard" | "workspace" | "create-workspace";

interface DashboardState {
  // Navigation
  view: View;
  setView: (view: View) => void;

  // Workspace Data
  workspaces: Workspace[];
  setWorkspaces: (workspaces: Workspace[]) => void;
  selectedWorkspace: Workspace | null;
  setSelectedWorkspace: (workspace: Workspace | null) => void;
  createdWorkspace: Workspace | null;
  setCreatedWorkspace: (workspace: Workspace | null) => void;
  selectedMembers: WorkspaceMember[];
  setSelectedMembers: (members: WorkspaceMember[]) => void;

  // Dialog & UI State
  showJoinDialog: boolean;
  setShowJoinDialog: (show: boolean) => void;
  createStep: number;
  setCreateStep: (step: number) => void;
  joinInput: string;
  setJoinInput: (input: string) => void;
  createName: string;
  setCreateName: (name: string) => void;
  createSlug: string;
  setCreateSlug: (slug: string) => void;

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
  view: "dashboard",
  setView: (view) => set({ view }),

  // Workspace Data
  workspaces: [],
  setWorkspaces: (workspaces) => set({ workspaces }),
  selectedWorkspace: null,
  setSelectedWorkspace: (selectedWorkspace) => set({ selectedWorkspace }),
  createdWorkspace: null,
  setCreatedWorkspace: (createdWorkspace) => set({ createdWorkspace }),
  selectedMembers: [],
  setSelectedMembers: (selectedMembers) => set({ selectedMembers }),

  // Dialog & UI State
  showJoinDialog: false,
  setShowJoinDialog: (showJoinDialog) => set({ showJoinDialog }),
  createStep: 1,
  setCreateStep: (createStep) => set({ createStep }),
  joinInput: "",
  setJoinInput: (joinInput) => set({ joinInput }),
  createName: "",
  setCreateName: (createName) => set({ createName }),
  createSlug: "",
  setCreateSlug: (createSlug) => set({ createSlug }),

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
