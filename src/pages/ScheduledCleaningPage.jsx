import React, { useState, useEffect } from 'react';
import './ScheduledCleaningPage.css';
import ProfileCard from '../components/ProfileCard';
import ProfileEditor from '../components/ProfileEditor';
import ScheduleEditor from '../components/ScheduleEditor';
import ScheduleList from '../components/ScheduleList';

function ScheduledCleaningPage({ onBack }) {
  const [profiles, setProfiles] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [schedulerStatus, setSchedulerStatus] = useState({ isRunning: false });
  const [loading, setLoading] = useState(true);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [selectedProfileForSchedule, setSelectedProfileForSchedule] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load profiles
      const profilesRes = await window.electronAPI.getCleaningProfiles();
      if (profilesRes.success) {
        setProfiles(profilesRes.data);
      }

      // Load schedules
      const schedulesRes = await window.electronAPI.getSchedules();
      if (schedulesRes.success) {
        setSchedules(schedulesRes.data);
      }

      // Load recent logs
      const logsRes = await window.electronAPI.getRecentScheduleLogs(10);
      if (logsRes.success) {
        setRecentLogs(logsRes.data);
      }

      // Load scheduler status
      const statusRes = await window.electronAPI.getSchedulerStatus();
      if (statusRes.success) {
        setSchedulerStatus(statusRes.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const handleToggleScheduler = async () => {
    try {
      if (schedulerStatus.isRunning) {
        await window.electronAPI.stopScheduler();
      } else {
        await window.electronAPI.startScheduler();
      }
      const statusRes = await window.electronAPI.getSchedulerStatus();
      if (statusRes.success) {
        setSchedulerStatus(statusRes.data);
      }
    } catch (error) {
      console.error('Error toggling scheduler:', error);
    }
  };

  const handleCreateProfile = () => {
    setEditingProfile(null);
    setShowProfileEditor(true);
  };

  const handleEditProfile = (profile) => {
    setEditingProfile(profile);
    setShowProfileEditor(true);
  };

  const handleDeleteProfile = async (profileId) => {
    if (!confirm('Are you sure you want to delete this profile?')) return;

    try {
      const result = await window.electronAPI.deleteProfile(profileId);
      if (result.success) {
        await loadData();
      } else {
        alert(result.error || 'Failed to delete profile');
      }
    } catch (error) {
      console.error('Error deleting profile:', error);
      alert('Failed to delete profile');
    }
  };

  const handleTestProfile = async (profileId) => {
    try {
      const result = await window.electronAPI.testProfile(profileId);
      if (result.success) {
        alert(`Profile test completed!\n\nItems cleaned: ${result.data.totalItemsCleaned || 0}\nSpace saved: ${formatBytes(result.data.totalSpaceSaved || 0)}`);
      } else {
        alert(result.error || 'Failed to test profile');
      }
    } catch (error) {
      console.error('Error testing profile:', error);
      alert('Failed to test profile');
    }
  };

  const handleSaveProfile = async (profileData) => {
    try {
      let result;
      if (editingProfile) {
        result = await window.electronAPI.updateProfile(editingProfile.id, profileData);
      } else {
        result = await window.electronAPI.createProfile(profileData);
      }

      if (result.success) {
        setShowProfileEditor(false);
        setEditingProfile(null);
        await loadData();
      } else {
        alert(result.error || 'Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile');
    }
  };

  const handleCreateSchedule = (profile = null) => {
    setSelectedProfileForSchedule(profile);
    setEditingSchedule(null);
    setShowScheduleEditor(true);
  };

  const handleEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
    setShowScheduleEditor(true);
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      const result = await window.electronAPI.deleteSchedule(scheduleId);
      if (result.success) {
        await loadData();
      } else {
        alert(result.error || 'Failed to delete schedule');
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Failed to delete schedule');
    }
  };

  const handleToggleSchedule = async (scheduleId, enabled) => {
    try {
      const result = await window.electronAPI.toggleSchedule(scheduleId, enabled);
      if (result.success) {
        await loadData();
      } else {
        alert(result.error || 'Failed to toggle schedule');
      }
    } catch (error) {
      console.error('Error toggling schedule:', error);
      alert('Failed to toggle schedule');
    }
  };

  const handleSaveSchedule = async (scheduleData) => {
    try {
      let result;
      if (editingSchedule) {
        result = await window.electronAPI.updateSchedule(editingSchedule.id, scheduleData);
      } else {
        result = await window.electronAPI.createSchedule(scheduleData);
      }

      if (result.success) {
        setShowScheduleEditor(false);
        setEditingSchedule(null);
        setSelectedProfileForSchedule(null);
        await loadData();
      } else {
        alert(result.error || 'Failed to save schedule');
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Failed to save schedule');
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const getNextSchedule = () => {
    const upcoming = schedules
      .filter(s => s.enabled && s.nextRun)
      .sort((a, b) => a.nextRun - b.nextRun);

    return upcoming[0] || null;
  };

  const nextSchedule = getNextSchedule();

  if (loading) {
    return (
      <div className="page scheduled-cleaning-page">
        <div className="page-header">
          <button className="back-button" onClick={onBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back
          </button>
          <h1>Scheduled Cleaning</h1>
        </div>
        <div className="loading-state">Loading...</div>
      </div>
    );
  }

  return (
    <div className="page scheduled-cleaning-page">
      <div className="page-header">
        <button className="back-button" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
        <h1>Scheduled Cleaning</h1>
      </div>

      {/* Scheduler Status */}
      <div className="scheduler-status-card">
        <div className="status-header">
          <div className="status-info">
            <h2>Scheduler Status</h2>
            <div className={`status-badge ${schedulerStatus.isRunning ? 'running' : 'stopped'}`}>
              <span className="status-dot"></span>
              {schedulerStatus.isRunning ? 'Enabled' : 'Disabled'}
            </div>
          </div>
          <button
            className={`toggle-scheduler-btn ${schedulerStatus.isRunning ? 'enabled' : 'disabled'}`}
            onClick={handleToggleScheduler}
          >
            {schedulerStatus.isRunning ? 'Disable Scheduler' : 'Enable Scheduler'}
          </button>
        </div>

        {nextSchedule && (
          <div className="next-schedule">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <span>
              Next scheduled clean: <strong>{new Date(nextSchedule.nextRun).toLocaleString()}</strong>
              {' '}({profiles.find(p => p.id === nextSchedule.profileId)?.name || 'Unknown Profile'})
            </span>
          </div>
        )}
      </div>

      {/* Cleaning Profiles */}
      <div className="section">
        <div className="section-header">
          <h2>Cleaning Profiles</h2>
          <button className="create-btn" onClick={handleCreateProfile}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            New Profile
          </button>
        </div>

        <div className="profiles-grid">
          {profiles.map(profile => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              scheduleCount={schedules.filter(s => s.profileId === profile.id).length}
              onEdit={() => handleEditProfile(profile)}
              onDelete={() => handleDeleteProfile(profile.id)}
              onTest={() => handleTestProfile(profile.id)}
              onCreateSchedule={() => handleCreateSchedule(profile)}
            />
          ))}
        </div>
      </div>

      {/* Active Schedules */}
      <ScheduleList
        schedules={schedules}
        profiles={profiles}
        onEdit={handleEditSchedule}
        onDelete={handleDeleteSchedule}
        onToggle={handleToggleSchedule}
        onCreate={handleCreateSchedule}
      />

      {/* Recent Activity */}
      <div className="section">
        <div className="section-header">
          <h2>Recent Activity</h2>
        </div>

        <div className="activity-list">
          {recentLogs.length === 0 ? (
            <div className="empty-state">No recent activity</div>
          ) : (
            recentLogs.map(log => (
              <div key={log.id} className={`activity-item ${log.success ? 'success' : 'failed'}`}>
                <div className="activity-icon">
                  {log.success ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  )}
                </div>
                <div className="activity-details">
                  <div className="activity-title">
                    {profiles.find(p => p.id === log.profileId)?.name || 'Unknown Profile'}
                    {log.success ? ' ' : ' '}
                  </div>
                  <div className="activity-meta">
                    {formatDate(log.executedAt)} •
                    {log.success ? (
                      <>
                        {' '}{log.itemsCleaned || 0} items • {formatBytes(log.spaceSavedBytes || 0)}
                      </>
                    ) : (
                      <>{' '}{log.errorMessage || 'Failed'}</>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Profile Editor Modal */}
      {showProfileEditor && (
        <ProfileEditor
          profile={editingProfile}
          onSave={handleSaveProfile}
          onCancel={() => {
            setShowProfileEditor(false);
            setEditingProfile(null);
          }}
        />
      )}

      {/* Schedule Editor Modal */}
      {showScheduleEditor && (
        <ScheduleEditor
          schedule={editingSchedule}
          profiles={profiles}
          selectedProfile={selectedProfileForSchedule}
          onSave={handleSaveSchedule}
          onCancel={() => {
            setShowScheduleEditor(false);
            setEditingSchedule(null);
            setSelectedProfileForSchedule(null);
          }}
        />
      )}
    </div>
  );
}

export default ScheduledCleaningPage;
