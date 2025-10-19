/**
 * Application Cache Manager
 *
 * Backend module for detecting, analyzing, and cleaning application caches.
 * Handles cross-platform cache detection, size calculation, and safe cleaning
 * while preserving user settings and data.
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const {
  getApplicationsForPlatform,
  getApplicationById,
  expandPath
} = require('./appCacheDatabase');

// Platform-specific utilities
const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';

/**
 * Calculate size of a directory recursively
 */
async function getDirectorySize(dirPath) {
  let totalSize = 0;

  try {
    const stats = await fs.stat(dirPath);

    if (!stats.isDirectory()) {
      return stats.size;
    }

    const files = await fs.readdir(dirPath);

    await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(dirPath, file);
        try {
          const fileStats = await fs.stat(filePath);

          if (fileStats.isDirectory()) {
            totalSize += await getDirectorySize(filePath);
          } else {
            totalSize += fileStats.size;
          }
        } catch (err) {
          // Skip files we can't access
          console.warn(`[AppCache] Cannot access: ${filePath}`);
        }
      })
    );
  } catch (err) {
    console.error(`[AppCache] Error calculating size for ${dirPath}:`, err.message);
  }

  return totalSize;
}

/**
 * Check if application is installed
 */
async function isAppInstalled(appPath) {
  try {
    const expandedPath = expandPath(appPath);
    const stats = await fs.stat(expandedPath);
    return stats.isDirectory() || stats.isFile();
  } catch (err) {
    return false;
  }
}

/**
 * Check if application is currently running
 */
async function isAppRunning(processNames) {
  if (!processNames || processNames.length === 0) {
    return false;
  }

  try {
    let command;
    if (isWindows) {
      command = 'tasklist';
    } else {
      command = 'ps aux';
    }

    const { stdout } = await execAsync(command);
    const output = stdout.toLowerCase();

    return processNames.some(name => output.includes(name.toLowerCase()));
  } catch (err) {
    console.error('[AppCache] Error checking running processes:', err.message);
    return false;
  }
}

/**
 * Quit application gracefully
 */
async function quitApp(processNames) {
  if (!processNames || processNames.length === 0) {
    return { success: false, message: 'No process names provided' };
  }

  try {
    for (const processName of processNames) {
      if (isMac) {
        await execAsync(`osascript -e 'quit app "${processName}"'`);
      } else if (isWindows) {
        await execAsync(`taskkill /IM "${processName}.exe" /F`);
      } else {
        await execAsync(`pkill -f "${processName}"`);
      }
    }

    // Wait a moment for processes to close
    await new Promise(resolve => setTimeout(resolve, 1000));

    return { success: true, message: 'Application closed successfully' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Get last modified time for cache directory
 */
async function getCacheAge(cachePaths) {
  let mostRecent = 0;

  for (const cachePath of cachePaths) {
    try {
      const expandedPath = expandPath(cachePath);
      const stats = await fs.stat(expandedPath);
      if (stats.mtimeMs > mostRecent) {
        mostRecent = stats.mtimeMs;
      }
    } catch (err) {
      // Ignore if path doesn't exist
    }
  }

  return mostRecent > 0 ? new Date(mostRecent) : null;
}

/**
 * Check if path should be preserved
 */
function shouldPreserve(filePath, preservePaths) {
  if (!preservePaths || preservePaths.length === 0) {
    return false;
  }

  const normalizedPath = filePath.toLowerCase();
  return preservePaths.some(preserve =>
    normalizedPath.includes(preserve.toLowerCase())
  );
}

/**
 * Delete directory recursively with preservation rules
 */
async function deleteDirectory(dirPath, preservePaths = []) {
  try {
    const stats = await fs.stat(dirPath);

    if (!stats.isDirectory()) {
      // Check if this file should be preserved
      if (!shouldPreserve(dirPath, preservePaths)) {
        await fs.unlink(dirPath);
        return { deleted: 1, preserved: 0, size: stats.size };
      } else {
        return { deleted: 0, preserved: 1, size: 0 };
      }
    }

    const files = await fs.readdir(dirPath);
    let totalDeleted = 0;
    let totalPreserved = 0;
    let totalSize = 0;

    // Process all files and subdirectories
    await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(dirPath, file);

        // Check if this path should be preserved
        if (shouldPreserve(filePath, preservePaths)) {
          totalPreserved++;
          return;
        }

        try {
          const result = await deleteDirectory(filePath, preservePaths);
          totalDeleted += result.deleted;
          totalPreserved += result.preserved;
          totalSize += result.size;
        } catch (err) {
          console.warn(`[AppCache] Failed to delete ${filePath}:`, err.message);
        }
      })
    );

    // Try to remove the directory itself if it's empty
    try {
      const remaining = await fs.readdir(dirPath);
      if (remaining.length === 0) {
        await fs.rmdir(dirPath);
      }
    } catch (err) {
      // Directory not empty or no permission
    }

    return { deleted: totalDeleted, preserved: totalPreserved, size: totalSize };
  } catch (err) {
    console.error(`[AppCache] Error deleting ${dirPath}:`, err.message);
    return { deleted: 0, preserved: 0, size: 0 };
  }
}

