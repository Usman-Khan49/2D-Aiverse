import { useWorkspaceStore } from "../../store/useWorkspaceStore";

interface HeaderProps {
  onBack: () => void;
  workspaceName: string;
  workspaceId: string;
  slug?: string;
}

export const Header = ({ onBack, workspaceId, slug }: HeaderProps) => {
  const { connectionStatus, copied, setCopied } = useWorkspaceStore();

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/workspaces/${slug || workspaceId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  return (
    <div className="ui-header">
      <button onClick={onBack} className="back-button">
        &larr; Back to Dashboard
      </button>
      
      <div className="header-right">
        <div className="status-badge">
          <strong>Status:</strong>{" "}
          <span style={{
            color: connectionStatus === "connected" ? "#10b981" :
              connectionStatus === "connecting" ? "#f59e0b" : "#ef4444",
            fontWeight: "bold"
          }}>
            {connectionStatus.toUpperCase()}
          </span>
        </div>
        
        <button onClick={handleShare} className="share-button">
          {copied ? "Copied Link!" : "Share Link \u279a"}
        </button>
      </div>
    </div>
  );
};
