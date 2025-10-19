import React from 'react';
import './FileList.css';

function FileList({ items, selectedFiles, onToggleFile }) {
  const isSelected = (file) => {
    return selectedFiles.some(f => f.path === file.path);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (items.length === 0) {
    return (
      <div className="file-list-card">
        <div className="empty-state">
          <h3>No items found</h3>
          <p>Your system is clean or there are no large temporary files to remove.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="file-list-card">
      <div className="file-list-header">
        <h3>Found Items ({items.length})</h3>
        <p className="file-list-hint">Click on items to select them for cleaning</p>
      </div>

      <div className="file-list">
        {items.map((item, index) => (
          <div
            key={index}
            className={`file-item ${isSelected(item) ? 'selected' : ''}`}
            onClick={() => onToggleFile(item)}
          >
            <div className="file-checkbox">
              <input
                type="checkbox"
                checked={isSelected(item)}
                onChange={() => {}}
              />
            </div>

            <div className="file-icon">
              {item.type === 'directory' ? 'DIR' : 'FILE'}
            </div>

            <div className="file-info">
              <div className="file-name">{item.name}</div>
              <div className="file-path">{item.path}</div>
            </div>

            <div className="file-meta">
              <div className="file-size">{item.sizeFormatted}</div>
              <div className="file-date">{formatDate(item.modified)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FileList;
