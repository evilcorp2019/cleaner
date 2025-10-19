import React from 'react';
import './Stats.css';

function Stats({
  scanResults,
  selectedFiles,
  getTotalSelectedSize,
  onSelectAll,
  onDeselectAll,
  onClean,
  isCleaning,
  cleanProgress
}) {
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="stats-card">
      <h2>Scan Results</h2>

      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-label">Total Found</div>
          <div className="stat-value">{scanResults.items.length} items</div>
        </div>

        <div className="stat-item">
          <div className="stat-label">Reclaimable Space</div>
          <div className="stat-value highlight">{scanResults.totalSizeFormatted}</div>
        </div>

        <div className="stat-item">
          <div className="stat-label">Selected</div>
          <div className="stat-value">{selectedFiles.length} items</div>
        </div>

        <div className="stat-item">
          <div className="stat-label">Will Free</div>
          <div className="stat-value highlight">{formatBytes(getTotalSelectedSize())}</div>
        </div>
      </div>

      <div className="action-buttons">
        <button
          className="secondary-button"
          onClick={selectedFiles.length > 0 ? onDeselectAll : onSelectAll}
        >
          {selectedFiles.length > 0 ? 'Deselect All' : 'Select All'}
        </button>

        <button
          className="clean-button"
          onClick={onClean}
          disabled={selectedFiles.length === 0 || isCleaning}
        >
          {isCleaning ? (
            <>
              <span className="spinner"></span>
              Cleaning...
            </>
          ) : (
            'Clean Selected'
          )}
        </button>
      </div>

      {cleanProgress && (
        <div className="progress-info">
          <div className="progress-text">
            Cleaning ({cleanProgress.current}/{cleanProgress.total}): {cleanProgress.path}
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(cleanProgress.current / cleanProgress.total) * 100}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Stats;
