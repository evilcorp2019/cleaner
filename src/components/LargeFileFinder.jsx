import React, { useState, useEffect } from 'react';
import './LargeFileFinder.css';
import FileTable from './FileTable';

function LargeFileFinder({ onBack }) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(null);
  const [scanResults, setScanResults] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(null);

  // Filter states
  const [minSize, setMinSize] = useState(100 * 1024 * 1024); // 100MB default
  const [maxAge, setMaxAge] = useState(null);
  const [fileTypes, setFileTypes] = useState('all');

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onLargeFileScanProgress((data) => {
        setScanProgress(data);
      });

      window.electronAPI.onLargeFileDeleteProgress((data) => {
        setDeleteProgress(data);
      });

      return () => {
        if (window.electronAPI?.removeLargeFileScanProgressListener) {
          window.electronAPI.removeLargeFileScanProgressListener();
        }
        if (window.electronAPI?.removeLargeFileDeleteProgressListener) {
          window.electronAPI.removeLargeFileDeleteProgressListener();
        }
      };
    }
  }, []);

  const handleScan = async () => {
    if (!window.electronAPI) {
      alert('This feature requires the desktop application. Please run the app with "npm run dev"');
      return;
    }

    setIsScanning(true);
    setScanProgress(null);
    setScanResults(null);
    setSelectedFiles(new Set());

    try {
      const result = await window.electronAPI.scanLargeFiles({
        minSize,
        maxAge,
        fileTypes,
        excludeSystem: true
      });

      if (result.success) {
        setScanResults(result);
      } else {
        if (!result.cancelled) {
          alert('Scan failed: ' + result.error);
        }
      }
    } catch (error) {
      alert('Scan error: ' + error.message);
    } finally {
      setIsScanning(false);
      setScanProgress(null);
    }
  };

  const handleCancelScan = async () => {
    if (window.electronAPI) {
      await window.electronAPI.cancelLargeFileScan();
    }
  };

  const handleDelete = async () => {
    if (!window.electronAPI) {
      alert('This feature requires the desktop application. Please run the app with "npm run dev"');
      return;
    }

    if (selectedFiles.size === 0) {
      alert('Please select files to delete');
      return;
    }

    const filesToDelete = Array.from(selectedFiles);
    const totalSize = filesToDelete.reduce((sum, filePath) => {
      const file = scanResults.files.find(f => f.path === filePath);
      return file ? sum + file.size : sum;
    }, 0);

    const formattedSize = formatBytes(totalSize);

    if (!confirm(
      `Are you sure you want to move ${filesToDelete.length} file(s) to trash?\n\n` +
      `This will free up ${formattedSize} of space.\n\n` +
      `Files will be moved to trash and can be recovered if needed.`
    )) {
      return;
    }

    setIsDeleting(true);
    setDeleteProgress(null);

    try {
      const result = await window.electronAPI.deleteLargeFiles(filesToDelete);

      if (result.success) {
        alert(
          `Successfully deleted ${result.data.deleted.length} file(s)!\n` +
          `Freed ${result.data.totalFreedFormatted} of space.` +
          (result.data.failed.length > 0 ? `\n\nFailed to delete ${result.data.failed.length} file(s).` : '')
        );

        // Remove deleted files from results
        setScanResults(prev => ({
          ...prev,
          files: prev.files.filter(f => !result.data.deleted.includes(f.path)),
          summary: {
            ...prev.summary,
            totalFiles: prev.summary.totalFiles - result.data.deleted.length,
            totalSize: prev.summary.totalSize - result.data.totalFreed,
            totalSizeFormatted: formatBytes(prev.summary.totalSize - result.data.totalFreed)
          }
        }));

        setSelectedFiles(new Set());
      } else {
        alert('Delete failed: ' + result.error);
      }
    } catch (error) {
      alert('Delete error: ' + error.message);
    } finally {
      setIsDeleting(false);
      setDeleteProgress(null);
    }
  };

  const handleExportCSV = async () => {
    if (!window.electronAPI || !scanResults) {
      return;
    }

    try {
      const result = await window.electronAPI.exportLargeFilesCSV(scanResults.files);
      if (result.success) {
        const blob = new Blob([result.data], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `large-files-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      alert('Export failed: ' + error.message);
    }
  };

  const handleOpenLocation = async (filePath) => {
    if (window.electronAPI) {
      await window.electronAPI.openFileLocation(filePath);
    }
  };

  const handleFileSelect = (filePath) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filePath)) {
        newSet.delete(filePath);
      } else {
        newSet.add(filePath);
      }
      return newSet;
    });
  };

  const handleSelectAll = (files, select) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      files.forEach(file => {
        if (select) {
          newSet.add(file.path);
        } else {
          newSet.delete(file.path);
        }
      });
      return newSet;
    });
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
  };

  const getTotalSelectedSize = () => {
    if (!scanResults) return 0;
    let totalSize = 0;
    for (const filePath of selectedFiles) {
      const file = scanResults.files.find(f => f.path === filePath);
      if (file) {
        totalSize += file.size;
      }
    }
    return totalSize;
  };

  const getProgressMessage = () => {
    if (!scanProgress) return '';

    if (scanProgress.stage === 'initializing') {
      return 'Starting scan...';
    } else if (scanProgress.stage === 'scanning') {
      const foundText = scanProgress.filesFound ? ` Found ${scanProgress.filesFound} files` : '';
      return `Scanning files...${foundText}`;
    } else if (scanProgress.stage === 'complete') {
      return 'Scan complete!';
    }

    return scanProgress.message || 'Processing...';
  };

  return (
    <div className="large-file-finder">
      <div className="page-header">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
        <h1>Large & Old File Finder</h1>
      </div>

      <div className="page-content">
        {/* Filter Controls */}
        <div className="filter-panel">
          <div className="filter-section">
            <h3>Scan Filters</h3>
            <div className="filter-controls">
              <div className="filter-group">
                <label htmlFor="min-size">Minimum Size:</label>
                <select
                  id="min-size"
                  value={minSize}
                  onChange={(e) => setMinSize(Number(e.target.value))}
                  disabled={isScanning || isDeleting}
                >
                  <option value={50 * 1024 * 1024}>50 MB</option>
                  <option value={100 * 1024 * 1024}>100 MB</option>
                  <option value={500 * 1024 * 1024}>500 MB</option>
                  <option value={1024 * 1024 * 1024}>1 GB</option>
                  <option value={2 * 1024 * 1024 * 1024}>2 GB</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="max-age">File Age:</label>
                <select
                  id="max-age"
                  value={maxAge || ''}
                  onChange={(e) => setMaxAge(e.target.value ? Number(e.target.value) : null)}
                  disabled={isScanning || isDeleting}
                >
                  <option value="">All Files</option>
                  <option value={30 * 24 * 60 * 60 * 1000}>Older than 30 days</option>
                  <option value={60 * 24 * 60 * 60 * 1000}>Older than 60 days</option>
                  <option value={90 * 24 * 60 * 60 * 1000}>Older than 90 days</option>
                  <option value={180 * 24 * 60 * 60 * 1000}>Older than 180 days</option>
                  <option value={365 * 24 * 60 * 60 * 1000}>Older than 1 year</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="file-types">File Type:</label>
                <select
                  id="file-types"
                  value={fileTypes}
                  onChange={(e) => setFileTypes(e.target.value)}
                  disabled={isScanning || isDeleting}
                >
                  <option value="all">All Types</option>
                  <option value="videos">Videos</option>
                  <option value="images">Images</option>
                  <option value="documents">Documents</option>
                  <option value="archives">Archives</option>
                  <option value="applications">Applications</option>
                </select>
              </div>

              <button
                className="scan-button"
                onClick={handleScan}
                disabled={isScanning || isDeleting}
              >
                {isScanning ? 'Scanning...' : 'Start Scan'}
              </button>

              {isScanning && (
                <button className="cancel-button" onClick={handleCancelScan}>
                  Cancel
                </button>
              )}
            </div>
          </div>

          {isScanning && scanProgress && (
            <div className="progress-info">
              <div className="progress-message">{getProgressMessage()}</div>
              {scanProgress.currentPath && (
                <div className="progress-path">{scanProgress.currentPath}</div>
              )}
              <div className="progress-bar">
                <div className="progress-fill scanning" />
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        {scanResults && !isScanning && (
          <>
            <div className="results-summary">
              <div className="summary-cards">
                <div className="summary-card">
                  <div className="summary-label">Files Found</div>
                  <div className="summary-value">{scanResults.summary.totalFiles.toLocaleString()}</div>
                </div>
                <div className="summary-card highlight">
                  <div className="summary-label">Total Size</div>
                  <div className="summary-value">{scanResults.summary.totalSizeFormatted}</div>
                </div>
                {selectedFiles.size > 0 && (
                  <div className="summary-card selected">
                    <div className="summary-label">Selected ({selectedFiles.size})</div>
                    <div className="summary-value">{formatBytes(getTotalSelectedSize())}</div>
                  </div>
                )}
              </div>

              <div className="action-buttons">
                {scanResults.files.length > 0 && (
                  <>
                    <button className="export-button" onClick={handleExportCSV}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Export CSV
                    </button>
                    <button
                      className="delete-button"
                      onClick={handleDelete}
                      disabled={selectedFiles.size === 0 || isDeleting}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                      {isDeleting ? 'Deleting...' : `Move to Trash (${selectedFiles.size})`}
                    </button>
                  </>
                )}
              </div>
            </div>

            {isDeleting && deleteProgress && (
              <div className="progress-info">
                <div className="progress-message">
                  Deleting file {deleteProgress.current} of {deleteProgress.total}...
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(deleteProgress.current / deleteProgress.total) * 100}%`
                    }}
                  />
                </div>
              </div>
            )}

            {/* Results Table */}
            {scanResults.files.length === 0 ? (
              <div className="no-results">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <h3>No Files Found</h3>
                <p>No files match your search criteria. Try adjusting your filters.</p>
              </div>
            ) : (
              <FileTable
                files={scanResults.files}
                selectedFiles={selectedFiles}
                onFileSelect={handleFileSelect}
                onSelectAll={handleSelectAll}
                onOpenLocation={handleOpenLocation}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default LargeFileFinder;