/**
 * Scan all applications and their caches
 */
async function scanAppCaches() {
  console.log('[AppCache] Starting application cache scan...');

  const apps = getApplicationsForPlatform();
  const results = [];

  for (const app of apps) {
    try {
      // Check if app is installed
      const installed = await isAppInstalled(app.appPath);

      if (!installed) {
        results.push({
          id: app.id,
          name: app.name,
          category: app.category,
          icon: app.icon,
          description: app.description,
          installed: false,
          cacheSize: 0,
          cacheAge: null,
          cachePaths: []
        });
        continue;
      }

      // Check if app is running
      const running = await isAppRunning(app.processNames);

      // Calculate cache size
      let totalCacheSize = 0;
      const existingCachePaths = [];

      for (const cachePath of app.cachePaths) {
        const expandedPath = expandPath(cachePath);

        try {
          // Handle wildcard paths (e.g., ~/Library/Caches/JetBrains/IntelliJIdea*)
          if (expandedPath.includes('*')) {
            const baseDir = path.dirname(expandedPath);
            const pattern = path.basename(expandedPath);

            try {
              const files = await fs.readdir(baseDir);
              const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');

              for (const file of files) {
                if (regex.test(file)) {
                  const fullPath = path.join(baseDir, file);
                  const size = await getDirectorySize(fullPath);
                  totalCacheSize += size;
                  existingCachePaths.push(fullPath);
                }
              }
            } catch (err) {
              // Base directory doesn't exist
            }
          } else {
            // Regular path
            const exists = fsSync.existsSync(expandedPath);
            if (exists) {
              const size = await getDirectorySize(expandedPath);
              totalCacheSize += size;
              existingCachePaths.push(expandedPath);
            }
          }
        } catch (err) {
          console.warn(`[AppCache] Error processing ${expandedPath}:`, err.message);
        }
      }

      // Get cache age
      const cacheAge = await getCacheAge(existingCachePaths);

      results.push({
        id: app.id,
        name: app.name,
        category: app.category,
        icon: app.icon,
        description: app.description,
        installed: true,
        running,
        cacheSize: totalCacheSize,
        cacheAge,
        cachePaths: existingCachePaths,
        processNames: app.processNames,
        preservePaths: app.preservePaths
      });

      console.log(`[AppCache] ${app.name}: ${(totalCacheSize / 1024 / 1024 / 1024).toFixed(2)} GB`);
    } catch (err) {
      console.error(`[AppCache] Error scanning ${app.name}:`, err.message);
    }
  }

  console.log('[AppCache] Scan complete');
  return { success: true, apps: results };
}

/**
 * Clean cache for a specific application
 */
