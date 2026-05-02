interface StatusMessagesProps {
  error: string | null;
  success: string | null;
  loadingMembers?: boolean;
}

export function StatusMessages({ error, success, loadingMembers }: StatusMessagesProps) {
  return (
    <>
      {error ? <div className="status error">{error}</div> : null}
      {success ? <div className="status success">{success}</div> : null}
      {loadingMembers ? <div className="status">Loading workspace...</div> : null}
    </>
  );
}
