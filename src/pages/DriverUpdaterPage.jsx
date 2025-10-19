import React from 'react';
import './DriverUpdaterPage.css';
import DriverUpdater from '../components/DriverUpdater';

function DriverUpdaterPage({ systemInfo, onBack }) {
  return (
    <div className="driver-updater-page">
      <div className="page-header">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
        <h1>Driver Updates</h1>
      </div>

      <div className="page-content">
        <DriverUpdater systemInfo={systemInfo} />
      </div>
    </div>
  );
}

export default DriverUpdaterPage;
