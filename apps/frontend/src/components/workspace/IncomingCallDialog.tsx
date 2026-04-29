import { useWorkspaceStore } from "../../store/useWorkspaceStore";

interface IncomingCallDialogProps {
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}

export const IncomingCallDialog = ({ onAccept, onDecline }: IncomingCallDialogProps) => {
  const { incomingCallUserId } = useWorkspaceStore();

  if (!incomingCallUserId) return null;

  return (
    <div className="incoming-call-dialog">
      <div className="incoming-header">
        <h3 style={{ margin: 0, fontSize: "1.2em", color: "#1f2937" }}>Incoming Call 📞</h3>
        <p style={{ margin: "5px 0", fontSize: "0.9em", color: "#666" }}>
          Player: {incomingCallUserId.substring(0, 15)}...
        </p>
      </div>
      
      <div className="action-buttons">
        <button onClick={() => onAccept(incomingCallUserId)} className="accept-button">
          Accept
        </button>
        <button onClick={() => onDecline(incomingCallUserId)} className="decline-button">
          Decline
        </button>
      </div>
    </div>
  );
};
