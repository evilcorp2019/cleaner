import React from 'react';
import './ScheduleList.css';

function ScheduleList({ schedules, profiles, onEdit, onDelete, onToggle, onCreate }) {
  const getProfileName = (profileId) => {
    const profile = profiles.find(p => p.id === profileId);
    return profile ? profile.name : 'Unknown Profile';
  };

  const getProfileIcon = (profileId) => {
    const profile = profiles.find(p => p.id === profileId);
    return profile ? profile.icon : '';
  };

  const formatSchedule = (schedule) => {
    switch (schedule.trigger) {
      case 'time': {
        switch (schedule.frequency) {
          case 'daily':
            return `Daily at ${schedule.time}`;
          case 'weekly': {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return `Weekly on ${days[schedule.dayOfWeek]} at ${schedule.time}`;
          }
          case 'monthly':
            return `Monthly on day ${schedule.dayOfMonth} at ${schedule.time}`;
          case 'custom':
            return `Every ${schedule.intervalMinutes} minutes`;
          default:
            return 'Unknown frequency';
        }
      }
      case 'startup':
        return 'On system startup';
      case 'idle':
        return `When idle for ${schedule.idleMinutes} minutes`;
      default:
        return 'Unknown trigger';
    }
  };

  const getNextRunText = (schedule) => {
    if (!schedule.enabled) return 'Disabled';
    if (!schedule.nextRun) return 'Not scheduled';

    const nextRun = new Date(schedule.nextRun);
    const now = new Date();
    const diff = nextRun - now;

    if (diff < 0) return 'Overdue';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `In ${days} day${days !== 1 ? 's' : ''}`;
    }

    if (hours > 0) {
      return `In ${hours}h ${minutes}m`;
    }

    return `In ${minutes} minutes`;
  };

  return (
    <div className="section">
      <div className="section-header">
        <h2>Active Schedules</h2>
        <button className="create-btn" onClick={() => onCreate()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          New Schedule
        </button>
      </div>

      <div className="schedule-list">
        {schedules.length === 0 ? (
          <div className="empty-state">
            No schedules created yet. Click "New Schedule" to create one.
          </div>
        ) : (
          schedules.map(schedule => (
            <div key={schedule.id} className={`schedule-item ${schedule.enabled ? 'enabled' : 'disabled'}`}>
              <div className="schedule-toggle">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={schedule.enabled}
                    onChange={(e) => onToggle(schedule.id, e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="schedule-icon">
                {getProfileIcon(schedule.profileId)}
              </div>

              <div className="schedule-details">
                <div className="schedule-title">
                  {getProfileName(schedule.profileId)}
                </div>
                <div className="schedule-subtitle">
                  {formatSchedule(schedule)}
                </div>
              </div>

              <div className="schedule-next-run">
                {getNextRunText(schedule)}
              </div>

              <div className="schedule-actions">
                <button
                  className="action-btn-sm"
                  onClick={() => onEdit(schedule)}
                  title="Edit Schedule"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button
                  className="action-btn-sm danger"
                  onClick={() => onDelete(schedule.id)}
                  title="Delete Schedule"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ScheduleList;
