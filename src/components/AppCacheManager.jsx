import React, { useState, useEffect, useCallback } from 'react';
import './AppCacheManager.css';
import AppCacheCard from './AppCacheCard';
import Message from './Message';

function AppCacheManager() {
  const [apps, setApps] = useState([]);
  const [filteredApps, setFilteredApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedApps, setSelectedApps] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('size');
  const [message, setMessage] = useState(null);
  const [cleaning, setCleaning] = useState(false);
  const [cleanProgress, setCleanProgress] = useState(null);

  // Calculate statistics
  const stats = {
    totalApps: apps.filter(app => app.installed).length,
    totalCache: apps.reduce((sum, app) => sum + (app.installed ? app.cacheSize : 0), 0),
    appsWithCache: apps.filter(app => app.installed && app.cacheSize > 0).length
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // Scan for applications
  const handleScan = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    try {
      const result = await window.electronAPI.scanAppCaches();

      if (result.success) {
        setApps(result.apps);
        setMessage({
          type: 'success',
          text: `Found ${result.apps.filter(a => a.installed).length} installed applications with ${formatSize(result.apps.reduce((sum, app) => sum + app.cacheSize, 0))} of cache`
        });
      } else {
        setMessage({
          type: 'error',
          text: `Scan failed: ${result.error}`
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Scan error: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial scan on mount
  useEffect(() => {
    handleScan();
  }, [handleScan]);

  // Filter and sort apps
  useEffect(() => {
    let filtered = [...apps];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(app =>
        app.name.toLowerCase().includes(query) ||
        app.category.toLowerCase().includes(query) ||
        app.description.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(app => app.category === selectedCategory);
    }

    // Sort apps
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'size':
          return b.cacheSize - a.cacheSize;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return a.category.localeCompare(b.category) || b.cacheSize - a.cacheSize;
        default:
          return 0;
      }
    });

    setFilteredApps(filtered);
  }, [apps, searchQuery, selectedCategory, sortBy]);

  // Get unique categories
  const categories = ['all', ...new Set(apps.map(app => app.category))].sort();

  // Handle app selection
  const handleSelectApp = (appId) => {
    const newSelected = new Set(selectedApps);
    if (newSelected.has(appId)) {
      newSelected.delete(appId);
    } else {
      newSelected.add(appId);
    }
    setSelectedApps(newSelected);
  };

  // Handle select all
  const handleSelectAll = () => {
    const selectableApps = filteredApps.filter(app => app.installed && app.cacheSize > 0);
    if (selectedApps.size === selectableApps.length) {
      setSelectedApps(new Set());
    } else {
      setSelectedApps(new Set(selectableApps.map(app => app.id)));
    }
  };

  // Clean individual app
  const handleCleanApp = async (appId) => {
    setMessage(null);

    const app = apps.find(a => a.id === appId);
    if (!app) return;

    // Check if app is running
    if (app.running) {
      const shouldQuit = window.confirm(
        `${app.name} is currently running. Would you like to quit it before cleaning?`
      );

      if (shouldQuit) {
        const quitResult = await window.electronAPI.quitApp(appId);
        if (!quitResult.success) {
          setMessage({
            type: 'error',
            text: `Failed to quit ${app.name}. Please close it manually and try again.`
          });
          return;
        }

        // Wait a moment for the app to close
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        return;
      }
    }

    try {
      const result = await window.electronAPI.cleanAppCache(appId);

      if (result.success) {
        setMessage({
          type: 'success',
          text: `Cleaned ${app.name}: ${formatSize(result.spaceRecovered)} recovered`
        });

        // Refresh the app list
        await handleScan();

        // Log cleaning event
        try {
          await window.electronAPI.addCleaningEvent({
            category: 'App Cache',
            description: `Cleaned ${app.name} cache`,
            spaceRecovered: result.spaceRecovered
          });
        } catch (err) {
          console.error('Failed to log cleaning event:', err);
        }
      } else {
        if (result.code === 'APP_RUNNING') {
          setMessage({
            type: 'warning',
            text: `${result.appName} is currently running. Please close it and try again.`
          });
        } else {
          setMessage({
            type: 'error',
            text: `Failed to clean ${app.name}: ${result.error}`
          });
        }
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Error cleaning ${app.name}: ${error.message}`
      });
    }
  };

  // Clean selected apps
  const handleCleanSelected = async () => {
    if (selectedApps.size === 0) {
      setMessage({
        type: 'warning',
        text: 'Please select at least one application to clean'
      });
      return;
    }

    const appsToClean = Array.from(selectedApps);
    const runningApps = appsToClean
      .map(id => apps.find(a => a.id === id))
      .filter(app => app && app.running);

    if (runningApps.length > 0) {
      const shouldQuit = window.confirm(
        `The following applications are running:\n\n${runningApps.map(a => '• ' + a.name).join('\n')}\n\nWould you like to quit them before cleaning?`
      );

      if (shouldQuit) {
        for (const app of runningApps) {
          await window.electronAPI.quitApp(app.id);
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        setMessage({
          type: 'warning',
          text: 'Please close running applications before cleaning'
        });
        return;
      }
    }

    setCleaning(true);
    setMessage(null);

    // Listen for progress updates
    window.electronAPI.onAppCacheCleanProgress((progress) => {
      setCleanProgress(progress);
    });

    try {
      const result = await window.electronAPI.cleanMultipleCaches(appsToClean);

      if (result.success) {
        setMessage({
          type: 'success',
          text: `Cleaned ${result.successCount} apps: ${formatSize(result.totalSpaceRecovered)} recovered`
        });

        // Log cleaning event
        try {
          await window.electronAPI.addCleaningEvent({
            category: 'App Cache',
            description: `Cleaned ${result.successCount} application caches`,
            spaceRecovered: result.totalSpaceRecovered
          });
        } catch (err) {
          console.error('Failed to log cleaning event:', err);
        }

        // Clear selection
        setSelectedApps(new Set());

        // Refresh the app list
        await handleScan();
      } else {
        setMessage({
          type: 'error',
          text: `Cleaning failed: ${result.error}`
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Cleaning error: ${error.message}`
      });
    } finally {
      setCleaning(false);
      setCleanProgress(null);
      window.electronAPI.removeAppCacheCleanProgressListener();
    }
  };

  // Clean all apps
  const handleCleanAll = async () => {
    const cleanableApps = apps.filter(app => app.installed && app.cacheSize > 0);

    if (cleanableApps.length === 0) {
      setMessage({
        type: 'info',
        text: 'No caches to clean'
      });
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to clean all ${cleanableApps.length} application caches?\n\nTotal space to recover: ${formatSize(cleanableApps.reduce((sum, app) => sum + app.cacheSize, 0))}`
    );

    if (!confirmed) return;

    setSelectedApps(new Set(cleanableApps.map(app => app.id)));
    await handleCleanSelected();
  };

  // Group apps by category
  const groupedApps = filteredApps.reduce((groups, app) => {
    if (!groups[app.category]) {
      groups[app.category] = [];
    }
    groups[app.category].push(app);
    return groups;
  }, {});

  return (
    <div className="app-cache-manager">
      {/* Summary Stats */}
      <div className="app-cache-summary">
        <div className="summary-stat">
          <span className="stat-value">{stats.totalApps}</span>
          <span className="stat-label">Apps Installed</span>
        </div>
        <div className="summary-stat">
          <span className="stat-value">{stats.appsWithCache}</span>
          <span className="stat-label">With Cache</span>
        </div>
        <div className="summary-stat highlight">
          <span className="stat-value">{formatSize(stats.totalCache)}</span>
          <span className="stat-label">Total Cache</span>
        </div>
      </div>

      {/* Controls */}
      <div className="app-cache-controls">
        <div className="search-filter-row">
          <div className="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search applications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-select"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="size">Sort by Size</option>
              <option value="name">Sort by Name</option>
              <option value="category">Sort by Category</option>
            </select>
          </div>

          <button
            className="refresh-button"
            onClick={handleScan}
            disabled={loading}
          >
            <svg className={loading ? 'spinning' : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
            {loading ? 'Scanning...' : 'Refresh'}
          </button>
        </div>

        <div className="action-row">
          <div className="selection-info">
            <label className="select-all-checkbox">
              <input
                type="checkbox"
                checked={selectedApps.size > 0 && selectedApps.size === filteredApps.filter(app => app.installed && app.cacheSize > 0).length}
                onChange={handleSelectAll}
              />
              <span>
                {selectedApps.size > 0
                  ? `${selectedApps.size} selected`
                  : 'Select All'}
              </span>
            </label>
          </div>

          <div className="action-buttons">
            <button
              className="clean-selected-button"
              onClick={handleCleanSelected}
              disabled={selectedApps.size === 0 || cleaning}
            >
              {cleaning ? (
                <>
                  <svg className="spinner" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="3" />
                  </svg>
                  Cleaning... ({cleanProgress?.percentage || 0}%)
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                  Clean Selected
                </>
              )}
            </button>

            <button
              className="clean-all-button"
              onClick={handleCleanAll}
              disabled={stats.appsWithCache === 0 || cleaning}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              Clean All
            </button>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <Message
          type={message.type}
          message={message.text}
          onClose={() => setMessage(null)}
        />
      )}

      {/* App Grid */}
      {loading ? (
        <div className="loading-state">
          <svg className="loading-spinner" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="3" />
          </svg>
          <p>Scanning applications...</p>
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
          <h3>No applications found</h3>
          <p>Try adjusting your search or category filter</p>
        </div>
      ) : (
        <div className="app-categories-container">
          {selectedCategory === 'all' ? (
            // Grouped by category
            Object.entries(groupedApps)
              .sort(([catA], [catB]) => catA.localeCompare(catB))
              .map(([category, categoryApps]) => (
                <div key={category} className="app-category-group">
                  <div className="category-header">
                    <h2 className="category-title">{category}</h2>
                    <span className="category-count">
                      {categoryApps.filter(a => a.installed).length} apps •{' '}
                      {formatSize(categoryApps.reduce((sum, app) => sum + app.cacheSize, 0))}
                    </span>
                  </div>
                  <div className="app-grid">
                    {categoryApps.map(app => (
                      <AppCacheCard
                        key={app.id}
                        app={app}
                        onClean={handleCleanApp}
                        onSelect={handleSelectApp}
                        selected={selectedApps.has(app.id)}
                      />
                    ))}
                  </div>
                </div>
              ))
          ) : (
            // Single category view
            <div className="app-grid">
              {filteredApps.map(app => (
                <AppCacheCard
                  key={app.id}
                  app={app}
                  onClean={handleCleanApp}
                  onSelect={handleSelectApp}
                  selected={selectedApps.has(app.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AppCacheManager;
