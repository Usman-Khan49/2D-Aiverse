import { SignOutButton } from "@clerk/react";

interface DashboardHeaderProps {
  user: any;
  displayName: string;
  onCreateClick: () => void;
}

export function DashboardHeader({ onCreateClick }: DashboardHeaderProps) {
  return (
    <header className="dashboard-navbar">
      <div className="dashboard-nav-left">
        <a href="/" className="dashboard-logo">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="24" height="24" rx="6" fill="#C4714A"/>
              <path d="M7 7H11V11H7V7Z" fill="white"/>
              <path d="M13 7H17V11H13V7Z" fill="white"/>
              <path d="M7 13H11V17H7V13Z" fill="white"/>
              <path d="M13 13H17V17H13V13Z" fill="white"/>
            </svg>
            RoomMind
          </div>
        </a>
      </div>

      <div className="dashboard-nav-right">
        <a href="#" className="nav-link">Resources</a>
        
        <div className="user-profile">
          <SignOutButton>
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                Account
             </div>
          </SignOutButton>
        </div>

        <button className="btn-primary" onClick={onCreateClick}>
          <span>+ Create Workspace</span>
        </button>
      </div>
    </header>
  );
}
