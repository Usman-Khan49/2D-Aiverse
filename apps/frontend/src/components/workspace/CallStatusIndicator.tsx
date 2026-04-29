import { useWorkspaceStore } from "../../store/useWorkspaceStore";

export const CallStatusIndicator = () => {
  const { callStatus } = useWorkspaceStore();

  if (!callStatus) return null;

  return (
    <div className="call-status-bar" style={{
      background: callStatus === "Connected!" ? "#10b981" : "#f59e0b"
    }}>
      {callStatus}
    </div>
  );
};
