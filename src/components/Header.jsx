import React from 'react';
import './Header.css';
import { BsMoon, BsSun } from 'react-icons/bs';
import { useTheme } from '../context/ThemeContext';

function Header({ systemInfo }) {
  const { toggleTheme, isDark } = useTheme();

  const getPlatformName = (platform) => {
    switch (platform) {
      case 'darwin': return 'macOS';
      case 'win32': return 'Windows';
      case 'linux': return 'Linux';
      default: return platform;
    }
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <h1>System Cleaner</h1>
        </div>
        <div className="header-right">
          {systemInfo && (
            <div className="system-badge">
              {getPlatformName(systemInfo.platform)} {systemInfo.version}
            </div>
          )}
          <button
            onClick={toggleTheme}
            className="theme-toggle-button"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <BsSun /> : <BsMoon />}
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
