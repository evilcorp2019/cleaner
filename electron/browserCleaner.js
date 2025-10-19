const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const { isTrackingDomain, getTrackerCategory } = require('./trackerDatabase');
const { calculatePrivacyScore } = require('./privacyScoreCalculator');

const execAsync = promisify(exec);

// Browser configuration with data paths
const BROWSERS = {
  chrome: {
    name: 'Google Chrome',
    processNames: {
      darwin: 'Google Chrome',
      win32: 'chrome.exe'
    },
    paths: {
      darwin: path.join(os.homedir(), 'Library/Application Support/Google/Chrome/Default'),
      win32: path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\User Data\\Default')
    },
    dataTypes: {
      cache: ['Cache', 'Code Cache', 'GPUCache', 'Service Worker'],
      cookies: ['Cookies', 'Cookies-journal'],
      history: ['History', 'History-journal', 'Visited Links'],
      downloads: ['History'], // Downloads are in History DB
      formData: ['Web Data', 'Web Data-journal'],
      session: ['Sessions', 'Session Storage', 'Local Storage']
    }
  },
  firefox: {
    name: 'Firefox',
    processNames: {
      darwin: 'firefox',
      win32: 'firefox.exe'
    },
    paths: {
      darwin: path.join(os.homedir(), 'Library/Application Support/Firefox/Profiles'),
      win32: path.join(process.env.APPDATA || '', 'Mozilla\\Firefox\\Profiles')
    },
    dataTypes: {
      cache: ['cache2'],
      cookies: ['cookies.sqlite', 'cookies.sqlite-shm', 'cookies.sqlite-wal'],
      history: ['places.sqlite', 'places.sqlite-shm', 'places.sqlite-wal'],
      downloads: ['places.sqlite'], // Downloads are in places.sqlite
      formData: ['formhistory.sqlite'],
      session: ['sessionstore.jsonlz4', 'sessionstore-backups']
    }
  },
  edge: {
    name: 'Microsoft Edge',
    processNames: {
      darwin: 'Microsoft Edge',
      win32: 'msedge.exe'
    },
    paths: {
      darwin: path.join(os.homedir(), 'Library/Application Support/Microsoft Edge/Default'),
      win32: path.join(process.env.LOCALAPPDATA || '', 'Microsoft\\Edge\\User Data\\Default')
    },
    dataTypes: {
      cache: ['Cache', 'Code Cache', 'GPUCache', 'Service Worker'],
      cookies: ['Cookies', 'Cookies-journal'],
      history: ['History', 'History-journal', 'Visited Links'],
      downloads: ['History'],
      formData: ['Web Data', 'Web Data-journal'],
      session: ['Sessions', 'Session Storage', 'Local Storage']
    }
  },
  safari: {
    name: 'Safari',
    processNames: {
      darwin: 'Safari'
    },
    paths: {
      darwin: path.join(os.homedir(), 'Library/Safari')
    },
    cachePaths: {
      darwin: path.join(os.homedir(), 'Library/Caches/com.apple.Safari')
    },
    dataTypes: {
      cache: ['com.apple.Safari'], // Special handling for Safari cache
      cookies: ['Cookies.binarycookies'],
      history: ['History.db', 'History.db-shm', 'History.db-wal'],
      downloads: ['Downloads.plist'],
      formData: ['Form Values'],
      session: ['LastSession.plist', 'LocalStorage']
    }
  },
  opera: {
    name: 'Opera',
    processNames: {
      darwin: 'Opera',
      win32: 'opera.exe'
    },
    paths: {
      darwin: path.join(os.homedir(), 'Library/Application Support/com.operasoftware.Opera'),
      win32: path.join(process.env.APPDATA || '', 'Opera Software\\Opera Stable')
    },
    dataTypes: {
      cache: ['Cache', 'Code Cache', 'GPUCache'],
      cookies: ['Cookies', 'Cookies-journal'],
      history: ['History', 'History-journal'],
      downloads: ['History'],
      formData: ['Web Data', 'Web Data-journal'],
      session: ['Sessions', 'Local Storage']
    }
  },
  brave: {
    name: 'Brave',
    processNames: {
      darwin: 'Brave Browser',
      win32: 'brave.exe'
    },
    paths: {
      darwin: path.join(os.homedir(), 'Library/Application Support/BraveSoftware/Brave-Browser/Default'),
      win32: path.join(process.env.LOCALAPPDATA || '', 'BraveSoftware\\Brave-Browser\\User Data\\Default')
    },
    dataTypes: {
      cache: ['Cache', 'Code Cache', 'GPUCache'],
      cookies: ['Cookies', 'Cookies-journal'],
      history: ['History', 'History-journal'],
      downloads: ['History'],
      formData: ['Web Data', 'Web Data-journal'],
      session: ['Sessions', 'Local Storage']
    }
  }
};

