import React, { useEffect, useState } from 'react';
import { API_BASE } from '../utils/config';

interface SummaryListItem {
    id: string;
    sessionId: string;
    createdAt: string;
    raw: any;
    session: {
        startedAt: string;
        areaTag: string;
    }
}

interface KnowledgeLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    getToken: () => Promise<string | null>;
    onSelectSummary: (sessionId: string) => void;
}

export const KnowledgeLibraryModal: React.FC<KnowledgeLibraryModalProps> = ({ 
    isOpen, 
    onClose, 
    workspaceId, 
    getToken,
    onSelectSummary 
}) => {
    const [summaries, setSummaries] = useState<SummaryListItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && workspaceId) {
            fetchSummaries();
        }
    }, [isOpen, workspaceId]);

    const fetchSummaries = async () => {
        setLoading(true);
        const token = await getToken();

        
        try {
            const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/summaries`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                credentials: "include",
            });
            
            if (!response.ok) throw new Error("Failed to fetch summaries");
            const data = await response.json();
            setSummaries(data.summaries || []);
        } catch (err) {
            console.error("Error fetching library summaries:", err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9000,
            padding: '20px',
            animation: 'fadeIn 0.3s ease-out'
        }}>
            <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                width: '100%',
                maxWidth: '700px',
                maxHeight: '80vh',
                borderRadius: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px 32px',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#111827' }}>📚 Knowledge Library</h2>
                        <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '0.9rem' }}>Access all recorded meeting summaries and project insights.</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#9ca3af' }}>&times;</button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading archive...</div>
                    ) : summaries.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📦</div>
                            <p>No summaries found in this workspace yet.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {summaries.map((item) => {
                                const aiData = item.raw || {};
                                const title = aiData.title || `Meeting on ${new Date(item.session.startedAt).toLocaleDateString()}`;
                                const date = new Date(item.session.startedAt).toLocaleDateString('en-US', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });

                                return (
                                    <div 
                                        key={item.id}
                                        onClick={() => onSelectSummary(item.sessionId)}
                                        style={{
                                            padding: '20px',
                                            borderRadius: '16px',
                                            border: '1px solid #e5e7eb',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            backgroundColor: '#fff',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = '#6366f1';
                                            e.currentTarget.style.backgroundColor = '#f5f7ff';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = '#e5e7eb';
                                            e.currentTarget.style.backgroundColor = '#fff';
                                        }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontWeight: 600, color: '#111827', fontSize: '1.05rem' }}>{title}</span>
                                            <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>🗓️ {date}</span>
                                        </div>
                                        <div style={{ color: '#6366f1', fontWeight: 600, fontSize: '0.9rem' }}>
                                            View Details &rarr;
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '20px 32px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                        onClick={onClose}
                        style={{ padding: '10px 24px', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        Close
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};
