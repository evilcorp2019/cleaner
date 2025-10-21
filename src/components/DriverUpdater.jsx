import React, { useState, useEffect } from 'react';
import './DriverUpdater.css';

function DriverUpdater({ systemInfo }) {
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [selectedDrivers, setSelectedDrivers] = useState(new Set());
  const [checkProgress, setCheckProgress] = useState(null);
  const [updateProgress, setUpdateProgress] = useState(null);
  const [windowsUpdateAvailable, setWindowsUpdateAvailable] = useState(null);

  const isWindows = systemInfo?.platform === 'win32';

  useEffect(() => {
    // Only check Windows Update service if we're actually on Windows
    // and systemInfo is loaded
    if (isWindows && systemInfo) {
      checkWindowsUpdateService();
    }

    if (window.electronAPI) {
      window.electronAPI.onDriverCheckProgress((data) => {
        setCheckProgress(data);
      });

      window.electronAPI.onDriverUpdateProgress((data) => {
        setUpdateProgress(data);
      });
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeDriverCheckProgressListener();
        window.electronAPI.removeDriverUpdateProgressListener();
      }
    };
  }, [isWindows, systemInfo]);

  const checkWindowsUpdateService = async () => {
    // Extra safety check - don't run on non-Windows platforms
    if (!isWindows || !systemInfo) {
      console.log('[DriverUpdater] Skipping Windows Update check - not on Windows or systemInfo not loaded');
      return;
    }

    try {
      const result = await window.electronAPI.checkWindowsUpdate();
      if (result.success) {
        setWindowsUpdateAvailable(result.data);
      }
    } catch (error) {
      console.error('Failed to check Windows Update:', error);
    }
  };

  const handleCheckDrivers = async () => {
    setIsChecking(true);
    setCheckProgress(null);
    setDrivers([]);
    setSelectedDrivers(new Set());

    try {
      const result = await window.electronAPI.checkDriverUpdates();
      if (result.success) {
        // Show method used for debugging
        console.log(`Driver check completed using method: ${result.method}`);

        // Handle different scenarios
        if (result.problemDevices && result.problemDevices.length > 0) {
          // WMI method found problem devices but couldn't fetch updates
          let message = `Found ${result.problemDevices.length} device(s) with driver issues:\n\n`;
          result.problemDevices.forEach(device => {
            message += `- ${device.Name}\n  Issue: ${device.ErrorDescription}\n\n`;
          });
          message += '\nWindows Update service is not accessible. Please:\n';
          message += '1. Run this app as Administrator\n';
          message += '2. Enable Windows Update service in Windows Services\n';
          message += '3. Or manually update these drivers from Device Manager';
          alert(message);
        } else if (result.drivers && result.drivers.length > 0) {
          // Successfully found driver updates
          setDrivers(result.drivers);
          const allDriverIds = new Set(result.drivers.map((d, index) => d.UpdateID || d.KB || `driver-${index}`));
          setSelectedDrivers(allDriverIds);

          let methodInfo = '';
          if (result.method === 'PSWindowsUpdate') {
            methodInfo = '\n\n(Using PSWindowsUpdate module - more reliable)';
          }

          alert(`Found ${result.drivers.length} driver update(s) available!${methodInfo}`);
        } else {
          // No updates found
          let message = 'All drivers are up to date!';
          if (result.method === 'PSWindowsUpdate') {
            message += '\n\n(Checked using PSWindowsUpdate module)';
          }
          alert(message);
        }
      } else {
        // Check failed
        let errorMsg = 'Failed to check drivers: ' + (result.error || result.message || 'Unknown error');

        // Add helpful context
        if (result.error && result.error.includes('Administrator')) {
          errorMsg += '\n\nTip: Try running this application as Administrator for full functionality.';
        } else if (result.error && result.error.includes('Windows Update')) {
          errorMsg += '\n\nTip: The Windows Update service may need to be enabled in Windows Services (services.msc).';
        }

        alert(errorMsg);
      }
    } catch (error) {
      alert('Error checking drivers: ' + error.message + '\n\nPlease ensure you have administrator privileges and Windows Update is enabled.');
    } finally {
      setIsChecking(false);
      setCheckProgress(null);
    }
  };

  const toggleDriverSelection = (driverId) => {
    const newSelected = new Set(selectedDrivers);
    if (newSelected.has(driverId)) {
      newSelected.delete(driverId);
    } else {
      newSelected.add(driverId);
    }
    setSelectedDrivers(newSelected);
  };

  const selectAllDrivers = () => {
    const allDriverIds = new Set(drivers.map((d, index) => d.UpdateID || d.KB || `driver-${index}`));
    setSelectedDrivers(allDriverIds);
  };

  const deselectAllDrivers = () => {
    setSelectedDrivers(new Set());
  };

  const handleUpdateDrivers = async () => {
    if (selectedDrivers.size === 0) {
      alert('Please select at least one driver to update');
      return;
    }

    const confirmed = confirm(
      `Update ${selectedDrivers.size} selected driver(s)? This requires administrator privileges and may require a reboot.\n\nNote: A system restore point will be created automatically before installation.`
    );

    if (!confirmed) return;

    setIsUpdating(true);
    setUpdateProgress(null);

    try {
      const driverIds = Array.from(selectedDrivers);
      const result = await window.electronAPI.updateDrivers(driverIds);

      if (result.success) {
        const message = result.message || 'Drivers updated successfully!';
        alert(message);

        if (result.data?.rebootRequired) {
          const reboot = confirm('A system reboot is required to complete the driver installation. Reboot now?');
          if (reboot) {
            alert('Please save your work and reboot your system manually.');
          }
        }

        // Remove updated drivers from the list
        const remainingDrivers = drivers.filter((d, index) => {
          const driverId = d.UpdateID || d.KB || `driver-${index}`;
          return !selectedDrivers.has(driverId);
        });
        setDrivers(remainingDrivers);
        setSelectedDrivers(new Set());
      } else {
        alert('Failed to update drivers: ' + result.error);
      }
    } catch (error) {
      alert('Error updating drivers: ' + error.message);
    } finally {
      setIsUpdating(false);
      setUpdateProgress(null);
    }
  };

  if (!isWindows) {
    return (
      <div className="driver-updater-card disabled">
        <h2>Driver Updates</h2>
        <p className="unavailable-message">
          Driver updates are only available on Windows systems.
        </p>
      </div>
    );
  }

  if (windowsUpdateAvailable && !windowsUpdateAvailable.available) {
    const canRetry = windowsUpdateAvailable.status === 'stopped' || windowsUpdateAvailable.status === 'error';

    return (
      <div className="driver-updater-card">
        <h2>Driver Updates</h2>
        <div className="service-status-warning">
          <p className="unavailable-message">
            <strong>Windows Update Service Status:</strong> {windowsUpdateAvailable.reason}
          </p>

          {windowsUpdateAvailable.status === 'disabled' && (
            <div className="help-message">
              <p>The Windows Update service is disabled on your system.</p>
              <p>To enable it:</p>
              <ol>
                <li>Press Win + R and type: services.msc</li>
                <li>Find "Windows Update" service</li>
                <li>Right-click and select "Properties"</li>
                <li>Set "Startup type" to "Manual" or "Automatic"</li>
                <li>Click "Apply" and restart this application</li>
              </ol>
            </div>
          )}

          {canRetry && (
            <button
              className="check-drivers-button"
              onClick={checkWindowsUpdateService}
              style={{ marginTop: '10px' }}
            >
              Retry Service Check
            </button>
          )}

          {windowsUpdateAvailable.wasStarted && (
            <p className="success-message" style={{ marginTop: '10px', color: '#4caf50' }}>
              Windows Update service was successfully started! You can now check for driver updates.
            </p>
          )}
        </div>

        <button
          className="check-drivers-button"
          onClick={handleCheckDrivers}
          disabled={isChecking || isUpdating}
          style={{ marginTop: '15px' }}
        >
          {isChecking ? (
            <>
              <span className="spinner"></span>
              Checking...
            </>
          ) : (
            'Try Checking for Driver Updates Anyway'
          )}
        </button>

        <p className="info-note" style={{ marginTop: '10px', fontSize: '0.9em', color: '#888' }}>
          Note: This will attempt to use alternative methods (PSWindowsUpdate module or WMI) to detect driver issues.
        </p>
      </div>
    );
  }

  return (
    <div className="driver-updater-card">
      <h2>Driver Updates</h2>
      <p className="driver-description">
        Check for and install outdated device drivers using Windows Update
      </p>

      <button
        className="check-drivers-button"
        onClick={handleCheckDrivers}
        disabled={isChecking || isUpdating}
      >
        {isChecking ? (
          <>
            <span className="spinner"></span>
            Checking...
          </>
        ) : (
          'Check for Driver Updates'
        )}
      </button>

      {checkProgress && (
        <div className="progress-info">
          <div className="progress-text">{checkProgress.status}</div>
        </div>
      )}

      {drivers.length > 0 && (
        <div className="drivers-section">
          <div className="drivers-header">
            <h3>Available Updates ({drivers.length})</h3>
            <div className="selection-controls">
              <button
                className="select-btn"
                onClick={selectAllDrivers}
                disabled={isUpdating}
              >
                Select All
              </button>
              <button
                className="select-btn"
                onClick={deselectAllDrivers}
                disabled={isUpdating}
              >
                Deselect All
              </button>
              <span className="selected-count">
                {selectedDrivers.size} of {drivers.length} selected
              </span>
            </div>
          </div>

          <div className="drivers-list">
            {drivers.map((driver, index) => {
              const driverId = driver.UpdateID || driver.KB || `driver-${index}`;
              return (
                <div
                  key={index}
                  className={`driver-item ${selectedDrivers.has(driverId) ? 'selected' : ''}`}
                  onClick={() => toggleDriverSelection(driverId)}
                >
                  <input
                    type="checkbox"
                    checked={selectedDrivers.has(driverId)}
                    onChange={() => toggleDriverSelection(driverId)}
                    disabled={isUpdating}
                    className="driver-checkbox"
                  />
                  <div className="driver-info">
                    <div className="driver-title">{driver.Title}</div>
                    <div className="driver-meta">
                      {driver.DriverManufacturer && (
                        <span className="driver-manufacturer">
                          {driver.DriverManufacturer}
                        </span>
                      )}
                      {driver.DriverClass && (
                        <span className="driver-class">{driver.DriverClass}</span>
                      )}
                      {driver.KB && (
                        <span className="driver-kb">KB: {driver.KB}</span>
                      )}
                      {driver.Size && (
                        <span className="driver-size">
                          Size: {(driver.Size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            className="update-drivers-button"
            onClick={handleUpdateDrivers}
            disabled={isUpdating || selectedDrivers.size === 0}
          >
            {isUpdating ? (
              <>
                <span className="spinner"></span>
                Updating...
              </>
            ) : (
              `Update Selected Drivers (${selectedDrivers.size})`
            )}
          </button>

          {updateProgress && (
            <div className="progress-info">
              <div className="progress-text">{updateProgress.status}</div>
              {updateProgress.current !== undefined && (
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(updateProgress.current / updateProgress.total) * 100}%`
                    }}
                  ></div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DriverUpdater;
