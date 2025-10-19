import React, { useState } from 'react';
import './ProfileEditor.css';

function ProfileEditor({ profile, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    description: profile?.description || '',
    icon: profile?.icon || '',
    cleaningTasks: profile?.cleaningTasks || {
      browserHistory: { enabled: false },
      browserCookies: { enabled: false },
      browserCache: { enabled: false },
      formData: { enabled: false },
      tempFiles: { enabled: false },
      appCaches: { enabled: false }
    },
    options: profile?.options || {
      askBeforeDelete: true,
      autoQuitApps: true,
      preserveLogs: false,
      showNotifications: true,
      runOnBattery: false,
      runOnMetered: false
    },
    estimatedTime: profile?.estimatedTime || 300
  });

  const icons = ['', '', '', '', '', '', '', '', '', ''];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter a profile name');
      return;
    }
    onSave(formData);
  };

  const toggleTask = (taskKey) => {
    setFormData(prev => ({
      ...prev,
      cleaningTasks: {
        ...prev.cleaningTasks,
        [taskKey]: {
          ...prev.cleaningTasks[taskKey],
          enabled: !prev.cleaningTasks[taskKey]?.enabled
        }
      }
    }));
  };

  const toggleOption = (optionKey) => {
    setFormData(prev => ({
      ...prev,
      options: {
        ...prev.options,
        [optionKey]: !prev.options[optionKey]
      }
    }));
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content profile-editor" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{profile ? 'Edit Profile' : 'Create Profile'}</h2>
          <button className="close-btn" onClick={onCancel}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Basic Info */}
          <div className="form-section">
            <h3>Basic Information</h3>

            <div className="form-group">
              <label>Profile Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter profile name"
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this profile does"
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>Icon</label>
              <div className="icon-selector">
                {icons.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    className={`icon-option ${formData.icon === icon ? 'selected' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, icon }))}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Cleaning Tasks */}
          <div className="form-section">
            <h3>Cleaning Tasks</h3>
            <div className="task-list">
              {[
                { key: 'browserHistory', label: 'Browser History' },
                { key: 'browserCookies', label: 'Browser Cookies' },
                { key: 'browserCache', label: 'Browser Cache' },
                { key: 'formData', label: 'Form Data' },
                { key: 'tempFiles', label: 'Temporary Files' },
                { key: 'appCaches', label: 'Application Caches' }
              ].map(task => (
                <label key={task.key} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.cleaningTasks[task.key]?.enabled || false}
                    onChange={() => toggleTask(task.key)}
                  />
                  <span>{task.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="form-section">
            <h3>Options</h3>
            <div className="task-list">
              {[
                { key: 'askBeforeDelete', label: 'Ask before delete' },
                { key: 'autoQuitApps', label: 'Auto-quit applications' },
                { key: 'preserveLogs', label: 'Preserve log files' },
                { key: 'showNotifications', label: 'Show notifications' },
                { key: 'runOnBattery', label: 'Run on battery power' },
                { key: 'runOnMetered', label: 'Run on metered connection' }
              ].map(option => (
                <label key={option.key} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.options[option.key] || false}
                    onChange={() => toggleOption(option.key)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Estimated Time */}
          <div className="form-section">
            <h3>Estimated Duration</h3>
            <div className="form-group">
              <label>Time (seconds)</label>
              <input
                type="number"
                value={formData.estimatedTime}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedTime: parseInt(e.target.value) || 0 }))}
                min="1"
                max="3600"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {profile ? 'Update Profile' : 'Create Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProfileEditor;
