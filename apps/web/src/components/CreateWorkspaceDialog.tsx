import type { FormEvent } from "react";

interface CreateWorkspaceDialogProps {
  isOpen: boolean;
  input: string;
  isSubmitting: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}

export function CreateWorkspaceDialog({
  isOpen,
  input,
  isSubmitting,
  onInputChange,
  onSubmit,
  onClose,
}: CreateWorkspaceDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="dialog-backdrop">
      <form className="dialog" onSubmit={onSubmit}>
        <h3>Create Workspace</h3>
        <input
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder="Workspace name"
        />
        <div className="dialog-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
