import { useWorkspaceStore } from "../../store/useWorkspaceStore";

interface ChatProps {
  onSendMessage: (msg: string) => void;
}

export const Chat = ({ onSendMessage }: ChatProps) => {
  const { messages, inputMessage, setInputMessage, connectionStatus } = useWorkspaceStore();

  const handleSend = () => {
    onSendMessage(inputMessage);
    setInputMessage("");
  };

  return (
    <div className="chat-container">
      <h3>Chat</h3>
      <div className="messages-list">
        {messages.length === 0 && <p className="no-messages">No messages yet...</p>}
        {messages.map((msg, index) => (
          <div key={index} className="message-item">
            <p>{msg}</p>
          </div>
        ))}
      </div>
      <div className="chat-input-row">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
        />
        <button 
          onClick={handleSend} 
          disabled={connectionStatus !== "connected"}
        >
          Send
        </button>
      </div>
    </div>
  );
};
