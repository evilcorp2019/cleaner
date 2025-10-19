const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

// Default directories to scan
const DEFAULT_SCAN_PATHS = {
  darwin: [
    path.join(os.homedir(), 'Downloads'),
    path.join(os.homedir(), 'Documents'),
    path.join(os.homedir(), 'Desktop'),
    path.join(os.homedir(), 'Pictures'),
    path.join(os.homedir(), 'Music'),
    path.join(os.homedir(), 'Movies')
  ],
  win32: [
    path.join(os.homedir(), 'Downloads'),
    path.join(os.homedir(), 'Documents'),
    path.join(os.homedir(), 'Desktop'),
    path.join(os.homedir(), 'Pictures'),
    path.join(os.homedir(), 'Music'),
    path.join(os.homedir(), 'Videos')
  ]
};

// System directories to skip
const SKIP_PATTERNS = [
  'node_modules',
  '.git',
  'System32',
  'Windows',
  'Program Files',
  'Applications',
  '/System',
  '/Library',
  '/usr',
  '/bin',
  '/sbin',
  'AppData/Local/Temp',
  'AppData/Local/Microsoft',
  'Library/Caches',
  'Library/Application Support',
  '.cache',
  '.npm',
  '.yarn'
];

// File type filters
const FILE_TYPE_FILTERS = {
  all: null,
  images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.tiff', '.ico', '.heic'],
  videos: ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm', '.m4v', '.mpg', '.mpeg'],
  documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.odt', '.ods'],
  audio: ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.wma'],
  archives: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz']
};

/**
 * Check if a path should be skipped
 */
function shouldSkipPath(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  return SKIP_PATTERNS.some(pattern =>
    normalizedPath.includes(pattern)
  );
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Calculate hash of a file using streaming for memory efficiency
 * Uses partial hashing for large files (first and last chunks)
 */
async function calculateFileHash(filePath, fileSize) {
  return new Promise((resolve, reject) => {
    // For files under 10MB, hash the entire file
    // For larger files, hash first 1MB + last 1MB for performance
    const CHUNK_SIZE = 1024 * 1024; // 1MB
    const shouldUsePartialHash = fileSize > 10 * CHUNK_SIZE;

    const hash = crypto.createHash('md5'); // MD5 is sufficient for duplicate detection
    const stream = fsSync.createReadStream(filePath, {
      highWaterMark: CHUNK_SIZE
    });

    let bytesRead = 0;
    let firstChunkProcessed = false;

    stream.on('data', (chunk) => {
      if (shouldUsePartialHash) {
        // For large files, only hash first and last chunks
        if (!firstChunkProcessed) {
          hash.update(chunk);
          firstChunkProcessed = true;

          // Jump to last chunk if file is large enough
          if (fileSize > 2 * CHUNK_SIZE) {
            stream.destroy();

            // Read last chunk
            const lastStream = fsSync.createReadStream(filePath, {
              start: fileSize - CHUNK_SIZE,
              end: fileSize
            });

            lastStream.on('data', (lastChunk) => {
              hash.update(lastChunk);
            });

            lastStream.on('end', () => {
              resolve(hash.digest('hex'));
            });

            lastStream.on('error', reject);
          }
        }
      } else {
        // For smaller files, hash everything
        hash.update(chunk);
      }

      bytesRead += chunk.length;
    });

    stream.on('end', () => {
      if (!shouldUsePartialHash || fileSize <= 2 * CHUNK_SIZE) {
        resolve(hash.digest('hex'));
      }
    });

    stream.on('error', reject);
  });
}

/**
 * Recursively scan directory for files
 */
async function scanDirectory(dirPath, fileTypeFilter, progressCallback, cancelToken) {
  const files = [];

  async function scan(currentPath, depth = 0) {
    // Check cancellation
    if (cancelToken && cancelToken.cancelled) {
      throw new Error('Scan cancelled by user');
    }

    // Limit recursion depth to prevent infinite loops and excessive scanning
    if (depth > 10) return;

    // Skip system and hidden directories
    if (shouldSkipPath(currentPath)) {
      return;
    }

    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        // Check cancellation in the loop
        if (cancelToken && cancelToken.cancelled) {
          throw new Error('Scan cancelled by user');
        }

        const fullPath = path.join(currentPath, entry.name);

        // Skip hidden files and system files
        if (entry.name.startsWith('.')) continue;

        try {
          if (entry.isDirectory()) {
            await scan(fullPath, depth + 1);
          } else if (entry.isFile()) {
            // Apply file type filter
            const ext = path.extname(entry.name).toLowerCase();

            if (fileTypeFilter && !fileTypeFilter.includes(ext)) {
              continue;
            }

            const stats = await fs.stat(fullPath);

            // Only consider files >= 1KB to avoid tiny config files
            if (stats.size >= 1024) {
              files.push({
                path: fullPath,
                name: entry.name,
                size: stats.size,
                modified: stats.mtime,
                extension: ext
              });

              if (progressCallback && files.length % 100 === 0) {
                progressCallback({
                  stage: 'scanning',
                  currentPath: fullPath,
                  filesFound: files.length
                });
              }
            }
          }
        } catch (err) {
          // Skip files/directories we can't access
          console.error(`Error accessing ${fullPath}:`, err.message);
        }
      }
    } catch (err) {
      // Skip directories we can't read
      console.error(`Error reading directory ${currentPath}:`, err.message);
    }
  }

  await scan(dirPath);
  return files;
}

