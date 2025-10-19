import React, { useState } from 'react';
import './AppCacheCard.css';

function AppCacheCard({ app, onClean, onSelect, selected }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const handleClean = async (e) => {
    e.stopPropagation();
    setIsCleaning(true);
    try {
      await onClean(app.id);
    } finally {
      setIsCleaning(false);
    }
  };

  const handleCardClick = () => {
    if (app.installed && app.cacheSize > 0) {
      onSelect(app.id);
    }
  };

  const handleCheckboxClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div
      className={`app-cache-card ${!app.installed ? 'not-installed' : ''} ${selected ? 'selected' : ''} ${app.running ? 'running' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      <div className="app-card-header">
        <div className="app-icon-wrapper">
          <span className="app-icon">{app.icon}</span>
          {app.running && (
            <span className="running-indicator" title="Application is running">
              <svg viewBox="0 0 8 8" fill="currentColor">
                <circle cx="4" cy="4" r="4" />
              </svg>
            </span>
          )}
        </div>
        {app.installed && app.cacheSize > 0 && (
          <div className="app-checkbox" onClick={handleCheckboxClick}>
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onSelect(app.id)}
            />
          </div>
        )}
      </div>

      <div className="app-card-body">
        <h3 className="app-name">{app.name}</h3>
        <p className="app-category">{app.category}</p>

        {!app.installed ? (
          <div className="not-installed-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>Not Installed</span>
          </div>
        ) : (
          <>
            <div className="app-cache-size">
              <span className={`cache-size ${app.cacheSize === 0 ? 'zero' : app.cacheSize > 1024 * 1024 * 1024 * 5 ? 'large' : ''}`}>
                {formatSize(app.cacheSize)}
              </span>
              {app.cacheAge && (
                <span className="cache-age">
                  Last modified: {formatDate(app.cacheAge)}
                </span>
              )}
            </div>

            {app.cacheSize > 0 && (
              <button
                className={`clean-button ${isCleaning ? 'cleaning' : ''} ${app.running ? 'disabled' : ''}`}
                onClick={handleClean}
                disabled={isCleaning || app.running}
              >
                {isCleaning ? (
                  <>
                    <svg className="spinner" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="3" />
                    </svg>
                    Cleaning...
                  </>
                ) : app.running ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z" />
                      <path d="M12 8v4l3 3" />
                    </svg>
                    Running
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                    Clean Cache
                  </>
                )}
              </button>
            )}

            {app.cacheSize === 0 && (
              <div className="no-cache-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span>No Cache</span>
              </div>
            )}
          </>
        )}
      </div>

      {app.description && (isHovered || !app.installed) && (
        <div className="app-description">
          {app.description}
        </div>
      )}
    </div>
  );
}

export default AppCacheCard;
