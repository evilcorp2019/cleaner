import React, { useState } from 'react';
import './ExtensionRemnantCard.css';
import { FiTrash2, FiClock, FiDatabase, FiChevronDown, FiChevronUp } from 'react-icons/fi';

const ExtensionRemnantCard = ({ remnant, isSelected, onToggle, onClean, disabled }) => {
  const [expanded, setExpanded] = useState(false);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now - d);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const getDataTypeIcon = (dataType) => {
    return <FiDatabase className="data-type-icon" />;
  };

  const handleCheckboxChange = (e) => {
    e.stopPropagation();
    onToggle();
  };

  return (
    <div className={`extension-remnant-card ${isSelected ? 'selected' : ''}`}>
      <div className="card-main" onClick={() => setExpanded(!expanded)}>
        <div className="card-left">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
            onClick={(e) => e.stopPropagation()}
            disabled={disabled}
            className="extension-checkbox"
          />

          <div className="extension-info">
            <div className="extension-name-row">
              <h3 className="extension-name">{remnant.name}</h3>
              {remnant.version && remnant.version !== 'Unknown' && (
                <span className="extension-version">v{remnant.version}</span>
              )}
            </div>

            <div className="extension-meta">
              <span className="extension-id" title={remnant.id}>
                ID: {remnant.id.substring(0, 20)}
                {remnant.id.length > 20 ? '...' : ''}
              </span>

              <div className="meta-divider">•</div>

              <div className="extension-modified">
                <FiClock size={12} />
                <span>Last modified {formatDate(remnant.lastModified)}</span>
              </div>
            </div>

            {remnant.description && (
              <p className="extension-description">{remnant.description}</p>
            )}

            {remnant.author && remnant.author !== '' && (
              <p className="extension-author">By: {remnant.author}</p>
            )}
          </div>
        </div>

        <div className="card-right">
          <div className="extension-size">
            <span className="size-value">{formatBytes(remnant.totalSize)}</span>
            <span className="size-label">Space used</span>
          </div>

          <div className="card-actions">
            <button
              className="btn-expand"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              title={expanded ? 'Show less' : 'Show more'}
            >
              {expanded ? <FiChevronUp /> : <FiChevronDown />}
            </button>

            <button
              className="btn-clean-single"
              onClick={(e) => {
                e.stopPropagation();
                onClean();
              }}
              disabled={disabled}
              title="Clean this extension"
            >
              <FiTrash2 />
              Clean
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="card-details">
          <div className="details-section">
            <h4>Data Locations ({remnant.dataLocations.length})</h4>
            <div className="data-locations">
              {remnant.dataLocations.map((location, index) => (
                <div key={index} className="data-location-item">
                  {getDataTypeIcon(location)}
                  <span>{location}</span>
                </div>
              ))}
            </div>
          </div>

          {remnant.paths && remnant.paths.length > 0 && (
            <div className="details-section">
              <h4>Paths ({remnant.paths.length})</h4>
              <div className="paths-list">
                {remnant.paths.map((filePath, index) => (
                  <div key={index} className="path-item" title={filePath}>
                    <code>{filePath}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExtensionRemnantCard;
