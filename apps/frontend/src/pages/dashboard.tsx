import { useAuth, useUser } from "@clerk/react";
import { useCallback, useEffect, useMemo } from "react";
import type { FormEvent } from "react";

import { WorkspaceRoom } from "./workspace";
import { DashboardHeader } from "../components/DashboardHeader";
import { WorkspaceSection } from "../components/WorkspaceSection";
import { JoinWorkspaceDialog } from "../components/JoinWorkspaceDialog";
import { CreateWorkspaceDialog } from "../components/CreateWorkspaceDialog";
import { StatusMessages } from "../components/StatusMessages";
import { parseWorkspaceInput } from "../utils/workspaceUtils";
import { useDashboardStore } from "../store/useDashboardStore";
import type { Workspace, WorkspaceMember } from "../store/useDashboardStore";
import "../App.css";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:4000/api/v1";

export function Dashboard() {
  const { getToken, isLoaded } = useAuth();
  const { user } = useUser();

  // Zustand Store
  const {
    view, setView,
    workspaces, setWorkspaces,
    selectedWorkspace, setSelectedWorkspace,
    selectedMembers, setSelectedMembers,
    showJoinDialog, setShowJoinDialog,
    showCreateDialog, setShowCreateDialog,
    joinInput, setJoinInput,
    createName, setCreateName,
    loadingWorkspaces, setLoadingWorkspaces,
    loadingMembers, setLoadingMembers,
    submitting, setSubmitting,
    error, setError,
    success, setSuccess,
    resetFeedback
  } = useDashboardStore();

  // Computed Values
  const displayName = useMemo(() => {
    const first = user?.firstName?.trim() ?? "";
    const last = user?.lastName?.trim() ?? "";
    const full = `${first} ${last}`.trim();
    return user?.username ?? (full || user?.primaryEmailAddress?.emailAddress || "User");
  }, [user]);

  const ownedWorkspaces = useMemo(
    () => workspaces.filter((workspace) => workspace.role === "owner"),
    [workspaces],
  );

  const joinedWorkspaces = useMemo(
    () => workspaces.filter((workspace) => workspace.role !== "owner"),
    [workspaces],
  );

  const ownerName = useMemo(() => {
    if (!selectedWorkspace) {
      return "";
    }
    const ownerMember = selectedMembers.find((member) => member.role === "owner");
    return (
      ownerMember?.user.name ??
      ownerMember?.user.email ??
      selectedWorkspace.ownerId
    );
  }, [selectedMembers, selectedWorkspace]);


  // API Helper
  const apiFetch = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      const token = await getToken();
      const headers = new Headers(init?.headers ?? {});

      if (init?.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      const response = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        const text = await response.text();
        let message = `Request failed (${response.status})`;

        try {
          const parsed = JSON.parse(text) as { error?: string };
          if (parsed.error) {
            message = parsed.error;
          }
        } catch {
          if (text) {
            message = text;
          }
        }

        throw new Error(message);
      }

      return (await response.json()) as T;
    },
    [getToken],
  );

  // Data Loading
  const loadWorkspaces = useCallback(async () => {
    if (!isLoaded) return;

    setLoadingWorkspaces(true);
    setError(null);

    try {
      const data = await apiFetch<{ workspaces: Workspace[] }>("/workspaces");
      setWorkspaces(data.workspaces ?? []);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Failed to load workspaces";
      setError(message);
    } finally {
      setLoadingWorkspaces(false);
    }
  }, [apiFetch, isLoaded, setLoadingWorkspaces, setError, setWorkspaces]);

  const loadMembers = useCallback(
    async (workspaceId: string) => {
      setLoadingMembers(true);
      setError(null);

      try {
        const data = await apiFetch<{ members: WorkspaceMember[] }>(
          `/workspaces/${workspaceId}/members`,
        );
        setSelectedMembers(data.members ?? []);
      } catch (membersError) {
        const message =
          membersError instanceof Error
            ? membersError.message
            : "Failed to load workspace members";
        setError(message);
      } finally {
        setLoadingMembers(false);
      }
    },
    [apiFetch, setLoadingMembers, setError, setSelectedMembers],
  );

  useEffect(() => {
    if (!isLoaded) return;
    void loadWorkspaces();
  }, [isLoaded, loadWorkspaces]);


  // Navigation
  const openWorkspace = async (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setView("workspace");
    await loadMembers(workspace.id);
  };

  const goToDashboard = () => {
    setView("dashboard");
  };

  // Workspace Actions
  const onJoinWorkspace = async (event: FormEvent) => {
    event.preventDefault();
    const payload = parseWorkspaceInput(joinInput);

    if (!payload) {
      setError("Please enter a workspace URL, slug, or id.");
      return;
    }

    setSubmitting(true);
    resetFeedback();

    try {
      const data = await apiFetch<{ workspace: Workspace }>("/workspaces/join", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setJoinInput("");
      setShowJoinDialog(false);
      setSuccess("Workspace added.");
      await loadWorkspaces();
      await openWorkspace(data.workspace);
    } catch (joinError) {
      const message =
        joinError instanceof Error ? joinError.message : "Failed to add workspace";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const onCreateWorkspace = async (event: FormEvent) => {
    event.preventDefault();
    const name = createName.trim();

    if (!name) {
      setError("Workspace name is required.");
      return;
    }

    setSubmitting(true);
    resetFeedback();

    try {
      const data = await apiFetch<{ workspace: Workspace }>("/workspaces", {
        method: "POST",
        body: JSON.stringify({ name }),
      });

      setCreateName("");
      setShowCreateDialog(false);
      setSuccess("Workspace created.");
      await loadWorkspaces();
      await openWorkspace(data.workspace);
    } catch (createError) {
      const message =
        createError instanceof Error
          ? createError.message
          : "Failed to create workspace";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };


  // Render: Workspace View
  if (view === "workspace" && selectedWorkspace) {
    return (
      <WorkspaceRoom
        workspace={selectedWorkspace}
        displayName={displayName}
        ownerName={ownerName}
        getToken={getToken}
        onBack={goToDashboard}
      />
    );
  }

  // Render: Landing View
  if (view === "landing") {
    return (
      <div className="landing-page">
        <div>
          <h1>Aiverse</h1>
          <p>Build and explore workspaces with your team.</p>
        </div>
        <button className="cta-btn" onClick={() => setView("dashboard")}>
          Get Started
        </button>
      </div>
    );
  }

  // Render: Dashboard View
  return (
    <div className="dashboard-page">
      <DashboardHeader
        user={user}
        displayName={displayName}
        onAddClick={() => setShowJoinDialog(true)}
      />

      <StatusMessages
        error={error}
        success={success}
        loadingMembers={loadingMembers}
      />

      <WorkspaceSection
        title="Owned Workspaces"
        workspaces={ownedWorkspaces}
        isLoading={loadingWorkspaces}
        emptyMessage="No owned workspaces yet."
        onWorkspaceClick={openWorkspace}
        actionButton={{
          label: "Create",
          onClick: () => setShowCreateDialog(true),
        }}
      />

      <WorkspaceSection
        title="Joined Workspaces"
        workspaces={joinedWorkspaces}
        isLoading={loadingWorkspaces}
        emptyMessage="No joined workspaces yet."
        onWorkspaceClick={openWorkspace}
      />

      <JoinWorkspaceDialog
        isOpen={showJoinDialog}
        input={joinInput}
        isSubmitting={submitting}
        onInputChange={setJoinInput}
        onSubmit={onJoinWorkspace}
        onClose={() => setShowJoinDialog(false)}
      />

      <CreateWorkspaceDialog
        isOpen={showCreateDialog}
        input={createName}
        isSubmitting={submitting}
        onInputChange={setCreateName}
        onSubmit={onCreateWorkspace}
        onClose={() => setShowCreateDialog(false)}
      />
    </div>
  );
}