const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const os = require('os');
const { shell } = require('electron');

// File type definitions
const FILE_TYPES = {
  videos: ['.mp4', '.mov', '.avi', '.mkv', '.flv', '.wmv', '.m4v', '.webm', '.mpeg', '.mpg', '.3gp'],
  images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp', '.heic', '.heif', '.svg', '.raw'],
  documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.odt', '.ods', '.odp'],
  archives: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.dmg', '.iso', '.pkg', '.deb', '.rpm'],
  applications: ['.app', '.exe', '.dmg', '.pkg', '.deb', '.rpm', '.msi']
};

// System directories to skip (platform-specific)
const SKIP_DIRECTORIES = {
  darwin: [
    '/System',
    '/Library/Application Support',
    '/private',
    '/var',
    '/dev',
    '/Volumes/.timemachine',
    '/.Spotlight-V100',
    '/.fseventsd',
    '/.DocumentRevisions-V100'
  ],
  win32: [
    'C:\\Windows',
    'C:\\Program Files',
    'C:\\Program Files (x86)',
    'C:\\ProgramData',
    'C:\\$Recycle.Bin',
    'C:\\System Volume Information'
  ],
  linux: [
    '/proc',
    '/sys',
    '/dev',
    '/run',
    '/snap',
    '/var/log',
    '/var/cache'
  ]
};

class LargeFileFinder {
  constructor() {
    this.cancelToken = { cancelled: false };
  }

  shouldSkipDirectory(dirPath) {
    const platform = process.platform;
    const skipPaths = SKIP_DIRECTORIES[platform] || [];

    // Check if path starts with any skip directory
    const normalizedPath = path.normalize(dirPath);
    for (const skipPath of skipPaths) {
      if (normalizedPath.startsWith(skipPath)) {
        return true;
      }
    }

    // Skip hidden directories (starting with .)
    const basename = path.basename(dirPath);
    if (basename.startsWith('.') && basename !== '.') {
      return true;
    }

    // Skip node_modules and other common large directories
    if (basename === 'node_modules' || basename === '.git' || basename === '.cache') {
      return true;
    }

    return false;
  }

  getFileType(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    for (const [type, extensions] of Object.entries(FILE_TYPES)) {
      if (extensions.includes(ext)) {
        return type;
      }
    }

    return 'other';
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
  }

  matchesFilter(file, filters) {
    const { minSize, maxAge, fileTypes } = filters;

    // Size filter
    if (minSize && file.size < minSize) {
      return false;
    }

    // Age filter
    if (maxAge) {
      const fileAge = Date.now() - file.modified;
      if (fileAge < maxAge) {
        return false;
      }
    }

    // File type filter
    if (fileTypes && fileTypes !== 'all') {
      if (file.type !== fileTypes) {
        return false;
      }
    }

    return true;
  }

  async scanDirectory(dirPath, filters, progressCallback, depth = 0, maxDepth = 10) {
    if (this.cancelToken.cancelled) {
      throw new Error('Scan cancelled');
    }

    if (depth > maxDepth) {
      return [];
    }

    const results = [];

    try {
      // Check if we have permission to read directory
      const stats = await fs.stat(dirPath);
      if (!stats.isDirectory()) {
        return results;
      }

      // Check if we should skip this directory
      if (this.shouldSkipDirectory(dirPath)) {
        return results;
      }

      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (this.cancelToken.cancelled) {
          throw new Error('Scan cancelled');
        }

        const fullPath = path.join(dirPath, entry.name);

        try {
          if (entry.isDirectory()) {
            // Recursively scan subdirectory
            const subResults = await this.scanDirectory(
              fullPath,
              filters,
              progressCallback,
              depth + 1,
              maxDepth
            );
            results.push(...subResults);
          } else if (entry.isFile()) {
            const stats = await fs.stat(fullPath);

            const fileInfo = {
              name: entry.name,
              path: fullPath,
              directory: path.dirname(fullPath),
              size: stats.size,
              sizeFormatted: this.formatBytes(stats.size),
              modified: stats.mtime.getTime(),
              modifiedDate: stats.mtime.toISOString(),
              type: this.getFileType(entry.name)
            };

            // Check if file matches filters
            if (this.matchesFilter(fileInfo, filters)) {
              results.push(fileInfo);

              // Send progress update
              if (progressCallback && results.length % 10 === 0) {
                progressCallback({
                  stage: 'scanning',
                  filesFound: results.length,
                  currentPath: dirPath
                });
              }
            }
          }
        } catch (error) {
          // Skip files/directories we can't access
          console.error(`Error accessing ${fullPath}:`, error.message);
        }
      }
    } catch (error) {
      // Skip directories we can't read
      console.error(`Error reading directory ${dirPath}:`, error.message);
    }

