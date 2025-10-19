/**
 * Browser Database Readers
 * Reads installed extensions from browser databases and preference files
 * Supports: Chrome, Firefox, Safari, Edge, Brave, Opera
 */

const fs = require('fs').promises;
const path = require('path');
const { parseManifest, extractExtensionId } = require('./extensionManifestParser');

/**
 * Check if a path exists
 */
async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read Chrome installed extensions
 * Chrome stores extension info in Extensions folder with manifest.json files
 * Also checks Preferences file for enabled extensions
 */
async function readChromeExtensions(browserPaths) {
  const installedExtensions = [];
  const profiles = await getProfileDirectories(browserPaths.profiles);

  for (const profile of profiles) {
    const extensionsPath = path.join(profile, browserPaths.extensionsFolder);

    if (!await pathExists(extensionsPath)) continue;

    try {
      // Read all extension folders
      const extensionFolders = await fs.readdir(extensionsPath, { withFileTypes: true });

      for (const folder of extensionFolders) {
        if (!folder.isDirectory()) continue;

        const extensionId = folder.name;
        const extensionPath = path.join(extensionsPath, extensionId);

        // Each extension has version folders inside
        try {
          const versionFolders = await fs.readdir(extensionPath, { withFileTypes: true });

          for (const versionFolder of versionFolders) {
            if (!versionFolder.isDirectory()) continue;

            const manifestPath = path.join(extensionPath, versionFolder.name, 'manifest.json');

            if (await pathExists(manifestPath)) {
              const manifest = await parseManifest(manifestPath);

              if (manifest) {
                installedExtensions.push({
                  id: extensionId,
                  name: manifest.name,
                  version: manifest.version,
                  description: manifest.description,
                  author: manifest.author,
                  enabled: true // Assume enabled if present
                });
                break; // Only need one version
              }
            }
          }
        } catch (error) {
          console.error(`Error reading extension ${extensionId}:`, error.message);
        }
      }

      // Also read Preferences to get enabled state
      const preferencesPath = path.join(profile, 'Preferences');
      if (await pathExists(preferencesPath)) {
        try {
          const prefsContent = await fs.readFile(preferencesPath, 'utf8');
          const prefs = JSON.parse(prefsContent);

          if (prefs.extensions && prefs.extensions.settings) {
            const settings = prefs.extensions.settings;

            // Update enabled state from preferences
            for (const ext of installedExtensions) {
              if (settings[ext.id]) {
                ext.enabled = settings[ext.id].state === 1;
              }
            }
          }
        } catch (error) {
          console.error('Error reading Chrome preferences:', error.message);
        }
      }
    } catch (error) {
      console.error('Error reading Chrome extensions:', error);
    }
  }

  return installedExtensions;
}

/**
 * Read Firefox installed extensions
 * Firefox stores extension info in extensions.json file
 */
