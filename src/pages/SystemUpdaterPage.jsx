import React, { useState, useEffect } from 'react';
import './SystemUpdaterPage.css';

function SystemUpdaterPage({ systemInfo, onBack }) {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [checkProgress, setCheckProgress] = useState(null);
  const [installProgress, setInstallProgress] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onSystemUpdateCheckProgress((data) => {
        setCheckProgress(data);
      });

      window.electronAPI.onSystemUpdateInstallProgress((data) => {
        setInstallProgress(data);
      });

      return () => {
        if (window.electronAPI?.removeSystemUpdateCheckProgressListener) {
          window.electronAPI.removeSystemUpdateCheckProgressListener();
        }
        if (window.electronAPI?.removeSystemUpdateInstallProgressListener) {
          window.electronAPI.removeSystemUpdateInstallProgressListener();
        }
      };
    }
  }, []);

  const handleCheckUpdates = async () => {
    if (!window.electronAPI) {
      alert('This feature requires the desktop application. Please run the app with "npm run dev"');
      return;
    }

    setIsChecking(true);
    setCheckProgress(null);
    setError(null);
    setUpdateInfo(null);

    try {
      const result = await window.electronAPI.checkSystemUpdates();

      if (result.success) {
        setUpdateInfo(result.data);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsChecking(false);
      setCheckProgress(null);
    }
  };

  const handleInstallUpdates = async () => {
    if (!window.electronAPI) {
      alert('This feature requires the desktop application. Please run the app with "npm run dev"');
      return;
    }

    if (!confirm('This will install all pending system updates. Continue?')) {
      return;
    }

    setIsInstalling(true);
    setInstallProgress(null);
    setError(null);

    try {
      const result = await window.electronAPI.installSystemUpdates();

      if (result.success) {
        alert(result.data.message);

        if (result.data.requiresRestart) {
          if (confirm('A restart is required to complete the updates. Restart now?')) {
            // Note: Actual restart would need additional implementation
            alert('Please restart your computer manually to complete the updates.');
          }
        }

        // Refresh update status
        handleCheckUpdates();
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsInstalling(false);
      setInstallProgress(null);
    }
  };

  const getOSName = () => {
    if (!systemInfo) return 'System';

    switch (systemInfo.platform) {
      case 'darwin':
        return 'macOS';
      case 'win32':
        return 'Windows';
      case 'linux':
        return 'Linux';
      default:
        return 'System';
    }
  };

  console.log('[SystemUpdaterPage] Rendering, isChecking:', isChecking, 'isInstalling:', isInstalling);

  return (
    <div className="system-updater-page">
      <div className="page-header">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
        <h1>System Updates</h1>
      </div>

      <div className="page-content">
        <div className="updater-card">
          <div className="updater-header">
            <div>
              <h2>{getOSName()} System Updates</h2>
              <p className="updater-description">
                Keep your system up to date with the latest security patches and features
              </p>
            </div>
          </div>

          <div className="updater-actions" style={{ display: 'flex', minHeight: '60px', marginBottom: '20px' }}>
            <button
              className="btn btn-primary check-updates-button"
              onClick={handleCheckUpdates}
              disabled={isChecking || isInstalling}
              style={{
                display: 'inline-block !important',
                visibility: 'visible !important',
                opacity: isChecking || isInstalling ? '0.5' : '1',
                background: '#0969DA',
                color: 'white',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                border: '2px solid #0969DA',
                borderRadius: '8px',
                cursor: isChecking || isInstalling ? 'not-allowed' : 'pointer',
                minWidth: '200px',
                minHeight: '44px',
                transition: 'none'
              }}
            >
              {isChecking ? 'Checking...' : 'Check for Updates'}
            </button>
          </div>

          {checkProgress && (
            <div className="progress-section">
              <div className="progress-text">{checkProgress.status}</div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${checkProgress.progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {error && (
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          )}

          {updateInfo && !isChecking && (
            <div className="update-results">
              <div className={`update-status ${updateInfo.available ? 'updates-available' : 'up-to-date'}`}>
                {updateInfo.available ? (
                  <>
                    <div className="status-badge">WARNING</div>
                    <div>
                      <h3>{updateInfo.count} Update(s) Available</h3>
                      <p>{updateInfo.message}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="status-badge success">OK</div>
                    <div>
                      <h3>System Up to Date</h3>
                      <p>{updateInfo.message}</p>
                    </div>
                  </>
                )}
              </div>

              {updateInfo.available && updateInfo.updates && updateInfo.updates.length > 0 && (
                <div className="updates-list">
                  <h4>Available Updates:</h4>
                  <ul>
                    {updateInfo.updates.map((update, index) => (
                      <li key={index}>
                        <strong>{update.title || update.Title}</strong>
                        {(update.description || update.Description) && (
                          <p>{update.description || update.Description}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {updateInfo.available && (
                <>
                  <button
                    className="btn btn-success btn-large"
                    onClick={handleInstallUpdates}
                    disabled={isInstalling}
                  >
                    {isInstalling ? 'Installing...' : 'Install All Updates'}
                  </button>

                  {installProgress && (
                    <div className="progress-section">
                      <div className="progress-text">{installProgress.status}</div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${installProgress.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <div className="warning-message">
                    <strong>IMPORTANT:</strong> Installing updates may require administrator
                    privileges and could take several minutes. Your system may need to restart.
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SystemUpdaterPage;