/**
 * Find duplicate files
 */
async function findDuplicates(options = {}, progressCallback, cancelToken) {
  const {
    paths = DEFAULT_SCAN_PATHS[process.platform] || DEFAULT_SCAN_PATHS.darwin,
    fileType = 'all',
    minFileSize = 1024 // 1KB minimum
  } = options;

  const startTime = Date.now();

  // Step 1: Scan all files
  if (progressCallback) {
    progressCallback({ stage: 'initializing', message: 'Starting scan...' });
  }

  let allFiles = [];

  for (const scanPath of paths) {
    try {
      const stats = await fs.stat(scanPath);
      if (!stats.isDirectory()) continue;

      if (progressCallback) {
        progressCallback({
          stage: 'scanning',
          currentPath: scanPath,
          filesFound: allFiles.length
        });
      }

      const fileTypeFilter = FILE_TYPE_FILTERS[fileType] || null;
      const files = await scanDirectory(scanPath, fileTypeFilter, progressCallback, cancelToken);
      allFiles.push(...files);
    } catch (err) {
      console.error(`Error scanning ${scanPath}:`, err.message);
    }
  }

  if (progressCallback) {
    progressCallback({
      stage: 'analyzing',
      message: `Found ${allFiles.length} files. Analyzing...`,
      filesFound: allFiles.length
    });
  }

  // Step 2: Group by size (files with different sizes can't be duplicates)
  const sizeGroups = new Map();

  for (const file of allFiles) {
    if (file.size >= minFileSize) {
      if (!sizeGroups.has(file.size)) {
        sizeGroups.set(file.size, []);
      }
      sizeGroups.get(file.size).push(file);
    }
  }

  // Filter out unique sizes
  const potentialDuplicates = [];
  for (const [size, files] of sizeGroups.entries()) {
    if (files.length > 1) {
      potentialDuplicates.push(...files);
    }
  }

  if (progressCallback) {
    progressCallback({
      stage: 'hashing',
      message: `Hashing ${potentialDuplicates.length} potential duplicates...`,
      total: potentialDuplicates.length,
      current: 0
    });
  }

  // Step 3: Calculate hashes for potential duplicates
  const hashGroups = new Map();
  let hashedCount = 0;

  for (const file of potentialDuplicates) {
    // Check cancellation
    if (cancelToken && cancelToken.cancelled) {
      throw new Error('Scan cancelled by user');
    }

    try {
      const hash = await calculateFileHash(file.path, file.size);
      const key = `${file.size}-${hash}`; // Combine size and hash for key

      if (!hashGroups.has(key)) {
        hashGroups.set(key, []);
      }

      hashGroups.get(key).push({
        ...file,
        hash
      });

      hashedCount++;

      if (progressCallback && hashedCount % 10 === 0) {
        progressCallback({
          stage: 'hashing',
          current: hashedCount,
          total: potentialDuplicates.length,
          message: `Hashing files... ${hashedCount}/${potentialDuplicates.length}`
        });
      }
    } catch (err) {
      console.error(`Error hashing ${file.path}:`, err.message);
    }
  }

  // Step 4: Build duplicate groups
  const duplicateGroups = [];
  let totalDuplicateSize = 0;
  let totalDuplicateFiles = 0;

  for (const [key, files] of hashGroups.entries()) {
    if (files.length > 1) {
      // Sort by modified date (newest first by default)
      files.sort((a, b) => b.modified - a.modified);

      const groupSize = files[0].size * (files.length - 1); // Space that could be freed
      totalDuplicateSize += groupSize;
      totalDuplicateFiles += files.length - 1;

      duplicateGroups.push({
        id: key,
        hash: files[0].hash,
        size: files[0].size,
        sizeFormatted: formatBytes(files[0].size),
        count: files.length,
        files: files.map(f => ({
          path: f.path,
          name: f.name,
          directory: path.dirname(f.path),
          size: f.size,
          sizeFormatted: formatBytes(f.size),
          modified: f.modified.toISOString(),
          extension: f.extension
        })),
        potentialSavings: groupSize,
        potentialSavingsFormatted: formatBytes(groupSize)
      });
    }
  }

  // Sort groups by potential savings (largest first)
  duplicateGroups.sort((a, b) => b.potentialSavings - a.potentialSavings);

  const scanDuration = Date.now() - startTime;

  return {
    success: true,
    groups: duplicateGroups,
    summary: {
      totalFiles: allFiles.length,
      totalDuplicateGroups: duplicateGroups.length,
      totalDuplicateFiles,
      totalPotentialSavings: totalDuplicateSize,
      totalPotentialSavingsFormatted: formatBytes(totalDuplicateSize),
      scanDuration: `${(scanDuration / 1000).toFixed(2)}s`,
      scannedPaths: paths
    }
  };
}

/**
 * Delete selected duplicate files
 */
async function deleteDuplicates(filePaths, progressCallback) {
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
        path: filePath
      });
    }

    try {
      // Verify file still exists
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;

      // Delete the file
      await fs.unlink(filePath);

      results.deleted.push(filePath);
      results.totalFreed += fileSize;
    } catch (err) {
      results.failed.push({
        path: filePath,
        error: err.message
      });
    }
  }

  results.totalFreedFormatted = formatBytes(results.totalFreed);

  return {
    success: true,
    data: results
  };
}

module.exports = {
  findDuplicates,
  deleteDuplicates,
  FILE_TYPE_FILTERS,
  formatBytes
};
