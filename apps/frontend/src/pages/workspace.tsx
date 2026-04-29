import { PhaserGame } from "../components/PhaserGame";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import { useWorkspaceSocket } from "../hooks/useWorkspaceSocket";
import { useWorkspaceCalls } from "../hooks/useWorkspaceCalls";

// Components
import { Header } from "../components/workspace/Header";
import { InfoCard } from "../components/workspace/InfoCard";
import { PlayerDialog } from "../components/workspace/PlayerDialog";
import { CallStatusIndicator } from "../components/workspace/CallStatusIndicator";
import { ActiveCallControls } from "../components/workspace/ActiveCallControls";
import { NotificationToast } from "../components/workspace/NotificationToast";
import { GroupCallControls } from "../components/workspace/GroupCallControls";
import { GroupCallOverlay } from "../components/workspace/GroupCallOverlay";
import { IncomingCallDialog } from "../components/workspace/IncomingCallDialog";
import { Chat } from "../components/workspace/Chat";
import { ZoneMessage } from "../components/workspace/ZoneMessage";

import "./workspace.css";

type Workspace = {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  role?: string | null;
};

interface WorkspaceRoomProps {
  workspace: Workspace;
  displayName: string;
  ownerName: string;
  getToken: () => Promise<string | null>;
  onBack: () => void;
}

export function WorkspaceRoom({
  workspace,
  displayName,
  ownerName,
  getToken,
  onBack,
}: WorkspaceRoomProps) {
  const { activeSocket, isMuted } = useWorkspaceStore();
  
  // Custom hooks for logic
  const { sendMessage } = useWorkspaceSocket(workspace.id, getToken);
  const {
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    startGroupCall,
    joinGroupCall,
    leaveGroupCall,
    toggleMute,
  } = useWorkspaceCalls(getToken);

  return (
    <div className="workspace-container">
      <PhaserGame socket={activeSocket} />
      
      <div className="workspace-ui">
        <Header 
          onBack={onBack} 
          workspaceName={workspace.name} 
          workspaceId={workspace.id} 
          slug={workspace.slug} 
        />

        <InfoCard 
          name={workspace.name} 
          displayName={displayName} 
          ownerName={ownerName} 
        />

        <PlayerDialog onCall={initiateCall} />

        <CallStatusIndicator />

        <ActiveCallControls onEnd={endCall} />

        <NotificationToast />

        <GroupCallControls onStart={startGroupCall} onJoin={joinGroupCall} />

        <GroupCallOverlay onLeave={leaveGroupCall} onToggleMute={() => toggleMute(isMuted)} />

        <IncomingCallDialog onAccept={acceptCall} onDecline={declineCall} />

        <ZoneMessage />

        <Chat onSendMessage={sendMessage} />
      </div>
    </div>
  );
}
