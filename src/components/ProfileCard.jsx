import React from 'react';
import './ProfileCard.css';

function ProfileCard({ profile, scheduleCount, onEdit, onDelete, onTest, onCreateSchedule }) {
  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div className="profile-card">
      <div className="profile-header">
        <div className="profile-icon">{profile.icon}</div>
        <div className="profile-info">
          <h3 className="profile-name">{profile.name}</h3>
          {profile.isBuiltIn && (
            <span className="built-in-badge">Built-in</span>
          )}
        </div>
      </div>

      <p className="profile-description">{profile.description}</p>

      <div className="profile-stats">
        <div className="stat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          <span>~{formatTime(profile.estimatedTime)}</span>
        </div>
        <div className="stat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 2v4M16 2v4M3 10h18"/>
            <rect x="3" y="4" width="18" height="18" rx="2"/>
          </svg>
          <span>{scheduleCount} schedule{scheduleCount !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="profile-actions">
        <button className="action-btn secondary" onClick={onTest} title="Test Profile">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          Test
        </button>

        {!profile.isBuiltIn && (
          <button className="action-btn secondary" onClick={onEdit} title="Edit Profile">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit
          </button>
        )}

        <button className="action-btn primary" onClick={onCreateSchedule} title="Create Schedule">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Schedule
        </button>

        {!profile.isBuiltIn && (
          <button className="action-btn danger" onClick={onDelete} title="Delete Profile">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default ProfileCard;