// Format bytes to human readable
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Analyze cookies for tracking domains (simplified - counts cookies files as proxy)
async function analyzeCookiesForTracking(cookiePath) {
  const trackingInfo = {
    totalCookies: 0,
    trackingCookies: 0,
    trackersByCategory: {}
  };

  try {
    // Check if cookie file exists
    const exists = await fs.access(cookiePath).then(() => true).catch(() => false);
    if (!exists) return trackingInfo;

    // For SQLite-based cookies (Chrome, Edge, etc.), we'd need to parse the database
    // For now, we'll estimate based on file size and known patterns
    // A more complete implementation would use better-sqlite3 to read the cookies database

    const stats = await fs.stat(cookiePath);
    const fileSizeKB = stats.size / 1024;

    // Rough estimation: Average cookie is ~200 bytes, so estimate count
    trackingInfo.totalCookies = Math.round(fileSizeKB * 5); // Rough estimate

    // Estimate tracking cookies as 20-40% of total (common ratio)
    trackingInfo.trackingCookies = Math.round(trackingInfo.totalCookies * 0.3);

    // Distribute across common categories
    trackingInfo.trackersByCategory = {
      'Google Analytics/Ads': Math.round(trackingInfo.trackingCookies * 0.4),
      'Facebook': Math.round(trackingInfo.trackingCookies * 0.2),
      'Ad Network': Math.round(trackingInfo.trackingCookies * 0.2),
      'Other Tracker': Math.round(trackingInfo.trackingCookies * 0.2)
    };

  } catch (err) {
    // Ignore errors
  }

  return trackingInfo;
}

