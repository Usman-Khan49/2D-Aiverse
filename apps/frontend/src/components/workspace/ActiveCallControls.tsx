import { useWorkspaceStore } from "../../store/useWorkspaceStore";

interface ActiveCallControlsProps {
  onEnd: (id: string) => void;
}

export const ActiveCallControls = ({ onEnd }: ActiveCallControlsProps) => {
  const { activeCallUserId } = useWorkspaceStore();

  if (!activeCallUserId) return null;

  return (
    <div className="active-call-controls">
      <button
        onClick={() => onEnd(activeCallUserId)}
        className="end-call-button"
      >
        End Call
      </button>
    </div>
  );
};