async function readFirefoxExtensions(browserPaths) {
  const installedExtensions = [];
  const profiles = await getProfileDirectories(browserPaths.profiles);

  for (const profile of profiles) {
    const extensionsJsonPath = path.join(profile, 'extensions.json');

    if (!await pathExists(extensionsJsonPath)) continue;

    try {
      const content = await fs.readFile(extensionsJsonPath, 'utf8');
      const data = JSON.parse(content);

      if (data.addons && Array.isArray(data.addons)) {
        for (const addon of data.addons) {
          // Only include enabled extensions
          if (addon.active && addon.id) {
            installedExtensions.push({
              id: addon.id,
              name: addon.defaultLocale?.name || addon.name || 'Unknown',
              version: addon.version || 'Unknown',
              description: addon.defaultLocale?.description || addon.description || '',
              author: addon.defaultLocale?.creator || addon.creator || '',
              enabled: addon.active
            });
          }
        }
      }
    } catch (error) {
      console.error('Error reading Firefox extensions.json:', error);
    }

    // Also check extensions folder for unpacked extensions
    const extensionsPath = path.join(profile, browserPaths.extensionsFolder);
    if (await pathExists(extensionsPath)) {
      try {
        const extensionFiles = await fs.readdir(extensionsPath);

        for (const file of extensionFiles) {
          const extensionPath = path.join(extensionsPath, file);
          const stat = await fs.stat(extensionPath);

          if (stat.isDirectory()) {
            // Directory-based extension
            const manifestPath = path.join(extensionPath, 'manifest.json');
            if (await pathExists(manifestPath)) {
              const manifest = await parseManifest(manifestPath);
              if (manifest && !installedExtensions.some(e => e.id === file)) {
                installedExtensions.push({
                  id: file,
                  name: manifest.name,
                  version: manifest.version,
                  description: manifest.description,
                  author: manifest.author,
                  enabled: true
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Error reading Firefox extensions folder:', error);
      }
    }
  }

  return installedExtensions;
}

/**
 * Read Safari installed extensions
 * Safari extensions are managed by the system on macOS
 */
async function readSafariExtensions(browserPaths) {
  const installedExtensions = [];

  // Safari extensions are stored differently on modern macOS
  // They're in app containers and managed by Safari itself
  // We'll check the Extensions folder

  for (const basePath of browserPaths.profiles) {
    const extensionsPath = path.join(basePath, browserPaths.extensionsFolder);

    if (!await pathExists(extensionsPath)) continue;

    try {
      const extensionFolders = await fs.readdir(extensionsPath, { withFileTypes: true });

      for (const folder of extensionFolders) {
        if (!folder.isDirectory()) continue;

        const extensionPath = path.join(extensionsPath, folder.name);

        // Try to find manifest or info.plist
        const manifestPath = path.join(extensionPath, 'manifest.json');

        if (await pathExists(manifestPath)) {
          const manifest = await parseManifest(manifestPath);

          if (manifest) {
            installedExtensions.push({
              id: folder.name,
              name: manifest.name,
              version: manifest.version,
              description: manifest.description,
              author: manifest.author,
              enabled: true
            });
          }
        }
      }
    } catch (error) {
      console.error('Error reading Safari extensions:', error);
    }
  }

  return installedExtensions;
}

/**
 * Read Edge installed extensions
 * Edge is Chromium-based, same structure as Chrome
 */
async function readEdgeExtensions(browserPaths) {
  return readChromeExtensions(browserPaths);
}

/**
 * Read Brave installed extensions
 * Brave is Chromium-based, same structure as Chrome
 */
async function readBraveExtensions(browserPaths) {
  return readChromeExtensions(browserPaths);
}

/**
 * Read Opera installed extensions
 * Opera is Chromium-based, same structure as Chrome
 */
async function readOperaExtensions(browserPaths) {
  return readChromeExtensions(browserPaths);
}

/**
 * Get all profile directories for a browser
 */
async function getProfileDirectories(basePaths) {
  const profiles = [];

  for (const basePath of basePaths) {
    if (!await pathExists(basePath)) continue;

    try {
      const entries = await fs.readdir(basePath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        // Check if this looks like a profile directory
        const profilePath = path.join(basePath, entry.name);

        if (entry.name === 'Default' ||
            entry.name.startsWith('Profile ') ||
            entry.name.includes('.default')) {
          profiles.push(profilePath);
        }
      }

      // If no profiles found, use base path as single profile
      if (profiles.length === 0) {
        profiles.push(basePath);
      }
    } catch (error) {
      console.error(`Error reading profiles from ${basePath}:`, error);
    }
  }

  return profiles;
}

/**
 * Read extension preferences from Chrome-style Preferences file
 */
async function readChromePreferences(profilePath) {
  const preferencesPath = path.join(profilePath, 'Preferences');

  if (!await pathExists(preferencesPath)) {
    return null;
  }

  try {
    const content = await fs.readFile(preferencesPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading preferences:', error);
    return null;
  }
}

/**
 * Get extension state (enabled/disabled) from preferences
 */
function getExtensionState(preferences, extensionId) {
  if (!preferences || !preferences.extensions || !preferences.extensions.settings) {
    return { enabled: true, state: 'unknown' };
  }

  const settings = preferences.extensions.settings[extensionId];

  if (!settings) {
    return { enabled: true, state: 'unknown' };
  }

  return {
    enabled: settings.state === 1,
    state: settings.state === 1 ? 'enabled' : 'disabled',
    installTime: settings.install_time,
    fromWebstore: settings.from_webstore || false
  };
}

/**
 * Check if browser is currently running
 */
async function isBrowserRunning(browserName) {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execPromise = promisify(exec);

  const processNames = {
    chrome: 'Google Chrome',
    firefox: 'Firefox',
    safari: 'Safari',
    edge: 'Microsoft Edge',
    brave: 'Brave Browser',
    opera: 'Opera'
  };

  const processName = processNames[browserName.toLowerCase()];
  if (!processName) return false;

  try {
    if (process.platform === 'darwin') {
      const { stdout } = await execPromise(`pgrep -f "${processName}"`);
      return stdout.trim().length > 0;
    } else if (process.platform === 'win32') {
      const { stdout } = await execPromise(`tasklist /FI "IMAGENAME eq ${processName}.exe"`);
      return stdout.includes(processName);
    } else if (process.platform === 'linux') {
      const { stdout } = await execPromise(`pgrep -f "${processName}"`);
      return stdout.trim().length > 0;
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Get browser version
 */
async function getBrowserVersion(browserPaths) {
  // Try to read version from Preferences or other metadata files
  const profiles = await getProfileDirectories(browserPaths.profiles);

  if (profiles.length === 0) return 'Unknown';

  const preferencesPath = path.join(profiles[0], 'Preferences');

  if (await pathExists(preferencesPath)) {
    try {
      const content = await fs.readFile(preferencesPath, 'utf8');
      const prefs = JSON.parse(content);

      if (prefs.profile && prefs.profile.info_cache) {
        // Chrome stores user agent in profile
        return prefs.profile.info_cache || 'Unknown';
      }
    } catch {
      // Ignore errors
    }
  }

  return 'Unknown';
}

module.exports = {
  readChromeExtensions,
  readFirefoxExtensions,
  readSafariExtensions,
  readEdgeExtensions,
  readBraveExtensions,
  readOperaExtensions,
  isBrowserRunning,
  getBrowserVersion,
  getExtensionState,
  readChromePreferences
};
