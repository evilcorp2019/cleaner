import React, { useState } from 'react';
import './ScheduleEditor.css';

function ScheduleEditor({ schedule, profiles, selectedProfile, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    profileId: schedule?.profileId || selectedProfile?.id || '',
    frequency: schedule?.frequency || 'daily',
    time: schedule?.time || '02:00',
    dayOfWeek: schedule?.dayOfWeek ?? 0,
    dayOfMonth: schedule?.dayOfMonth ?? 1,
    intervalMinutes: schedule?.intervalMinutes || 60,
    trigger: schedule?.trigger || 'time',
    idleMinutes: schedule?.idleMinutes || 30,
    enabled: schedule?.enabled ?? true
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.profileId) {
      alert('Please select a profile');
      return;
    }

    // Calculate next run time
    const nextRun = calculateNextRun();

    onSave({
      ...formData,
      nextRun
    });
  };

  const calculateNextRun = () => {
    if (formData.trigger !== 'time') return null;

    const now = new Date();
    const [hours, minutes] = formData.time.split(':').map(Number);

    switch (formData.frequency) {
      case 'daily': {
        const next = new Date(now);
        next.setHours(hours, minutes, 0, 0);
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
        return next.getTime();
      }

      case 'weekly': {
        const next = new Date(now);
        next.setHours(hours, minutes, 0, 0);
        const currentDay = next.getDay();
        const targetDay = formData.dayOfWeek;
        let daysToAdd = targetDay - currentDay;
        if (daysToAdd < 0 || (daysToAdd === 0 && next <= now)) {
          daysToAdd += 7;
        }
        next.setDate(next.getDate() + daysToAdd);
        return next.getTime();
      }

      case 'monthly': {
        const next = new Date(now);
        next.setDate(formData.dayOfMonth);
        next.setHours(hours, minutes, 0, 0);
        if (next <= now) {
          next.setMonth(next.getMonth() + 1);
        }
        return next.getTime();
      }

      case 'custom': {
        const next = new Date(now);
        next.setMinutes(next.getMinutes() + formData.intervalMinutes);
        return next.getTime();
      }

      default:
        return null;
    }
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content schedule-editor" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{schedule ? 'Edit Schedule' : 'Create Schedule'}</h2>
          <button className="close-btn" onClick={onCancel}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Profile Selection */}
          <div className="form-section">
            <h3>Profile</h3>
            <div className="form-group">
              <label>Select Profile</label>
              <select
                value={formData.profileId}
                onChange={(e) => setFormData(prev => ({ ...prev, profileId: e.target.value }))}
                required
              >
                <option value="">Choose a profile...</option>
                {profiles.map(profile => (
                  <option key={profile.id} value={profile.id}>
                    {profile.icon} {profile.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Trigger Type */}
          <div className="form-section">
            <h3>When to Run</h3>
            <div className="form-group">
              <label>Trigger</label>
              <select
                value={formData.trigger}
                onChange={(e) => setFormData(prev => ({ ...prev, trigger: e.target.value }))}
              >
                <option value="time">At Specific Time</option>
                <option value="startup">On Startup</option>
                <option value="idle">When System is Idle</option>
              </select>
            </div>
          </div>

          {/* Time-based Schedule */}
          {formData.trigger === 'time' && (
            <div className="form-section">
              <h3>Schedule Details</h3>

              <div className="form-group">
                <label>Frequency</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom Interval</option>
                </select>
              </div>

              {formData.frequency !== 'custom' && (
                <div className="form-group">
                  <label>Time</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                    required
                  />
                </div>
              )}

              {formData.frequency === 'weekly' && (
                <div className="form-group">
                  <label>Day of Week</label>
                  <select
                    value={formData.dayOfWeek}
                    onChange={(e) => setFormData(prev => ({ ...prev, dayOfWeek: parseInt(e.target.value) }))}
                  >
                    {dayNames.map((day, index) => (
                      <option key={index} value={index}>{day}</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.frequency === 'monthly' && (
                <div className="form-group">
                  <label>Day of Month</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.dayOfMonth}
                    onChange={(e) => setFormData(prev => ({ ...prev, dayOfMonth: parseInt(e.target.value) }))}
                    required
                  />
                </div>
              )}

              {formData.frequency === 'custom' && (
                <div className="form-group">
                  <label>Interval (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={formData.intervalMinutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, intervalMinutes: parseInt(e.target.value) }))}
                    required
                  />
                </div>
              )}
            </div>
          )}

          {/* Idle Trigger Settings */}
          {formData.trigger === 'idle' && (
            <div className="form-section">
              <h3>Idle Settings</h3>
              <div className="form-group">
                <label>Idle Time (minutes)</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={formData.idleMinutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, idleMinutes: parseInt(e.target.value) }))}
                  required
                />
              </div>
            </div>
          )}

          {/* Enable/Disable */}
          <div className="form-section">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
              />
              <span>Enable this schedule</span>
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {schedule ? 'Update Schedule' : 'Create Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ScheduleEditor;
