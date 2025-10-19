import React from 'react';
import AppCacheManager from '../components/AppCacheManager';
import './AppCacheManagerPage.css';

function AppCacheManagerPage({ onBack }) {
  return (
    <div className="app-cache-manager-page">
      <div className="page-header">
        <button className="back-button" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div className="page-title-section">
          <h1 className="page-title">Application Cache Manager</h1>
          <p className="page-description">
            Clean cache from 50+ popular applications to recover gigabytes of disk space
          </p>
        </div>
      </div>

      <AppCacheManager />
    </div>
  );
}

export default AppCacheManagerPage;
