import React, { useState, useEffect } from 'react';
import './ExtensionRemnantCleaner.css';
import ExtensionRemnantCard from './ExtensionRemnantCard';
import BrowserExtensionTabs from './BrowserExtensionTabs';
import { FiSearch, FiTrash2, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

const ExtensionRemnantCleaner = () => {
  const [selectedBrowser, setSelectedBrowser] = useState('chrome');
  const [remnants, setRemnants] = useState([]);
  const [selectedRemnants, setSelectedRemnants] = useState(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [message, setMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cleaningProgress, setCleaningProgress] = useState(null);
  const [stats, setStats] = useState(null);

  const browsers = [
    { id: 'chrome', name: 'Chrome', color: '#4285f4' },
    { id: 'firefox', name: 'Firefox', color: '#ff7139' },
    { id: 'safari', name: 'Safari', color: '#006cff' },
    { id: 'edge', name: 'Edge', color: '#0078d7' },
    { id: 'brave', name: 'Brave', color: '#fb542b' },
    { id: 'opera', name: 'Opera', color: '#ff1b2d' }
  ];

  useEffect(() => {
    // Scan automatically when browser changes
    handleScan();

    // Load overall stats
    loadStats();
  }, [selectedBrowser]);

  useEffect(() => {
    // Listen for progress updates
    if (window.electronAPI && window.electronAPI.onExtensionCleanProgress) {
      window.electronAPI.onExtensionCleanProgress((progress) => {
        setCleaningProgress(progress);
      });
    }

    return () => {
      if (window.electronAPI && window.electronAPI.removeExtensionCleanProgressListener) {
        window.electronAPI.removeExtensionCleanProgressListener();
      }
    };
  }, []);

  const loadStats = async () => {
    try {
      const result = await window.electronAPI.getExtensionStats();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleScan = async () => {
    setIsScanning(true);
    setMessage(null);
    setRemnants([]);
    setSelectedRemnants(new Set());

    try {
      const result = await window.electronAPI.scanExtensionRemnants(selectedBrowser);

      if (result.success) {
        setRemnants(result.data);

        if (result.data.length === 0) {
          setMessage({
            type: 'success',
            text: `No orphaned extensions found in ${browsers.find(b => b.id === selectedBrowser)?.name}!`
          });
        } else {
          setMessage({
            type: 'info',
            text: `Found ${result.data.length} orphaned extension${result.data.length !== 1 ? 's' : ''} in ${browsers.find(b => b.id === selectedBrowser)?.name}`
          });
        }
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to scan for extension remnants'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to scan for extension remnants'
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleToggleRemnant = (remnantId) => {
    const newSelected = new Set(selectedRemnants);
    if (newSelected.has(remnantId)) {
      newSelected.delete(remnantId);
    } else {
      newSelected.add(remnantId);
    }
    setSelectedRemnants(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRemnants.size === filteredRemnants.length) {
      setSelectedRemnants(new Set());
    } else {
      setSelectedRemnants(new Set(filteredRemnants.map(r => r.id)));
    }
  };

  const handleCleanSelected = async () => {
    if (selectedRemnants.size === 0) {
      setMessage({ type: 'warning', text: 'Please select at least one extension to clean' });
      return;
    }

    if (!confirm(`Are you sure you want to clean ${selectedRemnants.size} orphaned extension${selectedRemnants.size !== 1 ? 's' : ''}? This action will move them to trash.`)) {
      return;
    }

    setIsCleaning(true);
    setMessage(null);
    setCleaningProgress(null);

    try {
      const remnantsToClean = remnants.filter(r => selectedRemnants.has(r.id));
      const result = await window.electronAPI.cleanMultipleExtensionRemnants(remnantsToClean);

      if (result.success) {
        setMessage({
          type: 'success',
          text: `Successfully cleaned ${result.data.totalCleaned} extension${result.data.totalCleaned !== 1 ? 's' : ''}, recovered ${formatBytes(result.data.totalSpaceRecovered)}`
        });

        // Refresh the list
        await handleScan();
        setSelectedRemnants(new Set());
        await loadStats();
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to clean extensions'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to clean extensions'
      });
    } finally {
      setIsCleaning(false);
      setCleaningProgress(null);
    }
  };

  const handleCleanAll = async () => {
    if (remnants.length === 0) {
      return;
    }

    if (!confirm(`Are you sure you want to clean ALL ${remnants.length} orphaned extensions? This action will move them to trash.`)) {
      return;
    }

    // Select all and clean
    setSelectedRemnants(new Set(remnants.map(r => r.id)));
    setTimeout(() => handleCleanSelected(), 100);
  };

  const handleCleanSingle = async (remnant) => {
    if (!confirm(`Are you sure you want to clean "${remnant.name}"? This action will move it to trash.`)) {
      return;
    }

    setIsCleaning(true);
    setMessage(null);

    try {
      const result = await window.electronAPI.cleanExtensionRemnant(remnant.paths);

      if (result.success) {
        setMessage({
          type: 'success',
          text: `Successfully cleaned "${remnant.name}", recovered ${formatBytes(result.data.spaceRecovered)}`
        });

        // Refresh the list
        await handleScan();
        await loadStats();
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to clean extension'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to clean extension'
      });
    } finally {
      setIsCleaning(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTotalSize = () => {
    return filteredRemnants.reduce((sum, r) => sum + r.totalSize, 0);
  };

  const getSelectedSize = () => {
    return remnants
      .filter(r => selectedRemnants.has(r.id))
      .reduce((sum, r) => sum + r.totalSize, 0);
  };

  const filteredRemnants = remnants.filter(remnant =>
    remnant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    remnant.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="extension-remnant-cleaner">
      <div className="extension-header">
        <div className="extension-title-section">
          <h2>Browser Extension Remnant Cleaner</h2>
          <p className="extension-subtitle">
            Remove orphaned extension data from uninstalled browser extensions
          </p>
        </div>

        {stats && (
          <div className="extension-stats-summary">
            <div className="stat-item">
              <span className="stat-value">{stats.totalRemnants}</span>
              <span className="stat-label">Total Remnants</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{formatBytes(stats.totalSize)}</span>
              <span className="stat-label">Total Size</span>
            </div>
          </div>
        )}
      </div>

      <BrowserExtensionTabs
        browsers={browsers}
        selectedBrowser={selectedBrowser}
        onSelectBrowser={setSelectedBrowser}
        stats={stats}
      />

      <div className="extension-controls">
        <div className="search-bar">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search extensions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="action-buttons">
          <button
            onClick={handleScan}
            disabled={isScanning || isCleaning}
            className="btn-scan"
          >
            <FiSearch />
            {isScanning ? 'Scanning...' : 'Re-scan'}
          </button>

          {remnants.length > 0 && (
            <>
              <button
                onClick={handleSelectAll}
                disabled={isCleaning}
                className="btn-select-all"
              >
                {selectedRemnants.size === filteredRemnants.length ? 'Deselect All' : 'Select All'}
              </button>

              <button
                onClick={handleCleanSelected}
                disabled={selectedRemnants.size === 0 || isCleaning}
                className="btn-clean-selected"
              >
                <FiTrash2 />
                Clean Selected ({selectedRemnants.size})
              </button>

              <button
                onClick={handleCleanAll}
                disabled={isCleaning}
                className="btn-clean-all"
              >
                <FiTrash2 />
                Clean All
              </button>
            </>
          )}
        </div>
      </div>

      {message && (
        <div className={`extension-message message-${message.type}`}>
          {message.type === 'success' && <FiCheckCircle />}
          {message.type === 'error' && <FiAlertCircle />}
          {message.type === 'info' && <FiAlertCircle />}
          {message.type === 'warning' && <FiAlertCircle />}
          <span>{message.text}</span>
        </div>
      )}

      {cleaningProgress && (
        <div className="cleaning-progress">
          <div className="progress-info">
            <span>Cleaning: {cleaningProgress.current} / {cleaningProgress.total}</span>
            <span>Recovered: {formatBytes(cleaningProgress.spaceRecovered)}</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(cleaningProgress.current / cleaningProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {remnants.length > 0 && (
        <div className="extension-summary">
          <div className="summary-item">
            <span className="summary-label">
              {filteredRemnants.length} extension{filteredRemnants.length !== 1 ? 's' : ''} found
            </span>
            <span className="summary-value">{formatBytes(getTotalSize())}</span>
          </div>
          {selectedRemnants.size > 0 && (
            <div className="summary-item selected">
              <span className="summary-label">
                {selectedRemnants.size} selected
              </span>
              <span className="summary-value">{formatBytes(getSelectedSize())}</span>
            </div>
          )}
        </div>
      )}

      <div className="extension-list">
        {isScanning ? (
          <div className="extension-loading">
            <div className="loading-spinner"></div>
            <p>Scanning for orphaned extensions...</p>
          </div>
        ) : filteredRemnants.length > 0 ? (
          filteredRemnants.map((remnant) => (
            <ExtensionRemnantCard
              key={remnant.id}
              remnant={remnant}
              isSelected={selectedRemnants.has(remnant.id)}
              onToggle={() => handleToggleRemnant(remnant.id)}
              onClean={() => handleCleanSingle(remnant)}
              disabled={isCleaning}
            />
          ))
        ) : searchQuery ? (
          <div className="extension-empty">
            <FiSearch size={48} />
            <p>No extensions match your search</p>
          </div>
        ) : (
          <div className="extension-empty">
            <FiCheckCircle size={48} />
            <p>No orphaned extensions found</p>
            <span>All extension data is associated with installed extensions</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExtensionRemnantCleaner;
