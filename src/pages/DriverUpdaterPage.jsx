import React from 'react';
import './DriverUpdaterPage.css';
import DriverUpdater from '../components/DriverUpdater';

function DriverUpdaterPage({ systemInfo, onBack }) {
  const isWindows = systemInfo?.platform === 'win32';

  return (
    <div className="driver-updater-page">
      <div className="page-header">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
        <h1>Driver Updates</h1>
      </div>

      <div className="page-content">
        {!isWindows && systemInfo ? (
          <div className="driver-updater-card disabled">
            <h2>Driver Updates</h2>
            <p className="unavailable-message">
              Driver updates are only available on Windows systems.
              Your current platform: {systemInfo.platform}
            </p>
          </div>
        ) : (
          <DriverUpdater systemInfo={systemInfo} />
        )}
      </div>
    </div>
  );
}

export default DriverUpdaterPage;
