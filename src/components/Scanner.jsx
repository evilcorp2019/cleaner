import React from 'react';
import './Scanner.css';

function Scanner({ onScan, isScanning, isCleaning, scanProgress }) {
  return (
    <div className="scanner-card">
      <h2>Quick Scan</h2>
      <p className="scanner-description">
        Safely scan your system for temporary files, caches, and unnecessary data
      </p>

      <button
        className="scan-button"
        onClick={onScan}
        disabled={isScanning || isCleaning}
      >
        {isScanning ? (
          <>
            <span className="spinner"></span>
            Scanning...
          </>
        ) : (
          'Start Scan'
        )}
      </button>

      {scanProgress && (
        <div className="progress-info">
          <div className="progress-text">
            Scanning: {scanProgress.scanning}
          </div>
          {scanProgress.found > 0 && (
            <div className="found-count">Found {scanProgress.found} items</div>
          )}
        </div>
      )}
    </div>
  );
}

export default Scanner;
