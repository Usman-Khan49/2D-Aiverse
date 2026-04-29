import { useWorkspaceStore } from "../../store/useWorkspaceStore";

export const ZoneMessage = () => {
  const { zoneMessage, zonePlayerCount } = useWorkspaceStore();

  if (!zoneMessage) return null;

  return (
    <div className="zone-message-overlay">
      <div className="zone-title">{zoneMessage}</div>
      <div className="zone-player-count">
        <span className="count-indicator"></span>
        {zonePlayerCount} {zonePlayerCount === 1 ? "person" : "people"} in call
      </div>
    </div>
  );
};
