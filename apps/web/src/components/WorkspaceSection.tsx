type Workspace = {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  role?: string | null;
};

interface WorkspaceSectionProps {
  title: string;
  workspaces: Workspace[];
  isLoading: boolean;
  emptyMessage: string;
  onWorkspaceClick: (workspace: Workspace) => void;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
}

export function WorkspaceSection({
  title,
  workspaces,
  isLoading,
  emptyMessage,
  onWorkspaceClick,
  actionButton,
}: WorkspaceSectionProps) {
  return (
    <section className="workspace-section">
      <div className="section-head">
        <h2>{title}</h2>
        {actionButton && (
          <button className="create-btn" onClick={actionButton.onClick}>
            {actionButton.label}
          </button>
        )}
      </div>

      <div className="workspace-row">
        {isLoading ? <p>Loading...</p> : null}
        {!isLoading && workspaces.length === 0 ? <p>{emptyMessage}</p> : null}
        {workspaces.map((workspace) => (
          <button
            key={workspace.id}
            className="workspace-card"
            onClick={() => onWorkspaceClick(workspace)}
          >
            <div className="workspace-thumb" aria-hidden="true">
              <span>+</span>
            </div>
            <div className="workspace-title">{workspace.name}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