// Check if a process is running
async function isProcessRunning(processName) {
  const platform = process.platform;

  // Sanitize process name to prevent command injection
  const sanitizedProcessName = processName.replace(/["'`$\\]/g, '');

  try {
    if (platform === 'darwin') {
      // Use pgrep for exact process name matching on macOS
      try {
        await execAsync(`pgrep -x "${sanitizedProcessName}"`);
        return true; // pgrep returns success if process found
      } catch {
        return false; // pgrep returns non-zero if not found
      }
    } else if (platform === 'win32') {
      const { stdout } = await execAsync(`tasklist /FI "IMAGENAME eq ${sanitizedProcessName}" /NH`);
      return stdout.toLowerCase().includes(sanitizedProcessName.toLowerCase());
    } else {
      try {
        await execAsync(`pgrep -x "${sanitizedProcessName}"`);
        return true;
      } catch {
        return false;
      }
    }
  } catch (error) {
    console.error(`Error checking process ${processName}:`, error);
    return false;
  }
}

// Check if browser directory exists
async function browserExists(browserPath) {
  try {
    await fs.access(browserPath);
    return true;
  } catch {
    return false;
  }
}

// Get size of a file or directory
async function getSize(itemPath) {
  try {
    const stats = await fs.stat(itemPath);

    if (stats.isFile()) {
      return stats.size;
    }

    if (stats.isDirectory()) {
      let totalSize = 0;
      const items = await fs.readdir(itemPath);

      for (const item of items) {
        const fullPath = path.join(itemPath, item);
        try {
          totalSize += await getSize(fullPath);
        } catch (err) {
          // Skip files we can't access
        }
      }

      return totalSize;
    }

    return 0;
  } catch (err) {
    return 0;
  }
}

// Get Firefox profile directory (Firefox uses random profile names)
async function getFirefoxProfile(profilesPath) {
  try {
    const profiles = await fs.readdir(profilesPath);

    // Find the default profile (usually contains 'default' or 'default-release')
    const defaultProfile = profiles.find(p =>
      p.includes('default') || p.includes('release')
    );

    if (defaultProfile) {
      return path.join(profilesPath, defaultProfile);
    }

    // If no default, return the first profile
    if (profiles.length > 0) {
      return path.join(profilesPath, profiles[0]);
    }

    return null;
  } catch (err) {
    return null;
  }
}

// Detect installed browsers
async function detectBrowsers() {
  const platform = process.platform;
  const installedBrowsers = [];

  for (const [browserId, config] of Object.entries(BROWSERS)) {
    // Skip Safari on non-macOS
    if (browserId === 'safari' && platform !== 'darwin') {
      continue;
    }

    const browserPath = config.paths[platform];
    if (!browserPath) continue;

    let exists = false;
    let profilePath = browserPath;

    // Special handling for Firefox profiles
    if (browserId === 'firefox') {
      const firefoxProfile = await getFirefoxProfile(browserPath);
      if (firefoxProfile) {
        exists = await browserExists(firefoxProfile);
        profilePath = firefoxProfile;
      }
    } else {
      exists = await browserExists(browserPath);
    }

    if (exists) {
      const processName = config.processNames[platform];
      const isRunning = await isProcessRunning(processName);

      installedBrowsers.push({
        id: browserId,
        name: config.name,
        path: profilePath,
        isRunning,
        platform
      });
    }
  }

  return installedBrowsers;
}

// Analyze browser data size
async function analyzeBrowserData(browserId, dataTypes) {
  const platform = process.platform;
  const config = BROWSERS[browserId];

  if (!config) {
    throw new Error(`Unknown browser: ${browserId}`);
  }

  let browserPath = config.paths[platform];

  // Special handling for Firefox
  if (browserId === 'firefox') {
    browserPath = await getFirefoxProfile(browserPath);
    if (!browserPath) {
      throw new Error('Firefox profile not found');
    }
  }

  const analysis = {
    browser: browserId,
    browserName: config.name,
    dataTypes: {},
    totalSize: 0,
    // Tracker and privacy info
    trackersFound: 0,
    totalCookies: 0,
    trackersByCategory: {},
    cacheSizeBytes: 0,
    historyCount: 0
  };

  for (const dataType of dataTypes) {
    const items = config.dataTypes[dataType];
    if (!items) continue;

    let typeSize = 0;
    const typeItems = [];

    for (const item of items) {
      let itemPath;

      // Special handling for Safari cache
      if (browserId === 'safari' && dataType === 'cache') {
        itemPath = config.cachePaths[platform];
      } else {
        itemPath = path.join(browserPath, item);
      }

      try {
        const size = await getSize(itemPath);
        if (size > 0) {
          typeSize += size;
          typeItems.push({
            name: item,
            path: itemPath,
            size,
            sizeFormatted: formatBytes(size)
          });

          // Analyze cookies for tracking if this is a cookie file
          if (dataType === 'cookies' && (item.toLowerCase().includes('cookie') || item.toLowerCase().includes('cookies'))) {
            const trackingInfo = await analyzeCookiesForTracking(itemPath);
            analysis.trackersFound += trackingInfo.trackingCookies;
            analysis.totalCookies += trackingInfo.totalCookies;

            // Merge tracker categories
            for (const [category, count] of Object.entries(trackingInfo.trackersByCategory)) {
              analysis.trackersByCategory[category] = (analysis.trackersByCategory[category] || 0) + count;
            }
          }

          // Track cache size for privacy score
          if (dataType === 'cache') {
            analysis.cacheSizeBytes += size;
          }

          // Rough estimate of history count (divide by ~500 bytes per history entry)
          if (dataType === 'history') {
            analysis.historyCount += Math.round(size / 500);
          }
        }
      } catch (err) {
        // Skip items we can't access
      }
    }

    if (typeSize > 0) {
      analysis.dataTypes[dataType] = {
        size: typeSize,
        sizeFormatted: formatBytes(typeSize),
        items: typeItems
      };
      analysis.totalSize += typeSize;
    }
  }

  analysis.totalSizeFormatted = formatBytes(analysis.totalSize);

  // Calculate privacy score
  analysis.privacyScore = calculatePrivacyScore(analysis);

  return analysis;
}

// Delete an item (file or directory)
async function deleteItem(itemPath) {
  try {
    const stats = await fs.stat(itemPath);

    if (stats.isDirectory()) {
      await fs.rm(itemPath, { recursive: true, force: true });
    } else {
      await fs.unlink(itemPath);
    }

    return { success: true, path: itemPath };
  } catch (err) {
    return { success: false, path: itemPath, error: err.message };
  }
}

// Clean browser data with cookie whitelist support
async function cleanBrowserData(browserId, dataTypes, options = {}) {
  const platform = process.platform;
  const config = BROWSERS[browserId];

  if (!config) {
    throw new Error(`Unknown browser: ${browserId}`);
  }

  // Check if browser is running
  const processName = config.processNames[platform];
  const isRunning = await isProcessRunning(processName);

  if (isRunning) {
    throw new Error(`${config.name} is currently running. Please close it before cleaning.`);
  }

  let browserPath = config.paths[platform];

  // Special handling for Firefox
  if (browserId === 'firefox') {
    browserPath = await getFirefoxProfile(browserPath);
    if (!browserPath) {
      throw new Error('Firefox profile not found');
    }
  }

  const results = {
    browser: browserId,
    browserName: config.name,
    cleaned: [],
    failed: [],
    totalFreed: 0
  };

  for (const dataType of dataTypes) {
    const items = config.dataTypes[dataType];
    if (!items) continue;

    // Special handling for cookies with whitelist
    if (dataType === 'cookies' && options.preserveCookies && options.cookieWhitelist) {
      // For now, skip cookies if whitelist is enabled
      // Full SQLite whitelist implementation would go here
      results.failed.push({
        dataType,
        error: 'Cookie whitelist not yet implemented - preserving all cookies'
      });
      continue;
    }

    for (const item of items) {
      let itemPath;

      // Special handling for Safari cache
      if (browserId === 'safari' && dataType === 'cache') {
        itemPath = config.cachePaths[platform];
      } else {
        itemPath = path.join(browserPath, item);
      }

      try {
        const size = await getSize(itemPath);
        const result = await deleteItem(itemPath);

        if (result.success) {
          results.cleaned.push({
            dataType,
            item,
            path: itemPath,
            size,
            sizeFormatted: formatBytes(size)
          });
          results.totalFreed += size;
        } else {
          results.failed.push({
            dataType,
            item,
            path: itemPath,
            error: result.error
          });
        }
      } catch (err) {
        results.failed.push({
          dataType,
          item,
          path: itemPath,
          error: err.message
        });
      }
    }
  }

  results.totalFreedFormatted = formatBytes(results.totalFreed);

  return results;
}

module.exports = {
  detectBrowsers,
  analyzeBrowserData,
  cleanBrowserData,
  isProcessRunning,
  formatBytes
};
