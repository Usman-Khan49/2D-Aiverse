import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import "../styles/createWorkspace.css";
import type { Workspace } from "../store/useDashboardStore";

interface CreateWorkspacePageProps {
  step: number;
  setStep: (step: number) => void;
  nameInput: string;
  slugInput: string;
  isSubmitting: boolean;
  onNameChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  workspace: Workspace | null;
  onEnterOffice: () => void;
}

interface TeamMember {
  email: string;
  role: "Member" | "Admin";
}

export function CreateWorkspacePage({
  step,
  setStep,
  nameInput,
  slugInput,
  isSubmitting,
  onNameChange,
  onSlugChange,
  onSubmit,
  onCancel,
  workspace,
  onEnterOffice,
}: CreateWorkspacePageProps) {
  const domain = useMemo(() => {
    if (typeof window !== "undefined") {
      return window.location.host;
    }
    return "roommind.com";
  }, []);

  const [emailInput, setEmailInput] = useState("");
  const [members, setMembers] = useState<TeamMember[]>([]);

  const handleAddMember = () => {
    if (emailInput && emailInput.includes("@")) {
      setMembers([...members, { email: emailInput, role: "Member" }]);
      setEmailInput("");
    }
  };

  const handleRemoveMember = (idx: number) => {
    setMembers(members.filter((_, i) => i !== idx));
  };

  const handleCopyInvite = () => {
    if (workspace?.slug) {
      navigator.clipboard.writeText(`${domain}/${workspace.slug}`);
      alert("Invite link copied to clipboard!");
    }
  };

  return (
    <div className="create-page-layout">
      {/* Top close button */}
      <div className="page-close-nav">
        <button onClick={onCancel} className="btn-close-page">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div className="workspace-setup-dialog">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="setup-steps-indicator">
            <div className={`step-dash ${step >= 1 ? 'active' : ''}`}></div>
            <div className={`step-dash ${step >= 2 ? 'active-brown' : ''}`}></div>
            <div className={`step-dash ${step >= 3 ? 'active-gray' : ''}`}></div>
          </div>

          <div className="step-labels">
            <span className={`step-label ${step === 1 ? 'active-green' : 'completed'}`}>Step 1</span>
            <span className={`step-label ${step === 2 ? 'active-brown' : step > 2 ? 'completed' : ''}`}>Step 2</span>
            <span className={`step-label ${step === 3 ? 'active-gray' : ''}`}>Step 3</span>
          </div>
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <>
            <div className="setup-icon-box">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                <path d="M9 22v-4h6v4"></path>
                <path d="M8 6h.01"></path><path d="M16 6h.01"></path>
                <path d="M12 6h.01"></path><path d="M12 10h.01"></path>
                <path d="M12 14h.01"></path><path d="M16 10h.01"></path>
                <path d="M16 14h.01"></path><path d="M8 10h.01"></path>
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
                <img src="https://i.pravatar.cc/100?img=5" alt="User 1" className="team-avatar" />
                <img src="https://i.pravatar.cc/100?img=33" alt="User 2" className="team-avatar" />
                <div className="team-avatar-more">+12</div>
              </div>
              <span>Invite your team in the next step</span>
            </div>
          </>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <>
            <h2 className="setup-title">Invite your team</h2>
            <p className="setup-subtitle" style={{ marginBottom: "24px" }}>
              Collaborate in real-time by adding your<br />team members to the workspace.
            </p>

            <div className="setup-form">
              <div className="form-group">
                <label className="form-label">Team Member Email</label>
                <div className="add-member-input-row">
                  <div className="email-input-wrapper">
                    <span className="email-icon">@</span>
                    <input 
                      type="email" 
                      placeholder="colleague@company.com" 
                      className="email-input" 
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                    />
                  </div>
                  <button className="btn-add-member" onClick={handleAddMember}>Add</button>
                </div>
              </div>

              <div className="members-list">
                {members.map((member, idx) => (
                  <div key={idx} className="member-list-item">
                    <div className="member-info">
                      <div className={`member-avatar-initial ${member.email[0].toLowerCase()}`}>
                        {member.email[0].toUpperCase()}
                      </div>
                      <span className="member-email">{member.email}</span>
                    </div>
                    <div className="member-actions">
                      <span className="member-role-static">{member.role} v</span>
                      <button className="btn-remove-member" onClick={() => handleRemoveMember(idx)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button className="btn-submit" onClick={() => setStep(3)}>
                Send invites
              </button>
              
              <div style={{ textAlign: "center", marginTop: "16px" }}>
                <button 
                  className="btn-skip-link" 
                  onClick={() => setStep(3)}
                >
                  I'll do this later
                </button>
              </div>
            </div>
            
            <div className="step2-bottom-avatars">
               <div className="mock-polaroid-avatars">
                  <div className="polaroid pol-1"><img src="https://i.pravatar.cc/100?img=5" alt="U1" /></div>
                  <div className="polaroid pol-2"><img src="https://i.pravatar.cc/100?img=33" alt="U2" /></div>
                  <div className="polaroid pol-3"><img src="https://i.pravatar.cc/100?img=21" alt="U3" /></div>
                  <div className="polaroid pol-4">+</div>
               </div>
            </div>
          </>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            
            <div className="setup-icon-box step3-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                <path d="M9 22v-4h6v4"></path>
                <circle cx="12" cy="10" r="1"></circle>
                <circle cx="8" cy="10" r="1"></circle>
                <circle cx="16" cy="10" r="1"></circle>
              </svg>
              <div className="step3-dots">
                <span></span><span></span><span></span>
              </div>
            </div>

            <h2 className="setup-title" style={{ marginTop: '24px' }}>Your office is ready</h2>
            <p className="setup-subtitle" style={{ textAlign: "center", marginBottom: "40px" }}>
              Start exploring your workspace or invite more teammates to<br/>begin collaborating in real-time.
            </p>

            <div className="step3-actions-grid">
              <div className="step3-action-card" onClick={handleCopyInvite}>
                <div className="action-icon action-icon-red">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                </div>
                <div className="action-text">
                  <h4>Invite Teammates</h4>
                  <p>Grow your digital culture</p>
                </div>
              </div>
            </div>

            <button className="btn-submit" style={{ marginTop: "40px", maxWidth: "250px" }} onClick={onEnterOffice}>
              Enter office <span>&rarr;</span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
}