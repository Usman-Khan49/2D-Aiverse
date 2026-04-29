interface InfoCardProps {
  name: string;
  displayName: string;
  ownerName: string;
}

export const InfoCard = ({ name, displayName, ownerName }: InfoCardProps) => {
  return (
    <div className="info-card">
      <h2>{name}</h2>
      <div className="info-details">
        <p><strong>User:</strong> {displayName}</p>
        <p><strong>Owner:</strong> {ownerName || "Loading..."}</p>
      </div>
    </div>
  );
};
