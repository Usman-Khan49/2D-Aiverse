import { SignOutButton } from "@clerk/react";

interface DashboardHeaderProps {
  user: any;
  displayName: string;
  onAddClick: () => void;
}

export function DashboardHeader({ user, displayName, onAddClick }: DashboardHeaderProps) {
  return (
    <header className="dashboard-header">
      <div className="user-group">
        {user?.imageUrl ? (
          <img className="avatar" src={user.imageUrl} alt="User avatar" />
        ) : (
          <div className="avatar" aria-hidden="true" />
        )}
        <span className="username">{displayName}</span>
      </div>

      <div className="header-actions">
        <button className="add-btn" onClick={onAddClick}>
          <span className="plus">+</span>
          <span>Add</span>
        </button>
        <SignOutButton>
          <button className="signout-btn" type="button">
            Sign out
          </button>
        </SignOutButton>
      </div>
    </header>
  );
}
