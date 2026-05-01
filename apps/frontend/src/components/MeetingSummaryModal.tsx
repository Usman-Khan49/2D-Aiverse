import React from 'react';

interface TranscriptSegment {
    speaker: string;
    text: string;
    timestamp: string;
}

interface SummaryData {
    summary: {
        title: string;
        overview: string;
        keyPoints: string[];
        actionItems: string[];
        sentiment?: string;
    };
    transcript: TranscriptSegment[];
}

interface MeetingSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: SummaryData | null;
}

export const MeetingSummaryModal: React.FC<MeetingSummaryModalProps> = ({ isOpen, onClose, data }) => {
    if (!isOpen || !data) return null;

    const { summary, transcript } = data;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
            animation: 'fadeIn 0.3s ease-out'
        }}>
            <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                width: '100%',
                maxWidth: '900px',
                maxHeight: '90vh',
                borderRadius: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px 32px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>✨ Meeting Recap</h2>
                        <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '0.9rem' }}>{summary.title || "AI Generated Summary"}</p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255, 255, 255, 0.2)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'white',
                            fontSize: '20px',
                            transition: 'all 0.2s'
                        }}
                    >
                        &times;
                    </button>
                </div>

                {/* Content */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '32px',
                    display: 'grid',
                    gridTemplateColumns: '1.5fr 1fr',
                    gap: '32px'
                }}>
                    {/* Left Column: Summary & Insights */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <section>
                            <h3 style={{ fontSize: '1.1rem', color: '#1f2937', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                📝 Overview
                            </h3>
                            <p style={{ color: '#4b5563', lineHeight: 1.6, fontSize: '1rem' }}>
                                {summary?.overview || "No overview available."}
                            </p>
                        </section>

                        <section>
                            <h3 style={{ fontSize: '1.1rem', color: '#1f2937', marginBottom: '12px' }}>💡 Key Points</h3>
                            <ul style={{ paddingLeft: '20px', margin: 0, color: '#4b5563' }}>
                                {summary?.keyPoints?.map?.((point: string, i: number) => (
                                    <li key={i} style={{ marginBottom: '8px', lineHeight: 1.5 }}>{point}</li>
                                )) || <li>No key points identified.</li>}
                            </ul>
                        </section>

                        {summary?.actionItems && summary.actionItems.length > 0 && (
                            <section style={{
                                backgroundColor: '#f5f3ff',
                                padding: '20px',
                                borderRadius: '16px',
                                border: '1px solid #ddd6fe'
                            }}>
                                <h3 style={{ fontSize: '1.1rem', color: '#5b21b6', marginBottom: '12px', marginTop: 0 }}>✅ Action Items</h3>
                                <ul style={{ paddingLeft: '20px', margin: 0, color: '#6d28d9' }}>
                                    {summary.actionItems.map?.((item: string, i: number) => (
                                        <li key={i} style={{ marginBottom: '8px', fontWeight: 500 }}>{item}</li>
                                    )) || <li>No action items found.</li>}
                                </ul>
                            </section>
                        )}
                    </div>

                    {/* Right Column: Transcript Snippet */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        backgroundColor: '#f9fafb',
                        padding: '20px',
                        borderRadius: '16px',
                        border: '1px solid #e5e7eb'
                    }}>
                        <h3 style={{ fontSize: '1rem', color: '#1f2937', margin: 0 }}>🗣 Transcript</h3>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            fontSize: '0.9rem',
                            maxHeight: '400px',
                            overflowY: 'auto'
                        }}>
                            {transcript?.map?.((seg: any, i: number) => (
                                <div key={i} style={{ borderLeft: '3px solid #6366f1', paddingLeft: '12px' }}>
                                    <div style={{ fontWeight: 700, color: '#4338ca', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                                        {seg.speaker}
                                    </div>
                                    <div style={{ color: '#374151' }}>{seg.text}</div>
                                </div>
                            )) || <div>No transcript data.</div>}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '20px 32px',
                    borderTop: '1px solid #e5e7eb',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    justifyContent: 'flex-end'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 24px',
                            backgroundColor: '#1f2937',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleUp {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};