    return results;
  }

  async scanLargeFiles(options, progressCallback) {
    this.cancelToken = { cancelled: false };

    try {
      const {
        minSize = 100 * 1024 * 1024, // 100MB default
        maxAge = null,
        fileTypes = 'all',
        searchPath = null,
        excludeSystem = true
      } = options;

      progressCallback({
        stage: 'initializing',
        message: 'Starting scan...'
      });

      // Determine search path
      let searchPaths = [];
      if (searchPath) {
        searchPaths = [searchPath];
      } else {
        // Default search paths based on platform
        const homeDir = os.homedir();
        if (process.platform === 'darwin') {
          searchPaths = [
            homeDir,
            path.join(homeDir, 'Documents'),
            path.join(homeDir, 'Downloads'),
            path.join(homeDir, 'Desktop'),
            path.join(homeDir, 'Movies'),
            path.join(homeDir, 'Pictures')
          ];
        } else if (process.platform === 'win32') {
          searchPaths = [
            homeDir,
            path.join(homeDir, 'Documents'),
            path.join(homeDir, 'Downloads'),
            path.join(homeDir, 'Desktop'),
            path.join(homeDir, 'Videos'),
            path.join(homeDir, 'Pictures')
          ];
        } else {
          // Linux
          searchPaths = [
            homeDir,
            path.join(homeDir, 'Documents'),
            path.join(homeDir, 'Downloads'),
            path.join(homeDir, 'Desktop')
          ];
        }
      }

      // Filter out paths that don't exist
      searchPaths = searchPaths.filter(p => {
        try {
          return fsSync.existsSync(p);
        } catch {
          return false;
        }
      });

      const filters = {
        minSize,
        maxAge,
        fileTypes
      };

      let allResults = [];

      // Scan each path
      for (const scanPath of searchPaths) {
        if (this.cancelToken.cancelled) {
          throw new Error('Scan cancelled');
        }

        progressCallback({
          stage: 'scanning',
          message: `Scanning ${scanPath}...`,
          currentPath: scanPath,
          filesFound: allResults.length
        });

        const results = await this.scanDirectory(scanPath, filters, progressCallback);
        allResults.push(...results);
      }

      // Sort by size (largest first)
      allResults.sort((a, b) => b.size - a.size);

      // Calculate totals
      const totalSize = allResults.reduce((sum, file) => sum + file.size, 0);
      const totalSizeFormatted = this.formatBytes(totalSize);

      progressCallback({
        stage: 'complete',
        message: 'Scan complete!'
      });

      return {
        success: true,
        files: allResults,
        summary: {
          totalFiles: allResults.length,
          totalSize,
          totalSizeFormatted,
          searchPaths: searchPaths.length
        }
      };
    } catch (error) {
      if (error.message === 'Scan cancelled') {
        return {
          success: false,
          error: 'Scan cancelled by user',
          cancelled: true
        };
      }
      throw error;
    }
  }

  cancelScan() {
    this.cancelToken.cancelled = true;
  }

  async deleteFiles(filePaths, progressCallback) {
    const results = {
      deleted: [],
      failed: [],
      totalFreed: 0
    };

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];

      if (progressCallback) {
        progressCallback({
          current: i + 1,
          total: filePaths.length,
          currentFile: filePath
        });
      }

      try {
        // Get file size before deletion
        const stats = await fs.stat(filePath);
        const fileSize = stats.size;

        // Move to trash instead of permanent deletion
        await shell.trashItem(filePath);

        results.deleted.push(filePath);
        results.totalFreed += fileSize;
      } catch (error) {
        results.failed.push({
          path: filePath,
          error: error.message
        });
      }
    }

    results.totalFreedFormatted = this.formatBytes(results.totalFreed);

    return {
      success: true,
      data: results
    };
  }

  async openFileLocation(filePath) {
    try {
      await shell.showItemInFolder(filePath);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  exportToCSV(files) {
    const headers = ['Name', 'Size (Bytes)', 'Size (Formatted)', 'Modified Date', 'Type', 'Path'];
    const rows = files.map(file => [
      file.name,
      file.size,
      file.sizeFormatted,
      new Date(file.modified).toLocaleString(),
      file.type,
      file.path
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }
}

// Singleton instance
const largeFileFinder = new LargeFileFinder();

module.exports = {
  scanLargeFiles: (options, progressCallback) => largeFileFinder.scanLargeFiles(options, progressCallback),
  cancelLargeFileScan: () => largeFileFinder.cancelScan(),
  deleteFiles: (filePaths, progressCallback) => largeFileFinder.deleteFiles(filePaths, progressCallback),
  openFileLocation: (filePath) => largeFileFinder.openFileLocation(filePath),
  exportToCSV: (files) => largeFileFinder.exportToCSV(files)
};
