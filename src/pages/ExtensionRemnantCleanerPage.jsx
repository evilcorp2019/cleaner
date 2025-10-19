import React from 'react';
import ExtensionRemnantCleaner from '../components/ExtensionRemnantCleaner';
import { FiArrowLeft } from 'react-icons/fi';
import './ExtensionRemnantCleanerPage.css';

const ExtensionRemnantCleanerPage = ({ onBack }) => {
  return (
    <div className="extension-remnant-cleaner-page">
      <div className="page-header">
        <button onClick={onBack} className="back-button">
          <FiArrowLeft />
          Back
        </button>
        <div className="page-info">
          <h1>Extension Remnant Cleaner</h1>
          <p>Recover disk space by removing orphaned browser extension data</p>
        </div>
      </div>

      <div className="page-content">
        <ExtensionRemnantCleaner />
      </div>
    </div>
  );
};

export default ExtensionRemnantCleanerPage;
