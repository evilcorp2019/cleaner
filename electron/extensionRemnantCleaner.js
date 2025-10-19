/**
 * Extension Remnant Cleaner Module
 * Detects and cleans orphaned browser extension data across all major browsers
 * Supports: Chrome, Firefox, Safari, Edge, Brave, Opera
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { parseManifest, extractExtensionId } = require('./extensionManifestParser');
const {
  readChromeExtensions,
  readFirefoxExtensions,
  readSafariExtensions,
  readEdgeExtensions,
  readBraveExtensions,
  readOperaExtensions
} = require('./browserDatabaseReaders');

class ExtensionRemnantCleaner {
  constructor() {
    this.platform = os.platform();
    this.homeDir = os.homedir();

    this.browsers = {
      chrome: {
        name: 'Chrome',
        type: 'chromium',
        paths: this.getChromePaths(),
        reader: readChromeExtensions
      },
      firefox: {
        name: 'Firefox',
        type: 'firefox',
        paths: this.getFirefoxPaths(),
        reader: readFirefoxExtensions
      },
      safari: {
        name: 'Safari',
        type: 'safari',
        paths: this.getSafariPaths(),
        reader: readSafariExtensions
      },
      edge: {
        name: 'Edge',
        type: 'chromium',
        paths: this.getEdgePaths(),
        reader: readEdgeExtensions
      },
      brave: {
        name: 'Brave',
        type: 'chromium',
        paths: this.getBravePaths(),
        reader: readBraveExtensions
      },
      opera: {
        name: 'Opera',
        type: 'chromium',
        paths: this.getOperaPaths(),
        reader: readOperaExtensions
      }
    };
  }

  /**
   * Get Chrome browser paths based on platform
   */
  getChromePaths() {
    const basePaths = {
      darwin: [
        path.join(this.homeDir, 'Library/Application Support/Google/Chrome')
      ],
      win32: [
        path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/User Data')
      ],
      linux: [
        path.join(this.homeDir, '.config/google-chrome')
      ]
    };

    const base = basePaths[this.platform] || [];
    return {
      profiles: base,
      extensionsFolder: 'Extensions',
      localStorage: 'Local Extension Settings',
      indexedDB: 'IndexedDB',
      cache: 'Cache/Extensions'
    };
  }

  /**
   * Get Firefox browser paths based on platform
   */
  getFirefoxPaths() {
    const basePaths = {
      darwin: [
        path.join(this.homeDir, 'Library/Application Support/Firefox/Profiles')
      ],
      win32: [
        path.join(process.env.APPDATA || '', 'Mozilla/Firefox/Profiles')
      ],
      linux: [
        path.join(this.homeDir, '.mozilla/firefox')
      ]
    };

    const base = basePaths[this.platform] || [];
    return {
      profiles: base,
      extensionsFolder: 'extensions',
      storage: 'storage/default',
      extensionData: 'extension-data'
    };
  }

  /**
   * Get Safari browser paths (macOS only)
   */
  getSafariPaths() {
    if (this.platform !== 'darwin') {
      return { profiles: [] };
    }

    return {
      profiles: [
        path.join(this.homeDir, 'Library/Safari'),
        path.join(this.homeDir, 'Library/Containers/com.apple.Safari/Data/Library/Safari')
      ],
      extensionsFolder: 'Extensions',
      localStorage: 'LocalStorage'
    };
  }

  /**
   * Get Edge browser paths based on platform
   */
  getEdgePaths() {
    const basePaths = {
      darwin: [
        path.join(this.homeDir, 'Library/Application Support/Microsoft Edge')
      ],
      win32: [
        path.join(process.env.LOCALAPPDATA || '', 'Microsoft/Edge/User Data')
      ],
      linux: [
        path.join(this.homeDir, '.config/microsoft-edge')
      ]
    };

    const base = basePaths[this.platform] || [];
    return {
      profiles: base,
      extensionsFolder: 'Extensions',
      localStorage: 'Local Extension Settings',
      indexedDB: 'IndexedDB',
      cache: 'Cache/Extensions'
    };
  }

  /**
   * Get Brave browser paths based on platform
   */
  getBravePaths() {
    const basePaths = {
      darwin: [
        path.join(this.homeDir, 'Library/Application Support/BraveSoftware/Brave-Browser')
      ],
      win32: [
        path.join(process.env.LOCALAPPDATA || '', 'BraveSoftware/Brave-Browser/User Data')
      ],
      linux: [
        path.join(this.homeDir, '.config/BraveSoftware/Brave-Browser')
      ]
    };

    const base = basePaths[this.platform] || [];
    return {
      profiles: base,
      extensionsFolder: 'Extensions',
      localStorage: 'Local Extension Settings',
      indexedDB: 'IndexedDB',
      cache: 'Cache/Extensions'
    };
  }

  /**
   * Get Opera browser paths based on platform
   */
  getOperaPaths() {
    const basePaths = {
      darwin: [
        path.join(this.homeDir, 'Library/Application Support/com.operasoftware.Opera')
      ],
      win32: [
        path.join(process.env.APPDATA || '', 'Opera Software/Opera Stable')
      ],
      linux: [
        path.join(this.homeDir, '.config/opera')
      ]
    };

    const base = basePaths[this.platform] || [];
    return {
      profiles: base,
      extensionsFolder: 'Extensions',
      localStorage: 'Local Extension Settings',
      indexedDB: 'IndexedDB',
      cache: 'Cache/Extensions'
    };
  }

  /**
   * Check if a path exists
   */
  async pathExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all profile directories for a browser
   */
  async getProfileDirectories(browserPaths) {
    const profiles = [];

    for (const basePath of browserPaths.profiles) {
      if (!await this.pathExists(basePath)) continue;

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
        console.error(`Error reading browser profiles from ${basePath}:`, error);
      }
    }

    return profiles;
  }

  /**
   * Scan for extension remnants in a specific browser
   */
  async scanExtensionRemnants(browserName) {
    const browser = this.browsers[browserName];
    if (!browser) {
      throw new Error(`Unknown browser: ${browserName}`);
    }

    console.log(`[ExtensionCleaner] Scanning ${browser.name} for orphaned extensions...`);

    try {
      // Get installed extensions
      const installedExtensions = await browser.reader(browser.paths);
      const installedIds = new Set(installedExtensions.map(ext => ext.id));

      console.log(`[ExtensionCleaner] Found ${installedExtensions.length} installed extensions in ${browser.name}`);

      // Get all extension data folders
      const allExtensionFolders = await this.getAllExtensionFolders(browser);

      console.log(`[ExtensionCleaner] Found ${allExtensionFolders.length} total extension data folders`);

      // Find orphaned folders (exist but extension not installed)
      const orphanedRemnants = [];

      for (const folder of allExtensionFolders) {
        const extensionId = extractExtensionId(folder.path, browser.type);

        if (extensionId && !installedIds.has(extensionId)) {
          // This is an orphaned extension
          const remnant = {
            id: extensionId,
            path: folder.path,
            dataType: folder.dataType,
            browser: browser.name
          };

          // Calculate size
          remnant.size = await this.calculateFolderSize(remnant.path);

          // Get last modified date
          remnant.lastModified = await this.getLastModified(remnant.path);

          // Extract metadata
          remnant.metadata = await this.extractMetadata(remnant.path, browser.type);

          orphanedRemnants.push(remnant);
        }
      }

      // Group remnants by extension ID
      const groupedRemnants = this.groupRemnantsByExtension(orphanedRemnants);

      console.log(`[ExtensionCleaner] Found ${groupedRemnants.length} orphaned extensions in ${browser.name}`);

      return groupedRemnants;
    } catch (error) {
      console.error(`[ExtensionCleaner] Error scanning ${browser.name}:`, error);
      return [];
    }
  }

  /**
   * Get all extension data folders for a browser
   */
  async getAllExtensionFolders(browser) {
    const folders = [];
    const profiles = await this.getProfileDirectories(browser.paths);

    for (const profile of profiles) {
      // Scan Extensions folder
      if (browser.paths.extensionsFolder) {
        const extensionsPath = path.join(profile, browser.paths.extensionsFolder);
        if (await this.pathExists(extensionsPath)) {
          const extFolders = await this.scanExtensionsFolder(extensionsPath, 'Extensions');
          folders.push(...extFolders);
        }
      }

      // Scan Local Storage
      if (browser.paths.localStorage) {
        const localStoragePath = path.join(profile, browser.paths.localStorage);
        if (await this.pathExists(localStoragePath)) {
          const lsFolders = await this.scanExtensionsFolder(localStoragePath, 'Local Storage');
          folders.push(...lsFolders);
        }
      }

      // Scan IndexedDB (Chromium browsers)
      if (browser.paths.indexedDB) {
        const indexedDBPath = path.join(profile, browser.paths.indexedDB);
        if (await this.pathExists(indexedDBPath)) {
          const idbFolders = await this.scanIndexedDBFolder(indexedDBPath);
          folders.push(...idbFolders);
        }
      }

      // Scan storage (Firefox)
      if (browser.paths.storage) {
        const storagePath = path.join(profile, browser.paths.storage);
        if (await this.pathExists(storagePath)) {
          const storageFolders = await this.scanFirefoxStorage(storagePath);
          folders.push(...storageFolders);
        }
      }
    }

    return folders;
  }

  /**
   * Scan an extensions folder
   */
  async scanExtensionsFolder(folderPath, dataType) {
    const folders = [];

    try {
      const entries = await fs.readdir(folderPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          folders.push({
            path: path.join(folderPath, entry.name),
            dataType: dataType
          });
        }
      }
    } catch (error) {
      console.error(`Error scanning ${folderPath}:`, error);
    }

    return folders;
  }

  /**
   * Scan IndexedDB folder for extension databases
   */
  async scanIndexedDBFolder(folderPath) {
    const folders = [];

    try {
      const entries = await fs.readdir(folderPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('chrome-extension_')) {
          folders.push({
            path: path.join(folderPath, entry.name),
            dataType: 'IndexedDB'
          });
        }
      }
    } catch (error) {
      console.error(`Error scanning IndexedDB folder:`, error);
    }

    return folders;
  }

  /**
   * Scan Firefox storage folder
   */
  async scanFirefoxStorage(folderPath) {
    const folders = [];

    try {
      const entries = await fs.readdir(folderPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('moz-extension+++')) {
          folders.push({
            path: path.join(folderPath, entry.name),
            dataType: 'Firefox Storage'
          });
        }
      }
    } catch (error) {
      console.error(`Error scanning Firefox storage:`, error);
    }

    return folders;
  }

  /**
   * Calculate total size of a folder
   */
  async calculateFolderSize(folderPath) {
    let totalSize = 0;

    try {
      const stat = await fs.stat(folderPath);

      if (stat.isFile()) {
        return stat.size;
      }

      if (stat.isDirectory()) {
        const entries = await fs.readdir(folderPath, { withFileTypes: true });

        for (const entry of entries) {
          const entryPath = path.join(folderPath, entry.name);
          totalSize += await this.calculateFolderSize(entryPath);
        }
      }
    } catch (error) {
      // Ignore errors for inaccessible files
    }

    return totalSize;
  }

  /**
   * Get last modified date of a folder
   */
  async getLastModified(folderPath) {
    try {
      const stat = await fs.stat(folderPath);
      return stat.mtime;
    } catch {
      return new Date(0);
    }
  }

  /**
   * Extract metadata from extension folder
   */
  async extractMetadata(extensionPath, browserType) {
    const metadata = {
      name: 'Unknown Extension',
      version: 'Unknown',
      description: '',
      author: ''
    };

    try {
      // Try to find and parse manifest.json
      if (browserType === 'chromium') {
        // For Chromium, check version folders
        const entries = await fs.readdir(extensionPath, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isDirectory()) {
            const manifestPath = path.join(extensionPath, entry.name, 'manifest.json');
            if (await this.pathExists(manifestPath)) {
              const manifest = await parseManifest(manifestPath);
              if (manifest) {
                return {
                  name: manifest.name || metadata.name,
                  version: manifest.version || metadata.version,
                  description: manifest.description || '',
                  author: manifest.author || ''
                };
              }
            }
          }
        }
      } else if (browserType === 'firefox') {
        // For Firefox, manifest is in root
        const manifestPath = path.join(extensionPath, 'manifest.json');
        if (await this.pathExists(manifestPath)) {
          const manifest = await parseManifest(manifestPath);
          if (manifest) {
            return {
              name: manifest.name || metadata.name,
              version: manifest.version || metadata.version,
              description: manifest.description || '',
              author: manifest.author || ''
            };
          }
        }
      }
    } catch (error) {
      console.error('Error extracting metadata:', error);
    }

    return metadata;
  }

  /**
   * Group remnants by extension ID
   */
  groupRemnantsByExtension(remnants) {
    const grouped = new Map();

    for (const remnant of remnants) {
      if (!grouped.has(remnant.id)) {
        grouped.set(remnant.id, {
          id: remnant.id,
          name: remnant.metadata.name,
          version: remnant.metadata.version,
          description: remnant.metadata.description,
          author: remnant.metadata.author,
          browser: remnant.browser,
          totalSize: 0,
          lastModified: remnant.lastModified,
          dataLocations: [],
          paths: []
        });
      }

      const group = grouped.get(remnant.id);
      group.totalSize += remnant.size;
      group.dataLocations.push(remnant.dataType);
      group.paths.push(remnant.path);

      // Use most recent modification date
      if (remnant.lastModified > group.lastModified) {
        group.lastModified = remnant.lastModified;
      }
    }

    return Array.from(grouped.values());
  }

  /**
   * Clean a single extension remnant
   */
  async cleanRemnant(remnantPaths) {
    let totalSpaceRecovered = 0;

    for (const remnantPath of remnantPaths) {
      try {
        // Calculate size before deletion
        const size = await this.calculateFolderSize(remnantPath);

        // Move to trash instead of permanent delete (safer)
        const { shell } = require('electron');
        await shell.trashItem(remnantPath);

        totalSpaceRecovered += size;
        console.log(`[ExtensionCleaner] Cleaned remnant: ${remnantPath} (${size} bytes)`);
      } catch (error) {
        console.error(`[ExtensionCleaner] Error cleaning ${remnantPath}:`, error);
        throw error;
      }
    }

    return {
      success: true,
      spaceRecovered: totalSpaceRecovered
    };
  }

  /**
   * Clean multiple extension remnants
   */
  async cleanMultipleRemnants(remnantsList, progressCallback) {
    let totalSpaceRecovered = 0;
    let cleanedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < remnantsList.length; i++) {
      const remnant = remnantsList[i];

      try {
        const result = await this.cleanRemnant(remnant.paths);
        totalSpaceRecovered += result.spaceRecovered;
        cleanedCount++;

        if (progressCallback) {
          progressCallback({
            current: i + 1,
            total: remnantsList.length,
            cleaned: cleanedCount,
            failed: failedCount,
            spaceRecovered: totalSpaceRecovered
          });
        }
      } catch (error) {
        failedCount++;
        console.error(`[ExtensionCleaner] Failed to clean extension ${remnant.id}:`, error);
      }
    }

    return {
      success: true,
      totalCleaned: cleanedCount,
      totalFailed: failedCount,
      totalSpaceRecovered: totalSpaceRecovered
    };
  }

  /**
   * Get statistics for all browsers
   */
  async getAllBrowserStats() {
    const stats = {
      totalRemnants: 0,
      totalSize: 0,
      browsers: {}
    };

    for (const browserName of Object.keys(this.browsers)) {
      const remnants = await this.scanExtensionRemnants(browserName);

      const browserSize = remnants.reduce((sum, r) => sum + r.totalSize, 0);

      stats.browsers[browserName] = {
        name: this.browsers[browserName].name,
        remnantsCount: remnants.length,
        totalSize: browserSize
      };

      stats.totalRemnants += remnants.length;
      stats.totalSize += browserSize;
    }

    return stats;
  }
}

module.exports = ExtensionRemnantCleaner;
