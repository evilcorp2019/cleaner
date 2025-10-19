const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Safe patterns to clean - these are common temp/cache locations
const SAFE_PATTERNS = {
  darwin: [
    path.join(os.homedir(), 'Library/Caches'),
    '/Library/Caches',
    '/System/Library/Caches',
    path.join(os.tmpdir()),
    path.join(os.homedir(), '.cache'),
    path.join(os.homedir(), 'Library/Logs'),
    path.join(os.homedir(), '.npm/_cacache'),
    path.join(os.homedir(), '.yarn/cache'),
    path.join(os.homedir(), 'Library/Application Support/Google/Chrome/Default/Cache'),
    path.join(os.homedir(), 'Library/Application Support/Firefox/Profiles/*/cache2'),
  ],
  win32: [
    path.join(process.env.LOCALAPPDATA || '', 'Temp'),
    path.join(process.env.TEMP || ''),
    path.join(process.env.WINDIR || 'C:\\Windows', 'Temp'),
    path.join(process.env.LOCALAPPDATA || '', 'Microsoft\\Windows\\INetCache'),
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\User Data\\Default\\Cache'),
    path.join(process.env.APPDATA || '', 'npm-cache'),
    path.join(process.env.LOCALAPPDATA || '', 'yarn\\Cache'),
  ]
};

// Patterns to NEVER touch
const PROTECTED_PATTERNS = [
  'Documents',
  'Desktop',
  'Downloads',
  'Pictures',
  'Videos',
  'Music',
  'System32',
  'Program Files',
  'Applications',
  'System',
  '.ssh',
  '.git',
  'node_modules', // We scan but don't auto-clean these
];

function isProtectedPath(filePath) {
  return PROTECTED_PATTERNS.some(pattern =>
    filePath.toLowerCase().includes(pattern.toLowerCase())
  );
}

async function getDirectorySize(dirPath) {
  let totalSize = 0;

  try {
    const stats = await fs.stat(dirPath);

    if (!stats.isDirectory()) {
      return stats.size;
    }

    const files = await fs.readdir(dirPath);

    await Promise.all(files.map(async (file) => {
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
      }
    }));
  } catch (err) {
    // Skip directories we can't access
  }

  return totalSize;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

async function scanDirectory(dirPath, progressCallback) {
  const items = [];

  try {
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) return items;

    const files = await fs.readdir(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);

      try {
        const fileStats = await fs.stat(filePath);
        const size = await getDirectorySize(filePath);

        if (size > 1024 * 1024) { // Only include items > 1MB
          items.push({
            path: filePath,
            name: file,
            size: size,
            sizeFormatted: formatBytes(size),
            type: fileStats.isDirectory() ? 'directory' : 'file',
            modified: fileStats.mtime,
            selected: false
          });
        }

        if (progressCallback) {
          progressCallback({ scanning: filePath });
        }
      } catch (err) {
        // Skip files we can't access
      }
    }
  } catch (err) {
    console.error(`Error scanning ${dirPath}:`, err.message);
  }

  return items;
}

async function scanSystem(progressCallback) {
  const platform = process.platform;
  const patterns = SAFE_PATTERNS[platform] || SAFE_PATTERNS.darwin;

  const allItems = [];
  let totalSize = 0;

  for (const pattern of patterns) {
    if (progressCallback) {
      progressCallback({ scanning: pattern, found: allItems.length });
    }

    try {
      const items = await scanDirectory(pattern, progressCallback);
      allItems.push(...items);
      totalSize += items.reduce((sum, item) => sum + item.size, 0);
    } catch (err) {
      console.error(`Error scanning pattern ${pattern}:`, err.message);
    }
  }

  // Sort by size (largest first)
  allItems.sort((a, b) => b.size - a.size);

  return {
    items: allItems,
    totalSize: totalSize,
    totalSizeFormatted: formatBytes(totalSize),
    scannedLocations: patterns.length
  };
}

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

async function cleanFiles(filesToClean, progressCallback) {
  const results = {
    cleaned: [],
    failed: [],
    totalFreed: 0
  };

  for (let i = 0; i < filesToClean.length; i++) {
    const item = filesToClean[i];

    // Safety check - never delete protected paths
    if (isProtectedPath(item.path)) {
      results.failed.push({
        path: item.path,
        error: 'Protected path - skipped for safety'
      });
      continue;
    }

    if (progressCallback) {
      progressCallback({
        current: i + 1,
        total: filesToClean.length,
        path: item.path
      });
    }

    const result = await deleteItem(item.path);

    if (result.success) {
      results.cleaned.push(item.path);
      results.totalFreed += item.size;
    } else {
      results.failed.push({
        path: item.path,
        error: result.error
      });
    }
  }

  results.totalFreedFormatted = formatBytes(results.totalFreed);

  return results;
}

module.exports = {
  scanSystem,
  cleanFiles,
  formatBytes
};
