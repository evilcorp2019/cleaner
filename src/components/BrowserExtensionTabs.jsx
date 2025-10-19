import React from 'react';
import './BrowserExtensionTabs.css';

const BrowserExtensionTabs = ({ browsers, selectedBrowser, onSelectBrowser, stats }) => {
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getBrowserStats = (browserId) => {
    if (!stats || !stats.browsers || !stats.browsers[browserId]) {
      return null;
    }
    return stats.browsers[browserId];
  };

  return (
    <div className="browser-extension-tabs">
      {browsers.map((browser) => {
        const browserStats = getBrowserStats(browser.id);
        const isSelected = selectedBrowser === browser.id;
        const hasRemnants = browserStats && browserStats.remnantsCount > 0;

        return (
          <button
            key={browser.id}
            className={`browser-tab ${isSelected ? 'active' : ''} ${hasRemnants ? 'has-remnants' : ''}`}
            onClick={() => onSelectBrowser(browser.id)}
            style={{
              '--browser-color': browser.color
            }}
          >
            <div className="browser-tab-main">
              <span className="browser-name">{browser.name}</span>

              {browserStats && (
                <div className="browser-stats">
                  {browserStats.remnantsCount > 0 ? (
                    <>
                      <span className="remnant-count">{browserStats.remnantsCount}</span>
                      <span className="remnant-size">{formatBytes(browserStats.totalSize)}</span>
                    </>
                  ) : (
                    <span className="no-remnants">Clean</span>
                  )}
                </div>
              )}
            </div>

            {isSelected && <div className="tab-indicator" style={{ background: browser.color }} />}
          </button>
        );
      })}
    </div>
  );
};

export default BrowserExtensionTabs;
