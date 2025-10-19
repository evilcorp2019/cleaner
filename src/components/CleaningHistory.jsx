import React, { useState, useEffect } from 'react';
import './CleaningHistory.css';
import { HiDownload, HiTrash, HiClock, HiChartBar } from 'react-icons/hi';

function CleaningHistory({ isOpen, onClose }) {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('timeline'); // 'timeline' or 'stats'

  useEffect(() => {
    if (isOpen) {
      loadHistory();
      loadStats();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.getCleaningHistory({ limit: 50 });
      if (result.success) {
        setHistory(result.data);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await window.electronAPI.getCleaningStats();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleExportCSV = async () => {
    try {
      const result = await window.electronAPI.exportHistoryCSV();
      if (result.success) {
        // Create a download link
        const blob = new Blob([result.data], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cleaning-history-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('Failed to export history to CSV');
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear all cleaning history? This cannot be undone.')) {
      return;
    }

    try {
      const result = await window.electronAPI.clearCleaningHistory();
      if (result.success) {
        setHistory([]);
        loadStats();
      }
    } catch (error) {
      console.error('Failed to clear history:', error);
      alert('Failed to clear history');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="history-modal-overlay" onClick={onClose}>
      <div className="history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="history-header">
          <h2>Cleaning History</h2>
          <div className="history-actions">
            <div className="view-toggle">
              <button
                className={view === 'timeline' ? 'active' : ''}
                onClick={() => setView('timeline')}
              >
                <HiClock />
                Timeline
              </button>
              <button
                className={view === 'stats' ? 'active' : ''}
                onClick={() => setView('stats')}
              >
                <HiChartBar />
                Stats
              </button>
            </div>
            <button className="export-button" onClick={handleExportCSV} title="Export to CSV">
              <HiDownload />
            </button>
            <button className="clear-button" onClick={handleClearHistory} title="Clear history">
              <HiTrash />
            </button>
            <button className="close-button" onClick={onClose}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="history-content">
          {loading ? (
            <div className="history-loading">
              <div className="spinner"></div>
              <p>Loading history...</p>
            </div>
          ) : view === 'timeline' ? (
            <div className="history-timeline">
              {history.length === 0 ? (
                <div className="history-empty">
                  <HiClock />
                  <h3>No cleaning history yet</h3>
                  <p>Your cleaning history will appear here after you clean browser data.</p>
                </div>
              ) : (
                <div className="timeline-items">
                  {history.map((event) => (
                    <div key={event.id} className="timeline-item">
                      <div className="timeline-marker">
                        <div className="timeline-dot"></div>
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <span className="timeline-date">{formatDate(event.date)}</span>
                          <span className="timeline-space">{event.space_saved_formatted}</span>
                        </div>
                        <div className="timeline-details">
                          <div className="timeline-meta">
                            <span className="meta-item">
                              {event.browsersСleaned.length} browser{event.browsersСleaned.length !== 1 ? 's' : ''}
                            </span>
                            <span className="meta-separator">•</span>
                            <span className="meta-item">
                              {event.dataTypes.length} data type{event.dataTypes.length !== 1 ? 's' : ''}
                            </span>
                            <span className="meta-separator">•</span>
                            <span className="meta-item">
                              {event.items_cleaned} items
                            </span>
                            {event.trackers_removed > 0 && (
                              <>
                                <span className="meta-separator">•</span>
                                <span className="meta-item tracker-count">
                                  {event.trackers_removed} trackers
                                </span>
                              </>
                            )}
                          </div>
                          <div className="timeline-tags">
                            {event.browsersСleaned.map((browser, idx) => (
                              <span key={idx} className="tag browser-tag">{browser}</span>
                            ))}
                            {event.dataTypes.map((type, idx) => (
                              <span key={idx} className="tag type-tag">{type}</span>
                            ))}
                          </div>
                          {event.privacy_score_before && event.privacy_score_after && (
                            <div className="privacy-improvement">
                              Privacy Score: {event.privacy_score_before} → {event.privacy_score_after}
                              <span className="improvement-badge">
                                +{event.privacy_score_after - event.privacy_score_before}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="history-stats">
              {stats && (
                <>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon cleanings">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">{stats.totalCleanings}</div>
                        <div className="stat-label">Total Cleanings</div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon space">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18"/>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                        </svg>
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">{formatBytes(stats.totalSpaceSaved)}</div>
                        <div className="stat-label">Space Freed</div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon items">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 11l3 3L22 4"/>
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                        </svg>
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">{stats.totalItemsCleaned.toLocaleString()}</div>
                        <div className="stat-label">Items Cleaned</div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon trackers">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">{stats.totalTrackersRemoved.toLocaleString()}</div>
                        <div className="stat-label">Trackers Removed</div>
                      </div>
                    </div>
                  </div>

                  {stats.lastCleaning && (
                    <div className="last-cleaning">
                      <strong>Last Cleaning:</strong> {formatDate(stats.lastCleaning)}
                    </div>
                  )}

                  {stats.avgPrivacyImprovement > 0 && (
                    <div className="avg-improvement">
                      Average Privacy Score Improvement: <strong>+{stats.avgPrivacyImprovement} points</strong>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CleaningHistory;
