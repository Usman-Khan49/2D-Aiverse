import { useWorkspaceStore } from "../../store/useWorkspaceStore";

interface GroupCallOverlayProps {
  onLeave: () => void;
  onToggleMute: () => void;
}

export const GroupCallOverlay = ({ onLeave, onToggleMute }: GroupCallOverlayProps) => {
  const { amInGroupCall, groupCallParticipants, isMuted } = useWorkspaceStore();

  if (!amInGroupCall) return null;

  return (
    <div className="group-overlay">
      <h3 style={{ margin: 0, color: "white", textAlign: "center" }}>
        Group Call ({groupCallParticipants.length})
      </h3>
      
      <div className="participant-grid">
        <div className="participant-card local">
          <span className="participant-name">YOU</span>
          {isMuted && <span className="mute-indicator">🔇</span>}
        </div>

        {groupCallParticipants.filter(id => id !== "pending").map((userId, i) => (
          <div key={i} className="participant-card">
            <span className="participant-name">
              {userId.substring(0, 2).toUpperCase()}
            </span>
          </div>
        ))}
      </div>

      <div className="overlay-controls">
        <button
          onClick={onToggleMute}
          className="control-button"
          style={{ background: isMuted ? "#ef4444" : "#4b5563" }}
        >
          {isMuted ? "Unmute" : "Mute"}
        </button>
        
        <button
          onClick={onLeave}
          className="control-button"
          style={{ background: "#ef4444" }}
        >
          Hang up
        </button>
      </div>
    </div>
  );
};
