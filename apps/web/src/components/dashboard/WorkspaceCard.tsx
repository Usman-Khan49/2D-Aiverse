import type { Workspace } from "../../store/useDashboardStore";

interface WorkspaceCardProps {
  workspace: Workspace;
  onClick: (workspace: Workspace) => void;
  onlineCount?: number;
  imageUrl?: string;
}

export function WorkspaceCard({ workspace, onClick, onlineCount = 0, imageUrl }: WorkspaceCardProps) {
  const isOnline = onlineCount > 0;
  
  // Format the date simply for the UI
  const formattedDate = "Yesterday"; // Stub for UI matching "Last visited Yesterday"
  // For a real implementation you would format relative time

  return (
    <div className="workspace-card-modern" onClick={() => onClick(workspace)}>
      <div className="workspace-image-container">
        {/* Fallback pattern if no image */}
        {imageUrl ? (
          <img src={imageUrl} alt={workspace.name} />
        ) : (
           <div style={{ width: '100%', height: '100%', backgroundColor: '#E4DFD5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C0B7A8' }}>
             <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
               <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
               <line x1="3" y1="9" x2="21" y2="9"></line>
               <line x1="9" y1="21" x2="9" y2="9"></line>
             </svg>
           </div>
        )}
        
        <div className="workspace-badge">
          <span className={`badge-dot ${isOnline ? 'online' : 'offline'}`}></span>
          {isOnline ? `${onlineCount} online` : 'Offline'}
        </div>
      </div>
      
      <div className="workspace-card-footer">
        <div className="workspace-card-text">
          <h4>{workspace.name}</h4>
          <p>Last visited {formattedDate}</p>
        </div>
        <button 
          className="workspace-menu-btn" 
          onClick={(e) => {
            e.stopPropagation();
            // Open context menu (placeholder)
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="12" cy="5" r="1"></circle>
            <circle cx="12" cy="19" r="1"></circle>
          </svg>
        </button>
      </div>
    </div>
  );
}
