import React, { useState, useEffect } from 'react';
import './BrowserCleaner.css';
import { SiGooglechrome, SiFirefox, SiSafari, SiOpera, SiBrave } from 'react-icons/si';
import { TbBrandEdge } from 'react-icons/tb';
import { useProcessPolling } from '../hooks/useProcessPolling';
import Message from './Message';
import TutorialModal from './TutorialModal';
import StepIndicator from './StepIndicator';
import PrivacyScore from './PrivacyScore';
import StorageVisualization from './StorageVisualization';
import CleaningHistory from './CleaningHistory';

const BROWSER_ICONS = {
  chrome: <SiGooglechrome />,
  firefox: <SiFirefox />,
  edge: <TbBrandEdge />,
  safari: <SiSafari />,
  opera: <SiOpera />,
  brave: <SiBrave />
};

const DATA_TYPES = [
  { id: 'cache', label: 'Cache', description: 'Temporary files and cached data' },
  { id: 'cookies', label: 'Cookies', description: 'Website cookies and login data' },
  { id: 'history', label: 'History', description: 'Browsing history' },
  { id: 'downloads', label: 'Downloads', description: 'Download history' },
  { id: 'formData', label: 'Form Data', description: 'Autofill and form data' },
  { id: 'session', label: 'Session', description: 'Session and local storage' }
];

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function BrowserCleaner({ onBack }) {
  const [browsers, setBrowsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrowsers, setSelectedBrowsers] = useState(new Set());
  const [selectedDataTypes, setSelectedDataTypes] = useState(new Set(['cache']));
  const [preserveCookies, setPreserveCookies] = useState(false);
  const [cookieWhitelist, setCookieWhitelist] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleanResults, setCleanResults] = useState(null);

  // New state for UX improvements
  const [showTutorial, setShowTutorial] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [quittingBrowser, setQuittingBrowser] = useState(null);
  const [quitError, setQuitError] = useState(null);
  const [browserRunningStates, setBrowserRunningStates] = useState({});

  // State for data types to clean after analysis
  const [dataTypesToClean, setDataTypesToClean] = useState(new Set());

  useEffect(() => {
    detectBrowsers();

    // Check if tutorial should be shown (first time)
    const tutorialSeen = localStorage.getItem('browserCleanerTutorialSeen');
    if (!tutorialSeen) {
      setShowTutorial(true);
    }
  }, []);

  const detectBrowsers = async () => {
    if (!window.electronAPI) {
      alert('This feature requires the desktop application. Please run the app with "npm run dev"');
      setLoading(false);
      return;
    }

    try {
      const result = await window.electronAPI.detectBrowsers();

      if (result.success) {
        setBrowsers(result.data);
        // Auto-select all browsers that are not running
        const notRunning = result.data.filter(b => !b.isRunning).map(b => b.id);
        setSelectedBrowsers(new Set(notRunning));
      } else {
        alert('Failed to detect browsers: ' + result.error);
      }
    } catch (error) {
      alert('Error detecting browsers: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleBrowser = (browserId) => {
    setSelectedBrowsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(browserId)) {
        newSet.delete(browserId);
      } else {
        newSet.add(browserId);
      }
      return newSet;
    });
  };

  const toggleDataType = (dataTypeId) => {
    setSelectedDataTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dataTypeId)) {
        newSet.delete(dataTypeId);
      } else {
        newSet.add(dataTypeId);
      }
      return newSet;
    });
  };

  const selectAllDataTypesForAnalysis = () => {
    setSelectedDataTypes(new Set(DATA_TYPES.map(dt => dt.id)));
  };

  const clearAllDataTypes = () => {
    setSelectedDataTypes(new Set());
  };

  const handleQuitBrowser = async (browserId, browserName) => {
    setQuittingBrowser(browserId);
    setQuitError(null);

    try {
      const result = await window.electronAPI.quitBrowser(browserId);

      if (result.success) {
        // Refresh browser list to update running status
        await detectBrowsers();
      } else {
        setQuitError({
          browserId,
          browserName,
          message: result.message,
          code: result.code
        });
      }
    } catch (error) {
      setQuitError({
        browserId,
        browserName,
        message: error.message,
        code: 'QUIT_ERROR'
      });
    } finally {
      setQuittingBrowser(null);
    }
  };

  const toggleDataTypeToClean = (dataTypeId) => {
    setDataTypesToClean(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dataTypeId)) {
        newSet.delete(dataTypeId);
      } else {
        newSet.add(dataTypeId);
      }
      return newSet;
    });
  };

  const selectAllDataTypes = () => {
    const allTypes = new Set();
    if (analysis) {
      analysis.forEach(browserAnalysis => {
        Object.keys(browserAnalysis.dataTypes).forEach(type => {
          allTypes.add(type);
        });
      });
    }
    setDataTypesToClean(allTypes);
  };

  const deselectAllDataTypes = () => {
    setDataTypesToClean(new Set());
  };

  const handleAnalyze = async () => {
    if (selectedBrowsers.size === 0) {
      alert('Please select at least one browser');
      return;
    }

    if (selectedDataTypes.size === 0) {
      alert('Please select at least one data type');
      return;
    }

    setAnalyzing(true);
    setAnalysis(null);
    setCleanResults(null);

    try {
      const analyses = [];

      for (const browserId of selectedBrowsers) {
        const result = await window.electronAPI.analyzeBrowserData(
          browserId,
          Array.from(selectedDataTypes)
        );

        if (result.success) {
          analyses.push(result.data);
        }
      }

      setAnalysis(analyses);

      // Automatically select all analyzed data types for cleaning
      const allAnalyzedTypes = new Set();
      analyses.forEach(browserAnalysis => {
        Object.keys(browserAnalysis.dataTypes).forEach(type => {
          allAnalyzedTypes.add(type);
        });
      });
      setDataTypesToClean(allAnalyzedTypes);
    } catch (error) {
      alert('Analysis error: ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleClean = async () => {
    if (!analysis || analysis.length === 0) {
      alert('Please analyze first to see what will be cleaned');
      return;
    }

    if (dataTypesToClean.size === 0) {
      alert('Please select at least one data type to clean from the analysis results');
      return;
    }

    // Calculate total size only for selected data types
    let totalSize = 0;
    analysis.forEach(browserAnalysis => {
      Object.entries(browserAnalysis.dataTypes).forEach(([type, data]) => {
        if (dataTypesToClean.has(type)) {
          totalSize += data.size;
        }
      });
    });
    const formattedSize = formatBytes(totalSize);

    // Check if any browsers are running
    const runningBrowsers = browsers.filter(b =>
      selectedBrowsers.has(b.id) && b.isRunning
    );

    if (runningBrowsers.length > 0) {
      alert(
        `The following browsers are currently running and must be closed first:\n\n` +
        runningBrowsers.map(b => `- ${b.name}`).join('\n') +
        `\n\nPlease close them and try again.`
      );
      return;
    }

    const dataTypesList = Array.from(dataTypesToClean)
      .map(dt => DATA_TYPES.find(t => t.id === dt)?.label)
      .join(', ');

    if (!confirm(
      `Clean browser data?\n\n` +
      `Browsers: ${analysis.length}\n` +
      `Data types: ${dataTypesList}\n` +
      `Space to free: ${formattedSize}\n\n` +
      (dataTypesToClean.has('cookies') && !preserveCookies
        ? `WARNING: This will delete ALL cookies and you'll be logged out of websites.\n\n`
        : '') +
      `This action cannot be undone. Continue?`
    )) {
      return;
    }

    setCleaning(true);
    setCleanResults(null);

    try {
      const results = [];

      for (const browserId of selectedBrowsers) {
        const options = {
          preserveCookies: preserveCookies && dataTypesToClean.has('cookies'),
          cookieWhitelist: cookieWhitelist.split(',').map(s => s.trim()).filter(Boolean)
        };

        const result = await window.electronAPI.cleanBrowserData(
          browserId,
          Array.from(dataTypesToClean),
          options
        );

        if (result.success) {
          results.push(result.data);
        } else {
          alert(`Failed to clean ${browserId}: ${result.error}`);
        }
      }

      setCleanResults(results);

      const totalFreed = results.reduce((sum, r) => sum + r.totalFreed, 0);
      const totalCleaned = results.reduce((sum, r) => sum + r.cleaned.length, 0);
      const totalFailed = results.reduce((sum, r) => sum + r.failed.length, 0);

      // Save cleaning event to history
      try {
        const browsersСleaned = Array.from(selectedBrowsers).map(id => {
          const browser = browsers.find(b => b.id === id);
          return browser ? browser.name : id;
        });

        const privacyScoreBefore = analysis[0]?.privacyScore?.score;
        const trackersRemoved = analysis.reduce((sum, a) => sum + (a.trackersFound || 0), 0);

        await window.electronAPI.addCleaningEvent({
          timestamp: Date.now(),
          browsersСleaned: browsersСleaned,
          dataTypes: Array.from(dataTypesToClean),
          spaceSavedBytes: totalFreed,
          spaceSavedFormatted: formatBytes(totalFreed),
          itemsCleaned: totalCleaned,
          itemsFailed: totalFailed,
          privacyScoreBefore: privacyScoreBefore,
          privacyScoreAfter: null, // Will be calculated after re-analysis
          trackersRemoved: trackersRemoved
        });
      } catch (error) {
        console.error('Failed to save cleaning event:', error);
      }

      alert(
        `Cleaning completed!\n\n` +
        `Items cleaned: ${totalCleaned}\n` +
        `Space freed: ${formatBytes(totalFreed)}` +
        (totalFailed > 0 ? `\n\nFailed items: ${totalFailed}` : '')
      );

      // Refresh analysis
      handleAnalyze();
    } catch (error) {
      alert('Cleaning error: ' + error.message);
    } finally {
      setCleaning(false);
    }
  };

  const getTotalAnalysisSize = () => {
    if (!analysis) return '0 Bytes';
    const total = analysis.reduce((sum, a) => sum + a.totalSize, 0);
    return formatBytes(total);
  };

  if (loading) {
    return (
      <div className="browser-cleaner">
        <div className="cleaner-header">
          <button onClick={onBack} className="back-button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back
          </button>
          <h1>Browser Cleaner</h1>
        </div>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Detecting browsers...</p>
        </div>
      </div>
    );
  }

  if (browsers.length === 0) {
    return (
      <div className="browser-cleaner">
        <div className="cleaner-header">
          <button onClick={onBack} className="back-button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back
          </button>
          <h1>Browser Cleaner</h1>
        </div>
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <h2>No browsers detected</h2>
          <p>No supported browsers were found on your system.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="browser-cleaner">
      {/* Tutorial Modal */}
      <TutorialModal
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
      />

      <div className="cleaner-header">
        <button onClick={onBack} className="back-button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
        <h1>Browser Cleaner</h1>
        <div className="header-actions">
          <button onClick={() => setShowHistory(true)} className="history-button" title="View cleaning history">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>
          <button onClick={() => setShowTutorial(true)} className="help-button" title="Show tutorial">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </button>
        </div>
      </div>

      {/* Cleaning History Modal */}
      <CleaningHistory
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />

      <div className="cleaner-content">
        {/* Browser Selection - Compact List */}
        <section className="section">
          <h2>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '18px', height: '18px'}}>
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Select Browsers
            <span style={{marginLeft: 'auto', fontSize: '13px', fontWeight: '500', color: '#86868b'}}>
              {selectedBrowsers.size} selected
            </span>
          </h2>
          <div className="browser-grid">
            {browsers.map(browser => (
              <div
                key={browser.id}
                data-browser={browser.id}
                className={`browser-card ${selectedBrowsers.has(browser.id) ? 'selected' : ''} ${browser.isRunning ? 'running' : ''}`}
                onClick={() => !browser.isRunning && toggleBrowser(browser.id)}
              >
                <div className="browser-icon">
                  {BROWSER_ICONS[browser.id]}
                </div>
                <div className="browser-info">
                  <h3>{browser.name}</h3>
                  {browser.isRunning && (
                    <span className="running-badge">
                      <span className="pulse-dot"></span>
                      Running
                    </span>
                  )}
                </div>
                {browser.isRunning ? (
                  <button
                    className="quit-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuitBrowser(browser.id, browser.name);
                    }}
                    disabled={quittingBrowser === browser.id}
                  >
                    {quittingBrowser === browser.id ? (
                      <>
                        <div className="button-spinner"></div>
                        Quitting...
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
                          <line x1="12" y1="2" x2="12" y2="12"/>
                        </svg>
                        Quit {browser.name.split(' ')[0]}
                      </>
                    )}
                  </button>
                ) : selectedBrowsers.has(browser.id) && (
                  <div className="check-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
          {browsers.some(b => b.isRunning) && !quitError && (
            <Message
              type="warning"
              title="Browsers Must Be Closed"
              message="Running browsers cannot be cleaned. Click the 'Quit' button on each browser to automatically close them."
            />
          )}
          {quitError && (
            <Message
              type="error"
              title={`Failed to Quit ${quitError.browserName}`}
              message={quitError.message}
              onDismiss={() => setQuitError(null)}
            />
          )}
        </section>

        {/* Data Type Selection - Compact Grid */}
        <section className="section">
          <h2>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '18px', height: '18px'}}>
              <path d="M9 2v6h6V2M9 16v6h6v-6M3 9v6h6V9m12 0v6h6V9"/>
            </svg>
            Select Data Types
            <span style={{marginLeft: 'auto', fontSize: '13px', fontWeight: '500', color: '#86868b'}}>
              {selectedDataTypes.size} selected
            </span>
          </h2>

          <div className="quick-actions">
            <button className="quick-action-btn" onClick={selectAllDataTypesForAnalysis}>
              Select All
            </button>
            <button className="quick-action-btn" onClick={clearAllDataTypes}>
              Clear All
            </button>
          </div>

          <div className="data-types-grid">
            {DATA_TYPES.map(dataType => (
              <div
                key={dataType.id}
                className={`data-type-card ${selectedDataTypes.has(dataType.id) ? 'selected' : ''}`}
                onClick={() => toggleDataType(dataType.id)}
              >
                {selectedDataTypes.has(dataType.id) && (
                  <div className="check-icon-small">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                )}
                <div className="data-type-header">
                  <h3>{dataType.label}</h3>
                  <p>{dataType.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Cookie Options - Collapsible */}
        {selectedDataTypes.has('cookies') && (
          <section className="section cookie-options">
            <h2>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '18px', height: '18px'}}>
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v12M6 12h12"/>
              </svg>
              Cookie Options
            </h2>
            <div className="option-card">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={preserveCookies}
                  onChange={(e) => setPreserveCookies(e.target.checked)}
                />
                <span>Preserve login cookies (Domain whitelist)</span>
              </label>
              {preserveCookies && (
                <div className="whitelist-input">
                  <label>Whitelist domains (comma-separated):</label>
                  <input
                    type="text"
                    placeholder="example.com, github.com, gmail.com"
                    value={cookieWhitelist}
                    onChange={(e) => setCookieWhitelist(e.target.value)}
                  />
                  <small>Note: Cookie whitelist is currently in development and will preserve all cookies if enabled.</small>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Analysis Results - Enhanced Display */}
        {analysis && analysis.length > 0 && (
          <section className="section">
            <h2>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '18px', height: '18px'}}>
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
              Analysis Results
              <span style={{marginLeft: 'auto', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)'}}>
                {dataTypesToClean.size} selected to clean
              </span>
            </h2>

            {/* Privacy Score - Show combined score if analyzing multiple browsers */}
            {analysis.length > 0 && analysis[0].privacyScore && (
              <div style={{marginBottom: '16px'}}>
                <PrivacyScore scoreData={analysis[0].privacyScore} />
              </div>
            )}

            {/* Quick Actions */}
            <div className="quick-actions">
              <button className="quick-action-btn" onClick={selectAllDataTypes}>
                Select All
              </button>
              <button className="quick-action-btn" onClick={deselectAllDataTypes}>
                Deselect All
              </button>
            </div>

            <div className="analysis-summary">
              <div className="summary-card">
                <div>
                  <h3>Total Space to Free</h3>
                  <div className="size-display">{getTotalAnalysisSize()}</div>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '48px', height: '48px', opacity: 0.2}}>
                  <path d="M3 6h18"/>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
              </div>
            </div>

            {/* Storage Visualization */}
            <StorageVisualization analysis={analysis} />

            <div className="analysis-details">
              {analysis.map(browserAnalysis => (
                <div key={browserAnalysis.browser} className="browser-analysis">
                  <h3>{browserAnalysis.browserName}</h3>
                  <div className="analysis-items">
                    {Object.entries(browserAnalysis.dataTypes).map(([type, data]) => (
                      <div
                        key={type}
                        className={`analysis-item ${dataTypesToClean.has(type) ? 'selected' : ''}`}
                        onClick={() => toggleDataTypeToClean(type)}
                        style={{cursor: 'pointer'}}
                      >
                        <input
                          type="checkbox"
                          checked={dataTypesToClean.has(type)}
                          onChange={() => toggleDataTypeToClean(type)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="type-name">
                          {DATA_TYPES.find(dt => dt.id === type)?.label || type}
                        </span>
                        <span className="type-size">{data.sizeFormatted}</span>
                      </div>
                    ))}
                  </div>
                  <div className="browser-total">
                    Total: {browserAnalysis.totalSizeFormatted}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Action Buttons */}
        <div className="action-buttons">
          <button
            onClick={handleAnalyze}
            disabled={analyzing || cleaning || selectedBrowsers.size === 0}
            className="analyze-button"
          >
            {analyzing ? (
              <>
                <div className="button-spinner"></div>
                Analyzing...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
                Analyze
              </>
            )}
          </button>

          <button
            onClick={handleClean}
            disabled={cleaning || !analysis || analysis.length === 0}
            className="clean-button"
          >
            {cleaning ? (
              <>
                <div className="button-spinner"></div>
                Cleaning...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
                Clean Now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BrowserCleaner;