async function cleanAppCache(appId) {
  console.log(`[AppCache] Cleaning cache for ${appId}...`);

  const app = getApplicationById(appId);
  if (!app) {
    return {
      success: false,
      error: 'Application not found',
      spaceRecovered: 0
    };
  }

  try {
    // Check if app is running
    const running = await isAppRunning(app.processNames);
    if (running) {
      return {
        success: false,
        error: 'Application is currently running',
        code: 'APP_RUNNING',
        appName: app.name,
        spaceRecovered: 0
      };
    }

    let totalSpaceRecovered = 0;
    let totalDeleted = 0;
    let totalPreserved = 0;
    const cleanedPaths = [];

    // Clean each cache path
    for (const cachePath of app.cachePaths) {
      const expandedPath = expandPath(cachePath);

      try {
        // Handle wildcard paths
        if (expandedPath.includes('*')) {
          const baseDir = path.dirname(expandedPath);
          const pattern = path.basename(expandedPath);

          try {
            const files = await fs.readdir(baseDir);
            const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');

            for (const file of files) {
              if (regex.test(file)) {
                const fullPath = path.join(baseDir, file);
                const result = await deleteDirectory(fullPath, app.preservePaths);
                totalDeleted += result.deleted;
                totalPreserved += result.preserved;
                totalSpaceRecovered += result.size;
                cleanedPaths.push(fullPath);
              }
            }
          } catch (err) {
            console.warn(`[AppCache] Base directory not found: ${baseDir}`);
          }
        } else {
          // Regular path
          const exists = fsSync.existsSync(expandedPath);
          if (exists) {
            const result = await deleteDirectory(expandedPath, app.preservePaths);
            totalDeleted += result.deleted;
            totalPreserved += result.preserved;
            totalSpaceRecovered += result.size;
            cleanedPaths.push(expandedPath);
          }
        }
      } catch (err) {
        console.error(`[AppCache] Error cleaning ${expandedPath}:`, err.message);
      }
    }

    console.log(`[AppCache] ${app.name} cleaned: ${(totalSpaceRecovered / 1024 / 1024 / 1024).toFixed(2)} GB recovered`);

    return {
      success: true,
      appId,
      appName: app.name,
      spaceRecovered: totalSpaceRecovered,
      filesDeleted: totalDeleted,
      filesPreserved: totalPreserved,
      cleanedPaths
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      spaceRecovered: 0
    };
  }
}

/**
 * Clean caches for multiple applications
 */
async function cleanMultipleCaches(appIds, progressCallback) {
  console.log(`[AppCache] Cleaning ${appIds.length} applications...`);

  const results = [];
  let totalSpaceRecovered = 0;
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < appIds.length; i++) {
    const appId = appIds[i];

    // Send progress update
    if (progressCallback) {
      progressCallback({
        current: i + 1,
        total: appIds.length,
        appId,
        percentage: Math.round(((i + 1) / appIds.length) * 100)
      });
    }

    const result = await cleanAppCache(appId);
    results.push(result);

    if (result.success) {
      successCount++;
      totalSpaceRecovered += result.spaceRecovered;
    } else {
      failureCount++;
    }
  }

  console.log(`[AppCache] Batch cleaning complete: ${(totalSpaceRecovered / 1024 / 1024 / 1024).toFixed(2)} GB recovered`);

  return {
    success: true,
    totalSpaceRecovered,
    successCount,
    failureCount,
    results
  };
}

/**
 * Check if specific app is running
 */
async function checkAppRunning(appId) {
  const app = getApplicationById(appId);
  if (!app) {
    return { success: false, isRunning: false, error: 'Application not found' };
  }

  const running = await isAppRunning(app.processNames);
  return { success: true, isRunning: running };
}

/**
 * Quit specific application
 */
async function quitApplication(appId) {
  const app = getApplicationById(appId);
  if (!app) {
    return { success: false, error: 'Application not found' };
  }

  return await quitApp(app.processNames);
}

module.exports = {
  scanAppCaches,
  cleanAppCache,
  cleanMultipleCaches,
  checkAppRunning,
  quitApplication,
  getDirectorySize
};
