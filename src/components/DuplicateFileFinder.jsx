import React, { useState, useEffect } from 'react';
import './DuplicateFileFinder.css';

function DuplicateFileFinder({ onBack }) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(null);
  const [scanResults, setScanResults] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [fileTypeFilter, setFileTypeFilter] = useState('all');

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onDuplicateScanProgress((data) => {
        setScanProgress(data);
      });

      window.electronAPI.onDuplicateDeleteProgress((data) => {
        setDeleteProgress(data);
      });

      return () => {
        if (window.electronAPI?.removeDuplicateScanProgressListener) {
          window.electronAPI.removeDuplicateScanProgressListener();
        }
        if (window.electronAPI?.removeDuplicateDeleteProgressListener) {
          window.electronAPI.removeDuplicateDeleteProgressListener();
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
    setExpandedGroups(new Set());

    try {
      const result = await window.electronAPI.scanDuplicates({
        fileType: fileTypeFilter
      });

      if (result.success) {
        setScanResults(result);
      } else {
        alert('Scan failed: ' + result.error);
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
      await window.electronAPI.cancelDuplicateScan();
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
      for (const group of scanResults.groups) {
        const file = group.files.find(f => f.path === filePath);
        if (file) return sum + file.size;
      }
      return sum;
    }, 0);

    const formattedSize = formatBytes(totalSize);

    if (!confirm(
      `Are you sure you want to delete ${filesToDelete.length} duplicate file(s)?\n\n` +
      `This will free up ${formattedSize} of space.\n\n` +
      `This action cannot be undone.`
    )) {
      return;
    }

    setIsDeleting(true);
    setDeleteProgress(null);

    try {
      const result = await window.electronAPI.deleteDuplicates(filesToDelete);

      if (result.success) {
        alert(
          `Successfully deleted ${result.data.deleted.length} file(s)!\n` +
          `Freed ${result.data.totalFreedFormatted} of space.` +
          (result.data.failed.length > 0 ? `\n\nFailed to delete ${result.data.failed.length} file(s).` : '')
        );

        // Rescan after deletion
        handleScan();
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

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const toggleFileSelection = (filePath) => {
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

  const selectAllInGroup = (group, keepFirst = true) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      const filesToSelect = keepFirst ? group.files.slice(1) : group.files;
      filesToSelect.forEach(file => newSet.add(file.path));
      return newSet;
    });
  };

  const deselectAllInGroup = (group) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      group.files.forEach(file => newSet.delete(file.path));
      return newSet;
    });
  };

  const selectAllDuplicates = (keepNewest = true) => {
    if (!scanResults) return;

    const newSet = new Set();
    scanResults.groups.forEach(group => {
      const filesToSelect = keepNewest ? group.files.slice(1) : group.files.slice(0, -1);
      filesToSelect.forEach(file => newSet.add(file.path));
    });

    setSelectedFiles(newSet);
  };

  const getTotalSelectedSize = () => {
    if (!scanResults) return 0;

    let totalSize = 0;
    for (const filePath of selectedFiles) {
      for (const group of scanResults.groups) {
        const file = group.files.find(f => f.path === filePath);
        if (file) {
          totalSize += file.size;
          break;
        }
      }
    }
    return totalSize;
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getProgressMessage = () => {
    if (!scanProgress) return '';

    if (scanProgress.stage === 'scanning') {
      return `Scanning files... Found ${scanProgress.filesFound || 0} files`;
    } else if (scanProgress.stage === 'analyzing') {
      return scanProgress.message || 'Analyzing files...';
    } else if (scanProgress.stage === 'hashing') {
      const progress = scanProgress.current && scanProgress.total
        ? ` (${scanProgress.current}/${scanProgress.total})`
        : '';
      return `Calculating file hashes${progress}...`;
    } else if (scanProgress.stage === 'initializing') {
      return 'Starting scan...';
    }

    return 'Processing...';
  };

  return (
    <div className="duplicate-finder">
      <div className="page-header">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
        <h1>Duplicate File Finder</h1>
      </div>

      <div className="page-content">
        {/* Scan Controls */}
        <div className="scan-controls">
          <div className="control-row">
            <div className="filter-group">
              <label htmlFor="file-type">File Type:</label>
              <select
                id="file-type"
                value={fileTypeFilter}
                onChange={(e) => setFileTypeFilter(e.target.value)}
                disabled={isScanning || isDeleting}
              >
                <option value="all">All Files</option>
                <option value="images">Images</option>
                <option value="videos">Videos</option>
                <option value="documents">Documents</option>
                <option value="audio">Audio</option>
                <option value="archives">Archives</option>
              </select>
            </div>

            <button
              className="scan-button"
              onClick={handleScan}
              disabled={isScanning || isDeleting}
            >
              {isScanning ? 'Scanning...' : 'Scan for Duplicates'}
            </button>

            {isScanning && (
              <button className="cancel-button" onClick={handleCancelScan}>
                Cancel
              </button>
            )}
          </div>

          {isScanning && scanProgress && (
            <div className="progress-info">
              <div className="progress-message">{getProgressMessage()}</div>
              {scanProgress.stage === 'hashing' && scanProgress.total && (
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(scanProgress.current / scanProgress.total) * 100}%`
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results Summary */}
        {scanResults && !isScanning && (
          <div className="results-summary">
            <div className="summary-card">
              <div className="summary-item">
                <span className="summary-label">Files Scanned</span>
                <span className="summary-value">{scanResults.summary.totalFiles.toLocaleString()}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Duplicate Groups</span>
                <span className="summary-value">{scanResults.summary.totalDuplicateGroups}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Duplicate Files</span>
                <span className="summary-value">{scanResults.summary.totalDuplicateFiles}</span>
              </div>
              <div className="summary-item highlight">
                <span className="summary-label">Potential Savings</span>
                <span className="summary-value">{scanResults.summary.totalPotentialSavingsFormatted}</span>
              </div>
            </div>

            {scanResults.groups.length > 0 && (
              <div className="action-controls">
                <div className="selection-buttons">
                  <button
                    className="action-btn secondary"
                    onClick={() => selectAllDuplicates(true)}
                  >
                    Select All (Keep Newest)
                  </button>
                  <button
                    className="action-btn secondary"
                    onClick={() => selectAllDuplicates(false)}
                  >
                    Select All (Keep Oldest)
                  </button>
                  <button
                    className="action-btn secondary"
                    onClick={() => setSelectedFiles(new Set())}
                  >
                    Deselect All
                  </button>
                </div>

                <div className="delete-section">
                  <div className="selected-info">
                    {selectedFiles.size > 0 && (
                      <>
                        <span className="selected-count">{selectedFiles.size} files selected</span>
                        <span className="selected-size">{formatBytes(getTotalSelectedSize())}</span>
                      </>
                    )}
                  </div>
                  <button
                    className="delete-button"
                    onClick={handleDelete}
                    disabled={selectedFiles.size === 0 || isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Selected'}
                  </button>
                </div>
              </div>
            )}

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
          </div>
        )}

        {/* Duplicate Groups */}
        {scanResults && !isScanning && (
          <div className="duplicate-groups">
            {scanResults.groups.length === 0 ? (
              <div className="no-duplicates">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <h3>No Duplicates Found</h3>
                <p>Your files are clean! No duplicate files were detected.</p>
              </div>
            ) : (
              scanResults.groups.map(group => {
                const isExpanded = expandedGroups.has(group.id);
                const groupFiles = group.files;
                const allSelected = groupFiles.every(f => selectedFiles.has(f.path));
                const someSelected = groupFiles.some(f => selectedFiles.has(f.path)) && !allSelected;

                return (
                  <div key={group.id} className="duplicate-group">
                    <div className="group-header" onClick={() => toggleGroup(group.id)}>
                      <div className="group-info">
                        <svg
                          className={`expand-icon ${isExpanded ? 'expanded' : ''}`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                        <div className="group-details">
                          <span className="group-name">{groupFiles[0].name}</span>
                          <span className="group-meta">
                            {group.count} copies • {group.sizeFormatted} each • Can save {group.potentialSavingsFormatted}
                          </span>
                        </div>
                      </div>
                      <div className="group-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          className={`checkbox ${allSelected ? 'checked' : ''} ${someSelected ? 'partial' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (allSelected) {
                              deselectAllInGroup(group);
                            } else {
                              selectAllInGroup(group, true);
                            }
                          }}
                          title={allSelected ? 'Deselect all in group' : 'Select all duplicates (keep first)'}
                        >
                          {allSelected ? '' : someSelected ? '−' : ''}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="group-files">
                        <div className="group-file-actions">
                          <button
                            className="file-action-btn"
                            onClick={() => selectAllInGroup(group, true)}
                          >
                            Select All (Keep First)
                          </button>
                          <button
                            className="file-action-btn"
                            onClick={() => selectAllInGroup(group, false)}
                          >
                            Select All
                          </button>
                          <button
                            className="file-action-btn"
                            onClick={() => deselectAllInGroup(group)}
                          >
                            Deselect All
                          </button>
                        </div>

                        {groupFiles.map((file, index) => {
                          const isSelected = selectedFiles.has(file.path);
                          const isFirst = index === 0;

                          return (
                            <div
                              key={file.path}
                              className={`file-item ${isSelected ? 'selected' : ''} ${isFirst ? 'original' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleFileSelection(file.path)}
                                className="file-checkbox"
                              />
                              <div className="file-info">
                                <div className="file-name">
                                  {file.name}
                                  {isFirst && <span className="badge">Original</span>}
                                </div>
                                <div className="file-path">{file.directory}</div>
                                <div className="file-meta">
                                  {file.sizeFormatted} • Modified: {new Date(file.modified).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DuplicateFileFinder;
