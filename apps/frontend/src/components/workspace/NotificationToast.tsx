import { useWorkspaceStore } from "../../store/useWorkspaceStore";

export const NotificationToast = () => {
  const { notification } = useWorkspaceStore();

  if (!notification) return null;

  return (
    <div className="notification-toast">
      {notification}
    </div>
  );
};
