import React from 'react';
import StartupManager from '../components/StartupManager';
import './StartupManagerPage.css';

const StartupManagerPage = ({ onBack }) => {
  return (
    <div className="startup-manager-page">
      <div className="page-header">
        <button className="back-button" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
        <div className="page-title-section">
          <h1 className="page-title">Startup Program Manager</h1>
          <p className="page-description">
            Optimize your boot time by managing startup programs
          </p>
        </div>
      </div>

      <div className="page-content">
        <StartupManager />
      </div>
    </div>
  );
};

export default StartupManagerPage;
