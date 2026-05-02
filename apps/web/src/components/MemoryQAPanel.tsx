import React, { useState, useRef, useEffect } from 'react';
import { API_BASE } from '../utils/config';

interface Source {
    sessionId: string;
    sourceType: string;
    similarity: number;
    wordOffset: number | null;
    preview: string;
}

interface ChatMessage {
    role: 'user' | 'ai';
    content: string;
    sources?: Source[];
}

interface MemoryQAPanelProps {
    workspaceId: string;
    getToken: () => Promise<string | null>;
    onViewSource: (sessionId: string, wordOffset: number | null) => void;
}

export const MemoryQAPanel: React.FC<MemoryQAPanelProps> = ({ workspaceId, getToken, onViewSource }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [scope, setScope] = useState<'workspace' | 'session'>('workspace');
    
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!query.trim() || loading) return;

        const userMsg = query;
        setQuery('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            const token = await getToken();
            
            const response = await fetch(`${API_BASE}/chat/${workspaceId}/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    question: userMsg,
                    scope: scope
                }),
                credentials: "include"
            });

            if (!response.ok) throw new Error("Failed to fetch answer");
            
            const data = await response.json();
            setMessages(prev => [...prev, { 
                role: 'ai', 
                content: data.answer,
                sources: data.sources 
            }]);
        } catch (err) {
            console.error("Chat error:", err);
            setMessages(prev => [...prev, { role: 'ai', content: "Sorry, I encountered an error while searching your meeting history." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Toggle Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: '#6366f1',
                    color: 'white',
                    border: 'none',
                    boxShadow: '0 10px 25px rgba(99, 102, 241, 0.4)',
                    cursor: 'pointer',
                    zIndex: 8000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
                {isOpen ? '✕' : '💬'}
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    bottom: '90px',
                    right: '20px',
                    width: '400px',
                    height: '600px',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '24px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    zIndex: 8000,
                    animation: 'slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}>
                    {/* Header */}
                    <div style={{ 
                        padding: '20px', 
                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                        color: 'white'
                    }}>
                        <h3 style={{ margin: 0 }}>RoomMind Assistant</h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', opacity: 0.9 }}>Searching meeting history...</p>
                    </div>

                    {/* Scope Toggle */}
                    <div style={{ padding: '10px 20px', backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '10px' }}>
                        <select 
                            value={scope} 
                            onChange={(e: any) => setScope(e.target.value)}
                            style={{ 
                                padding: '4px 8px', 
                                borderRadius: '6px', 
                                border: '1px solid #d1d5db',
                                fontSize: '0.8rem',
                                outline: 'none'
                            }}
                        >
                            <option value="workspace">Entire Workspace</option>
                            <option value="session">This Session Only</option>
                        </select>
                    </div>

                    {/* Messages */}
                    <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {messages.length === 0 && (
                            <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: '40px' }}>
                                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🤖</div>
                                <p>Ask me anything about your previous meetings, decisions, or action items.</p>
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div key={i} style={{ 
                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '85%'
                            }}>
                                <div style={{
                                    padding: '12px 16px',
                                    borderRadius: msg.role === 'user' ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                                    backgroundColor: msg.role === 'user' ? '#6366f1' : '#f3f4f6',
                                    color: msg.role === 'user' ? 'white' : '#1f2937',
                                    fontSize: '0.95rem',
                                    lineHeight: 1.4,
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                                }}>
                                    {msg.content}
                                </div>
                                {msg.sources && msg.sources.length > 0 && (
                                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600 }}>SOURCES:</p>
                                        {msg.sources.map((source, si) => (
                                            <div 
                                                key={si}
                                                onClick={() => onViewSource(source.sessionId, source.wordOffset)}
                                                style={{
                                                    fontSize: '0.75rem',
                                                    padding: '8px',
                                                    backgroundColor: '#fff',
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#6366f1'}
                                                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                                            >
                                                <div style={{ fontWeight: 600, color: '#4338ca' }}>
                                                    {source.sourceType === 'summary' ? '📋 Summary' : '🗣 Transcript'} · {Math.round(source.similarity * 100)}% Match
                                                </div>
                                                <div style={{ color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {source.preview}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {loading && (
                            <div style={{ alignSelf: 'flex-start', padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '18px', display: 'flex', gap: '4px' }}>
                                <div className="dot" style={{ width: '6px', height: '6px', backgroundColor: '#9ca3af', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out' }}></div>
                                <div className="dot" style={{ width: '6px', height: '6px', backgroundColor: '#9ca3af', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out 0.2s' }}></div>
                                <div className="dot" style={{ width: '6px', height: '6px', backgroundColor: '#9ca3af', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out 0.4s' }}></div>
                            </div>
                        )}
                    </div>

                    <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '10px' }}>
                        <input 
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Enter') handleSend();
                            }}
                            placeholder="Ask a question..."
                            style={{
                                flex: 1,
                                padding: '12px 16px',
                                borderRadius: '12px',
                                border: '1px solid #e5e7eb',
                                outline: 'none',
                                fontSize: '0.95rem'
                            }}
                        />
                        <button 
                            onClick={handleSend}
                            style={{
                                width: '45px',
                                height: '45px',
                                borderRadius: '12px',
                                backgroundColor: '#6366f1',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            ➔
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes bounce {
                    0%, 80%, 100% { transform: scale(0); }
                    40% { transform: scale(1.0); }
                }
                @keyframes slideIn {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </>
    );
};
