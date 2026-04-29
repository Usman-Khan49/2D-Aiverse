import { useWorkspaceStore } from "../../store/useWorkspaceStore";

interface PlayerDialogProps {
  onCall: (id: string) => void;
}

export const PlayerDialog = ({ onCall }: PlayerDialogProps) => {
  const { selectedPlayerId, setSelectedPlayerId } = useWorkspaceStore();

  if (!selectedPlayerId) return null;

  return (
    <div className="player-dialog">
      <div className="dialog-header">
        <h3 style={{ margin: 0, fontSize: "1.1em" }}>Player Selected</h3>
        <button 
          onClick={() => setSelectedPlayerId(null)}
          className="close-button"
        >
          &times;
        </button>
      </div>
      <p style={{ margin: 0, fontSize: "0.9em", color: "#666" }}>
        ID: {selectedPlayerId.substring(0, 15)}...
      </p>
      <button
        onClick={() => onCall(selectedPlayerId)}
        className="call-button"
      >
        <span style={{ fontSize: "1.2em" }}>📞</span> Call Player
      </button>
    </div>
  );
};
