import React, { useState, useRef, useEffect } from 'react';
import '../styles/memorySidebar.css';

interface ChatSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    messages: string[];
    onSendMessage: (msg: string) => void;
    currentUserName: string;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ 
    isOpen, 
    onClose, 
    messages,
    onSendMessage,
    currentUserName
}) => {
    const [inputValue, setInputValue] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSend = () => {
        if (!inputValue.trim()) return;
        onSendMessage(inputValue);
        setInputValue('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    return (
        <div className={`memory-sidebar ${isOpen ? 'open' : ''}`} style={{ width: '400px' }}>
            <div className="memory-header">
                <button className="memory-back-btn" onClick={onClose}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
                <h2>Room Chat</h2>
            </div>

            <div className="memory-content" ref={scrollRef} style={{ display: 'flex', flexDirection: 'column', padding: '16px' }}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#a0aec0', marginTop: '20px', fontSize: '13px' }}>
                        No messages yet. Say hello!
                    </div>
                )}

                {messages.map((msg, idx) => {
                    const isSystem = false; // Add system msg feature if needed in the future
                    
                    return (
                        <div key={idx} style={{ 
                            marginBottom: '12px',
                            background: 'var(--color-surface)',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: '1px solid var(--color-border)'
                        }}>
                            <div style={{ fontSize: '14px', color: 'var(--color-text)', wordBreak: 'break-word' }}>
                                {msg}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ padding: '16px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '8px' }}>
                <input 
                    type="text" 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    style={{
                        flex: 1,
                        padding: '10px 14px',
                        background: 'var(--color-tertiary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        color: 'var(--color-text)',
                        outline: 'none'
                    }}
                />
                <button 
                    onClick={handleSend}
                    style={{
                        background: 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        width: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </div>
        </div>
    );
};