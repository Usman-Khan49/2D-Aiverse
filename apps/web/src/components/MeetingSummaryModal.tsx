import React, { useState, useEffect } from 'react';
import '../styles/meetingSummaryModal.css';

interface TranscriptSegment {
    speaker: string;
    text: string;
    timestamp: string;
}

interface SummaryData {
    summary: {
        title: string;
        overview?: string;
        keyPoints?: string[];
        decisions?: string[];
        openQuestions?: string[];
        risks?: string[];
        actionItems?: string[];
        actionItemsDetailed?: {
            task: string;
            priority: 'High' | 'Medium' | 'Low';
        }[];
        sentiment?: string;
        duration?: string;
        date?: string;
        startedAt?: string;
        attendeesCount?: number;
    };
    transcript: TranscriptSegment[];
}

interface MeetingSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: SummaryData | null;
    highlightOffset?: number | null;
}

export const MeetingSummaryModal: React.FC<MeetingSummaryModalProps> = ({ isOpen, onClose, data, highlightOffset }) => {
    const [activeTab, setActiveTab] = useState<'Summary' | 'Transcript' | 'Action Items'>('Summary');

    useEffect(() => {
        if (isOpen && activeTab === 'Transcript' && highlightOffset !== null && highlightOffset !== undefined) {
            setTimeout(() => {
                const el = document.getElementById('highlighted-segment');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 500);
        }
    }, [isOpen, activeTab, highlightOffset]);

    if (!isOpen || !data) return null;

    const { summary, transcript } = data;

    // Fallbacks to closely match the requested style if backend data doesn't have it yet
    const decisions = summary.decisions || summary.keyPoints?.slice(0, 2) || [];
    const openQuestions = summary.openQuestions || summary.keyPoints?.slice(2, 4) || [];
    const risks = summary.risks || [];
    
    // Map existing action items text to detailed format, or empty if none
    const actionItems = summary.actionItemsDetailed || summary.actionItems?.map(task => ({ task, priority: 'Medium' as const })) || [];

    const meetingDateObj = summary.startedAt ? new Date(summary.startedAt) : new Date();
    const displayDate = meetingDateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const displayTime = meetingDateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    return (
        <div className="summary-modal-overlay" onClick={onClose}>
            <div className="summary-modal-content" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="summary-modal-header">
                    <div className="summary-modal-header-top">
                        <span className="summary-tag">Meeting Area</span>
                        <div className="summary-header-actions">
                            <button className="action-btn-outline">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 4}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                Export
                            </button>
                            <button className="action-btn-solid">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 4}}><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                                Share
                            </button>
                            <button className="btn-close" onClick={onClose}>&times;</button>
                        </div>
                    </div>

                    <div className="summary-title-row">
                        <div>
                            <h2 className="summary-title">{summary.title || "AI Generated Summary"}</h2>
                            <p className="summary-meta">{displayDate} &middot; {displayTime}</p>
                        </div>
                        <div className="summary-attendees-cluster">
                            <div className="avatar-group">
                                <div className="avatar-bubbles">
                                    <div className="avatar-bubble" style={{ backgroundImage: 'url(https://api.dicebear.com/7.x/avataaars/svg?seed=Felix)' }}></div>
                                    <div className="avatar-bubble" style={{ backgroundImage: 'url(https://api.dicebear.com/7.x/avataaars/svg?seed=Jude)' }}></div>
                                    <div className="avatar-bubble" style={{ backgroundImage: 'url(https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah)' }}></div>
                                </div>
                                <span className="avatar-extras">+{summary.attendeesCount || 4} others</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="summary-tabs">
                    <button className={`summary-tab ${activeTab === 'Summary' ? 'active' : ''}`} onClick={() => setActiveTab('Summary')}>Summary</button>
                    <button className={`summary-tab ${activeTab === 'Transcript' ? 'active' : ''}`} onClick={() => setActiveTab('Transcript')}>Transcript</button>
                    <button className={`summary-tab ${activeTab === 'Action Items' ? 'active' : ''}`} onClick={() => setActiveTab('Action Items')}>Action Items</button>
                </div>

                {/* Content Body */}
                <div className="summary-modal-body">
                    {activeTab === 'Summary' && (
                        <>
                            {decisions.length > 0 && (
                                <div className="summary-section border-decisions">
                                    <h3 className="section-label">Decisions</h3>
                                    <ul className="section-list">
                                        {decisions.map((decision, i) => (
                                            <li key={i}>{decision}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {openQuestions.length > 0 && (
                                <div className="summary-section border-questions">
                                    <h3 className="section-label">Open Questions</h3>
                                    <ul className="section-list">
                                        {openQuestions.map((q, i) => (
                                            <li key={i}>{q}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {risks.length > 0 && (
                                <div className="summary-section border-risks">
                                    <h3 className="section-label">Risks</h3>
                                    <ul className="section-list">
                                        {risks.map((r, i) => (
                                            <li key={i}>{r}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {actionItems.length > 0 && (
                                <div className="summary-section">
                                    <h3 className="section-label">Action Items</h3>
                                    <div>
                                        {actionItems.slice(0, 3).map((item, i) => (
                                            <div className="action-item-row" key={i}>
                                                <input type="checkbox" className="action-item-checkbox" />
                                                <span className="action-item-text">{item.task}</span>
                                            </div>
                                        ))}
                                        {actionItems.length > 3 && (
                                            <button className="view-all-link" onClick={() => setActiveTab('Action Items')}>View all action items</button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'Transcript' && (
                        <div>
                            {(() => {
                                let cumulativeWords = 0;
                                return transcript?.map?.((seg: any, i: number) => {
                                    const segmentWords = seg.text.split(' ').length;
                                    const isHighlighted = highlightOffset !== null && highlightOffset !== undefined && 
                                                        highlightOffset >= cumulativeWords && 
                                                        highlightOffset < (cumulativeWords + segmentWords);
                                    
                                    cumulativeWords += segmentWords;

                                    return (
                                        <div 
                                            key={i} 
                                            id={isHighlighted ? 'highlighted-segment' : undefined}
                                            className="transcript-segment"
                                            style={{
                                                backgroundColor: isHighlighted ? '#fff7ed' : 'transparent',
                                                padding: isHighlighted ? '8px 12px' : '0',
                                                borderRadius: isHighlighted ? '8px' : '0',
                                                borderLeft: isHighlighted ? '4px solid #f59e0b' : 'none'
                                            }}
                                        >
                                            <div className="transcript-speaker" style={{ color: isHighlighted ? '#d97706' : '#111827' }}>
                                                {seg.speaker} {isHighlighted && "✨ RELEVANT"}
                                            </div>
                                            <div className="transcript-text">{seg.text}</div>
                                        </div>
                                    );
                                });
                            })() || <div>No transcript data available.</div>}
                        </div>
                    )}

                    {activeTab === 'Action Items' && (
                         <div className="summary-section">
                            {actionItems.map((item, i) => (
                                <div className="action-item-row" key={i}>
                                    <input type="checkbox" className="action-item-checkbox" />
                                    <span className="action-item-text">{item.task}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
