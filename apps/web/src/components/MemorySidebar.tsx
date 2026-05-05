import React, { useState, useRef, useEffect } from 'react';
import { API_BASE } from '../utils/config';
import '../styles/memorySidebar.css';

interface Source {
    sessionId: string;
    sourceType: string;
    similarity: number;
    wordOffset: number | null;
    preview: string;
    date?: string; // We'll mock date if not provided
}

interface ChatMessage {
    role: 'user' | 'ai';
    content: string;
    sources?: Source[];
    title?: string;
}

interface MemorySidebarProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    getToken: () => Promise<string | null>;
    onViewSource: (sessionId: string, wordOffset: number | null) => void;
}

export const MemorySidebar: React.FC<MemorySidebarProps> = ({ 
    isOpen, 
    onClose, 
    workspaceId, 
    getToken, 
    onViewSource 
}) => {
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [scope, setScope] = useState<'workspace' | 'session'>('workspace');
    
    const scrollRef = useRef<HTMLDivElement>(null);

    // Keep track of previous questions
    const previousQuestions = messages.filter(m => m.role === 'user').map(m => m.content);
    // Let's ensure we have a few if empty just for the UI feel, or just show real ones.
    const displayQuestions = previousQuestions.length > 0 
      ? Array.from(new Set(previousQuestions)).slice(-4) 
      : [];

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
            
            // Try to extract a title from the answer (like the first sentence or bullet point)
            let title = "Meeting Insight";
            let content = data.answer;
            const lines = content.split('\n');
            if (lines.length > 1 && lines[0].length < 50) {
                title = lines[0].replace(/^[#*-\s]+/, '');
                content = lines.slice(1).join('\n').trim();
            }

            setMessages(prev => [...prev, { 
                role: 'ai', 
                title: title,
                content: content,
                sources: data.sources 
            }]);
        } catch (err) {
            console.error("Chat error:", err);
            setMessages(prev => [...prev, { role: 'ai', title: 'Error', content: "Sorry, I encountered an error while searching your meeting history." }]);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = () => {
        const d = new Date();
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className={`memory-sidebar ${isOpen ? 'open' : ''}`}>
            <div className="memory-header">
                <button className="memory-back-btn" onClick={onClose}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
                <h2>Meeting Memory</h2>
            </div>

            <div className="memory-tabs">
                <button 
                    className={`memory-tab ${scope === 'workspace' ? 'active' : ''}`}
                    onClick={() => setScope('workspace')}
                >
                    This workspace
                </button>
                <button 
                    className={`memory-tab ${scope === 'session' ? 'active' : ''}`}
                    onClick={() => setScope('session')}
                >
                    This session
                </button>
            </div>

            <div className="memory-content" ref={scrollRef}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#a0aec0', marginTop: '20px', fontSize: '13px' }}>
                        Ask a question about past meetings to get insights and action items.
                    </div>
                )}

                {messages.map((msg, idx) => {
                    if (msg.role === 'user') {
                        return (
                            <div key={idx} className="user-message">
                                {msg.content}
                            </div>
                        );
                    } else {
                        return (
                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div className="ai-message-block">
                                    {msg.title && <h3 className="ai-message-title">{msg.title}</h3>}
                                    <div className="ai-message-content">
                                        {msg.content.split('\n').map((line, i) => {
                                            if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
                                                return <li key={i}>{line.replace(/^[-*]\s*/, '')}</li>;
                                            }
                                            return <p key={i} style={{ margin: i === 0 ? 0 : '8px 0 0 0' }}>{line}</p>;
                                        })}
                                    </div>
                                </div>

                                {msg.sources && msg.sources.length > 0 && (
                                    <div>
                                        <h4 className="memory-section-title">SOURCES</h4>
                                        <div className="sources-list">
                                            {msg.sources.map((src, sIdx) => (
                                                <div 
                                                    key={sIdx} 
                                                    className="source-item"
                                                    onClick={() => onViewSource(src.sessionId, src.wordOffset)}
                                                >
                                                    <span className="source-date">{src.date || formatDate()}</span>
                                                    <span className="source-type">
                                                        {src.sourceType === 'summary' ? 'Meeting Summary' : 'Meeting Area'} · {Math.round(src.similarity * 100)}% Match
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    }
                })}

                {loading && (
                    <div className="typing-indicator">
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                    </div>
                )}

                {displayQuestions.length > 0 && !loading && messages[messages.length - 1]?.role === 'ai' && (
                    <div>
                        <h4 className="memory-section-title">PREVIOUS QUESTIONS</h4>
                        <div className="prev-questions-list">
                            {displayQuestions.map((q, qIdx) => (
                                <div 
                                    key={qIdx} 
                                    className="prev-question"
                                    onClick={() => {
                                        setQuery(q);
                                        // Optional: immediately send
                                    }}
                                >
                                    {q}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="memory-input-area">
                <div className="memory-input-wrapper">
                    <input 
                        type="text" 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') handleSend();
                        }}
                        onKeyUp={(e) => e.stopPropagation()}
                        placeholder="What did we decide about pricing?" 
                    />
                    <button 
                        className="memory-send-btn"
                        onClick={handleSend}
                        disabled={!query.trim() || loading}
                    >
                        send
                    </button>
                </div>
            </div>
        </div>
    );
};
