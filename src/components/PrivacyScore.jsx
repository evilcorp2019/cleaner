import React from 'react';
import './PrivacyScore.css';
import { BsShieldCheck, BsShieldExclamation, BsShieldX } from 'react-icons/bs';
import { HiQuestionMarkCircle } from 'react-icons/hi';

function PrivacyScore({ scoreData, showImprovement = false, projectedScore = null }) {
  if (!scoreData) return null;

  const { score, grade, color, stats, breakdown } = scoreData;

  const getIcon = () => {
    if (color === 'excellent') return <BsShieldCheck />;
    if (color === 'fair') return <BsShieldExclamation />;
    return <BsShieldX />;
  };

  const getScoreDescription = () => {
    if (score >= 90) return 'Excellent! Minimal tracking data detected.';
    if (score >= 80) return 'Very Good! Low tracking footprint.';
    if (score >= 70) return 'Good. Some tracking data present.';
    if (score >= 60) return 'Fair. Moderate tracking detected.';
    if (score >= 40) return 'Poor. Significant tracking found.';
    return 'Critical! High tracking activity detected.';
  };

  return (
    <div className={`privacy-score-container score-${color}`}>
      <div className="privacy-score-main">
        <div className="score-icon">{getIcon()}</div>
        <div className="score-content">
          <div className="score-header">
            <h3>Privacy Score</h3>
            <button
              className="info-button"
              title="Privacy score is calculated based on tracking cookies, total cookies, cache size, and browsing history"
            >
              <HiQuestionMarkCircle />
            </button>
          </div>
          <div className="score-display">
            <span className="score-number">{score}</span>
            <span className="score-grade">Grade {grade}</span>
          </div>
          <p className="score-description">{getScoreDescription()}</p>

          {showImprovement && projectedScore !== null && (
            <div className="score-improvement">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="19" x2="12" y2="5"/>
                <polyline points="5 12 12 5 19 12"/>
              </svg>
              <span>
                After cleaning: <strong>{projectedScore}</strong> (+{projectedScore - score} points)
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="privacy-stats">
        <div className="stat-item">
          <span className="stat-label">Tracking Cookies</span>
          <span className="stat-value highlight-tracker">{stats.trackingCookiesCount || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Cookies</span>
          <span className="stat-value">{stats.totalCookiesCount || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Cache Size</span>
          <span className="stat-value">{stats.cacheSizeMB || 0} MB</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">History Items</span>
          <span className="stat-value">{stats.historyCount || 0}</span>
        </div>
      </div>

      {stats.trackingCookiesCount > 0 && (
        <div className="tracker-warning">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>
            <strong>{stats.trackingCookiesCount} tracking cookies</strong> found from services like
            Google Analytics, Facebook, and advertising networks.
          </span>
        </div>
      )}
    </div>
  );
}

export default PrivacyScore;
