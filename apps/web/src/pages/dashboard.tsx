import { useAuth, useUser } from "@clerk/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { WorkspaceRoom } from "./workspace";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { WorkspaceCard } from "../components/dashboard/WorkspaceCard";
import { InviteBanner } from "../components/dashboard/InviteBanner";
import { JoinWorkspaceDialog } from "../components/JoinWorkspaceDialog";
import { CreateWorkspacePage } from "./create-workspace";
import { StatusMessages } from "../components/StatusMessages";
import { parseWorkspaceInput } from "../utils/workspaceUtils";
import { useDashboardStore } from "../store/useDashboardStore";
import type { Workspace, WorkspaceMember } from "../store/useDashboardStore";
import { API_BASE } from "../utils/config";
import "../styles/dashboard.css";


export function Dashboard() {
  const { getToken, isLoaded } = useAuth();
  const { user } = useUser();

  // Zustand Store
  const {
    view, setView,
    workspaces, setWorkspaces,
    selectedWorkspace, setSelectedWorkspace,
    createdWorkspace, setCreatedWorkspace,
    selectedMembers, setSelectedMembers,
    showJoinDialog, setShowJoinDialog,
    createStep, setCreateStep,
    joinInput, setJoinInput,
    createName, setCreateName,
    createSlug, setCreateSlug,
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

  // Tab State
  const [activeTab, setActiveTab] = useState<"joined" | "created">("joined");
  const [searchQuery, setSearchQuery] = useState("");

  const displayedWorkspaces = useMemo(() => {
    let list = activeTab === "created" ? ownedWorkspaces : joinedWorkspaces;
    if (searchQuery) {
      list = list.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return list;
  }, [activeTab, ownedWorkspaces, joinedWorkspaces, searchQuery]);


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
    const slug = createSlug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    if (!name) {
      setError("Workspace name is required.");
      return;
    }

    setSubmitting(true);
    resetFeedback();

    try {
      const data = await apiFetch<{ workspace: Workspace }>("/workspaces", {
        method: "POST",
        body: JSON.stringify({ name, slug }),
      });

      setCreateName("");
      setCreateSlug("");
      setCreatedWorkspace(data.workspace);
      setSuccess("Workspace created.");
      await loadWorkspaces();
      setCreateStep(2);
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

  // Render: Create Workspace View
  if (view === "create-workspace") {
    return (
      <CreateWorkspacePage
        step={createStep}
        setStep={setCreateStep}
        nameInput={createName}
        slugInput={createSlug}
        isSubmitting={submitting}
        onNameChange={(name) => {
          setCreateName(name);
          setCreateSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
        }}
        onSlugChange={setCreateSlug}
        onSubmit={onCreateWorkspace}
        onCancel={() => setView("dashboard")}
        workspace={createdWorkspace}
        onEnterOffice={async () => {
          if (createdWorkspace) {
            await openWorkspace(createdWorkspace);
            setCreatedWorkspace(null);
            setCreateStep(1);
          }
        }}
      />
    );
  }

  // Render: Dashboard View
  return (
    <div className="dashboard-layout">
      <DashboardHeader
        user={user}
        displayName={displayName}
        onCreateClick={() => {
          setCreateStep(1);
          setView("create-workspace");
        }}
      />

      <StatusMessages
        error={error}
        success={success}
        loadingMembers={loadingMembers}
      />

      <main className="dashboard-content">
        <div className="dashboard-actions-row">
          <div className="dashboard-tabs">
            <button 
              className={`tab-btn ${activeTab === "joined" ? "active" : ""}`}
              onClick={() => setActiveTab("joined")}
            >
              Joined Spaces
            </button>
            <button 
              className={`tab-btn ${activeTab === "created" ? "active" : ""}`}
              onClick={() => setActiveTab("created")}
            >
              Created Spaces
            </button>
          </div>
          
          <div className="search-bar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-text-muted)" }}>
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="text" 
              placeholder="Search workspaces..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <InviteBanner onJoinClick={() => setShowJoinDialog(true)} />

        <div className="workspace-grid">
          {loadingWorkspaces && <div className="empty-state">Loading workspaces...</div>}
          {!loadingWorkspaces && displayedWorkspaces.length === 0 && (
             <div className="empty-state">
               <p>No workspaces found.</p>
             </div>
          )}
          {!loadingWorkspaces && displayedWorkspaces.map((workspace) => (
            <WorkspaceCard
              key={workspace.id}
              workspace={workspace}
              onClick={openWorkspace}
              onlineCount={Math.floor(Math.random() * 5)} // Mocking online count for UI
            />
          ))}
        </div>

        <div className="dashboard-footer">
          Looking for an older workspace? <a href="#" className="classic-link">Open classic dashboard ↗</a>
        </div>
      </main>

      <JoinWorkspaceDialog
        isOpen={showJoinDialog}
        input={joinInput}
        isSubmitting={submitting}
        onInputChange={setJoinInput}
        onSubmit={onJoinWorkspace}
        onClose={() => setShowJoinDialog(false)}
      />
    </div>
  );
}
