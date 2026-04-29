import { useWorkspaceStore } from "../../store/useWorkspaceStore";

interface GroupCallControlsProps {
  onStart: () => void;
  onJoin: () => void;
}

export const GroupCallControls = ({ onStart, onJoin }: GroupCallControlsProps) => {
  const { isMeetingZone, groupCallActive, amInGroupCall } = useWorkspaceStore();

  return (
    <div className="group-controls">
      <button
        onClick={onStart}
        disabled={!isMeetingZone || groupCallActive || amInGroupCall}
        className="group-button"
        style={{ background: "#10b981" }}
      >
        Start Group Call
      </button>

      <button
        onClick={onJoin}
        disabled={!isMeetingZone || !groupCallActive || amInGroupCall}
        className="group-button"
        style={{ background: "#3b82f6" }}
      >
        Join Group Call
      </button>
    </div>
  );
};
