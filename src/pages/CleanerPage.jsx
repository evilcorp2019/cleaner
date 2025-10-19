import React, { useState, useEffect } from 'react';
import './CleanerPage.css';
import Scanner from '../components/Scanner';
import FileList from '../components/FileList';
import Stats from '../components/Stats';

function CleanerPage({ onBack }) {
  const [scanResults, setScanResults] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [scanProgress, setScanProgress] = useState(null);
  const [cleanProgress, setCleanProgress] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onScanProgress((data) => {
        setScanProgress(data);
      });

      window.electronAPI.onCleanProgress((data) => {
        setCleanProgress(data);
      });

      return () => {
        if (window.electronAPI?.removeScanProgressListener) {
          window.electronAPI.removeScanProgressListener();
        }
        if (window.electronAPI?.removeCleanProgressListener) {
          window.electronAPI.removeCleanProgressListener();
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
    setSelectedFiles([]);

    try {
      const result = await window.electronAPI.scanSystem();
      if (result.success) {
        setScanResults(result.data);
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

  const handleClean = async () => {
    if (!window.electronAPI) {
      alert('This feature requires the desktop application. Please run the app with "npm run dev"');
      return;
    }

    if (selectedFiles.length === 0) {
      alert('Please select files to clean');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedFiles.length} items? This action cannot be undone.`)) {
      return;
    }

    setIsCleaning(true);
    setCleanProgress(null);

    try {
      const result = await window.electronAPI.cleanFiles(selectedFiles);
      if (result.success) {
        alert(`Successfully cleaned ${result.data.cleaned.length} items and freed ${result.data.totalFreedFormatted}!`);

        if (result.data.failed.length > 0) {
          console.warn('Failed to clean some items:', result.data.failed);
        }

        handleScan();
      } else {
        alert('Clean failed: ' + result.error);
      }
    } catch (error) {
      alert('Clean error: ' + error.message);
    } finally {
      setIsCleaning(false);
      setCleanProgress(null);
    }
  };

  const handleSelectAll = () => {
    if (scanResults) {
      setSelectedFiles(scanResults.items);
    }
  };

  const handleDeselectAll = () => {
    setSelectedFiles([]);
  };

  const handleToggleFile = (file) => {
    setSelectedFiles(prev => {
      const index = prev.findIndex(f => f.path === file.path);
      if (index >= 0) {
        return prev.filter((_, i) => i !== index);
      } else {
        return [...prev, file];
      }
    });
  };

  const getTotalSelectedSize = () => {
    return selectedFiles.reduce((sum, file) => sum + file.size, 0);
  };

  return (
    <div className="cleaner-page">
      <div className="page-header">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
        <h1>System Cleaner</h1>
      </div>

      <div className="page-content">
        <div className="control-panel">
          <Scanner
            onScan={handleScan}
            isScanning={isScanning}
            isCleaning={isCleaning}
            scanProgress={scanProgress}
          />

          {scanResults && (
            <Stats
              scanResults={scanResults}
              selectedFiles={selectedFiles}
              getTotalSelectedSize={getTotalSelectedSize}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onClean={handleClean}
              isCleaning={isCleaning}
              cleanProgress={cleanProgress}
            />
          )}
        </div>

        {scanResults && (
          <FileList
            items={scanResults.items}
            selectedFiles={selectedFiles}
            onToggleFile={handleToggleFile}
          />
        )}
      </div>
    </div>
  );
}

export default CleanerPage;
