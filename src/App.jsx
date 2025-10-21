import React, { useState, useEffect } from 'react';
import './App.css';
import './styles/themes.css';
import { ThemeProvider } from './context/ThemeContext';
import Header from './components/Header';
import Home from './pages/Home';
import CleanerPage from './pages/CleanerPage';
import BrowserCleanerPage from './pages/BrowserCleanerPage';
import DuplicateFinderPage from './pages/DuplicateFinderPage';
import DriverUpdaterPage from './pages/DriverUpdaterPage';
import SystemUpdaterPage from './pages/SystemUpdaterPage';
import LargeFileFinderPage from './pages/LargeFileFinderPage';
import AppCacheManagerPage from './pages/AppCacheManagerPage';
import ScheduledCleaningPage from './pages/ScheduledCleaningPage';
import StartupManagerPage from './pages/StartupManagerPage';
import ExtensionRemnantCleanerPage from './pages/ExtensionRemnantCleanerPage';

function App() {
  const [systemInfo, setSystemInfo] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('[APP] window.electronAPI:', window.electronAPI);
    if (window.electronAPI) {
      console.log('[APP] Desktop API detected, fetching system info');
      window.electronAPI.getSystemInfo().then(info => {
        console.log('[APP] System info received:', info);
        setSystemInfo(info);
        setIsLoading(false);
      }).catch(err => {
        console.error('[APP] Failed to get system info:', err);
        setIsLoading(false);
      });
    } else {
      console.warn('[APP] Desktop API not available - running in browser mode');
      // Mock data for development/testing
      setSystemInfo({
        platform: 'browser',
        arch: 'unknown',
        version: 'N/A'
      });
      setIsLoading(false);
    }
  }, []);

  const handleNavigate = (page) => {
    // Prevent navigation to Windows-only pages on non-Windows platforms
    if (page === 'driver-updater' && systemInfo?.platform !== 'win32') {
      console.warn('[APP] Blocked navigation to driver-updater - not on Windows');
      return;
    }
    setCurrentPage(page);
  };

  const handleBack = () => {
    setCurrentPage('home');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'cleaner':
        return <CleanerPage onBack={handleBack} />;
      case 'browser-cleaner':
        return <BrowserCleanerPage onBack={handleBack} />;
      case 'duplicate-finder':
        return <DuplicateFinderPage onBack={handleBack} />;
      case 'large-file-finder':
        return <LargeFileFinderPage onBack={handleBack} />;
      case 'app-cache-manager':
        return <AppCacheManagerPage onBack={handleBack} />;
      case 'scheduled-cleaning':
        return <ScheduledCleaningPage onBack={handleBack} />;
      case 'startup-manager':
        return <StartupManagerPage onBack={handleBack} />;
      case 'extension-remnant-cleaner':
        return <ExtensionRemnantCleanerPage onBack={handleBack} />;
      case 'driver-updater':
        return <DriverUpdaterPage systemInfo={systemInfo} onBack={handleBack} />;
      case 'system-updater':
        return <SystemUpdaterPage systemInfo={systemInfo} onBack={handleBack} />;
      case 'home':
      default:
        return <Home systemInfo={systemInfo} onNavigate={handleNavigate} />;
    }
  };

  if (isLoading) {
    return (
      <ThemeProvider>
        <div className="app">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid rgba(100, 100, 255, 0.2)',
              borderTop: '4px solid rgb(100, 100, 255)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>Loading System Cleaner...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="app">
        <Header systemInfo={systemInfo} />
        {!window.electronAPI && (
          <div className="app-warning-banner">
            <div className="warning-content">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div className="warning-text">
                <strong>Wrong Window! Close This Browser Tab</strong>
                <p>
                  You've opened this app in a web browser, but it needs to run as a desktop application.
                  <strong> Please close this browser tab</strong> and look for the separate "System Cleaner" application window.
                  If you don't see it, run <code>npm run dev</code> in your terminal to start it.
                </p>
              </div>
              <button
                className="close-tab-button"
                onClick={() => {
                  if (confirm('This will close this browser tab. Make sure the application window is visible!')) {
                    window.close();
                  }
                }}
              >
                Close This Tab
              </button>
            </div>
          </div>
        )}
        <div className="page-container">
          {renderPage()}
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
