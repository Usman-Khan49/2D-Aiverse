import type { FormEvent } from "react";

interface JoinWorkspaceDialogProps {
  isOpen: boolean;
  input: string;
  isSubmitting: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}

export function JoinWorkspaceDialog({
  isOpen,
  input,
  isSubmitting,
  onInputChange,
  onSubmit,
  onClose,
}: JoinWorkspaceDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="dialog-backdrop">
      <form className="dialog" onSubmit={onSubmit}>
        <h3>Add Workspace</h3>
        <input
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder="Workspace URL, slug, or id"
        />
        <div className="dialog-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add"}
          </button>
        </div>
      </form>
    </div>
  );
}
