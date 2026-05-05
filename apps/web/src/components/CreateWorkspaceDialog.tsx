import type { FormEvent } from "react";
import { useMemo } from "react";
import "../styles/createWorkspace.css";

interface CreateWorkspaceDialogProps {
  isOpen: boolean;
  nameInput: string;
  slugInput: string;
  isSubmitting: boolean;
  onNameChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}

export function CreateWorkspaceDialog({
  isOpen,
  nameInput,
  slugInput,
  isSubmitting,
  onNameChange,
  onSlugChange,
  onSubmit,
  onClose,
}: CreateWorkspaceDialogProps) {
  if (!isOpen) return null;

  const domain = useMemo(() => {
    if (typeof window !== "undefined") {
      return window.location.host;
    }
    return "roommind.com";
  }, []);

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div style={{ position: "relative" }}>
        <div className="workspace-setup-dialog" onClick={(e) => e.stopPropagation()}>
          
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <div className="setup-steps-indicator">
              <div className="step-dash active"></div>
              <div className="step-dash"></div>
              <div className="step-dash"></div>
            </div>
            
            <div className="step-labels">
              <span className="step-label active">Step 1</span>
              <span className="step-label">Step 2</span>
              <span className="step-label">Step 3</span>
            </div>
          </div>

          <div className="setup-icon-box">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
              <path d="M9 22v-4h6v4"></path>
              <path d="M8 6h.01"></path>
              <path d="M16 6h.01"></path>
              <path d="M12 6h.01"></path>
              <path d="M12 10h.01"></path>
              <path d="M12 14h.01"></path>
              <path d="M16 10h.01"></path>
              <path d="M16 14h.01"></path>
              <path d="M8 10h.01"></path>
              <path d="M8 14h.01"></path>
            </svg>
          </div>

          <h2 className="setup-title">Set up your workspace</h2>
          <p className="setup-subtitle">This is your team's virtual office</p>

          <form className="setup-form" onSubmit={onSubmit}>
            <div className="form-group">
              <label className="form-label">Workspace Name</label>
              <input
                className="form-input"
                value={nameInput}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="e.g. Acme Studio"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Workspace URL</label>
              <div className="url-input-wrapper">
                <span className="url-prefix">{domain}/</span>
                <input
                  className="url-input"
                  value={slugInput}
                  onChange={(event) => onSlugChange(event.target.value)}
                  placeholder="my-team"
                />
              </div>
            </div>

            <button type="submit" className="btn-submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create workspace"}
              {!isSubmitting && <span>&rarr;</span>}
            </button>
          </form>

          <div className="setup-footer">
            <div className="team-avatars">
              {/* Placeholder static images simulating faces from the design */}
              <img src="https://i.pravatar.cc/100?img=5" alt="User 1" className="team-avatar" />
              <img src="https://i.pravatar.cc/100?img=33" alt="User 2" className="team-avatar" />
              <div className="team-avatar-more">+12</div>
            </div>
            <span>Invite your team in the next step</span>
          </div>

        </div>

        <div className="dialog-outer-footer">
          Need help? <a href="#" style={{ color: "var(--color-primary)", textDecoration: "none" }}>Visit our documentation</a>
        </div>
      </div>
    </div>
  );
}
