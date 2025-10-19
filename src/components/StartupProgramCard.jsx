import React, { useState } from 'react';
import { FaToggleOn, FaToggleOff, FaTrash, FaInfoCircle, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import './StartupProgramCard.css';

const StartupProgramCard = ({ program, onToggle, onRemove, selected, onSelect }) => {
  const [showDetails, setShowDetails] = useState(false);

  const getImpactBadge = () => {
    const impactClass = `impact-badge impact-${program.impact}`;
    const impactText = program.impact.toUpperCase();
    const impactIcon = {
      high: '',
      medium: '',
      low: ''
    };

    return (
      <span className={impactClass}>
        {impactIcon[program.impact]} {impactText}
      </span>
    );
  };

  const getEssentialBadge = () => {
    if (program.essential) {
      return (
        <span className="essential-badge">
          <FaExclamationTriangle /> ESSENTIAL
        </span>
      );
    }
    return null;
  };

  const handleToggle = async () => {
    if (program.essential && program.enabled) {
      // Don't allow disabling essential programs without warning
      const confirmed = window.confirm(
        `Warning: "${program.name}" is marked as essential for system functionality.\n\nDisabling it may cause issues. Are you sure you want to continue?`
      );
      if (!confirmed) return;
    }

    onToggle(program.id, !program.enabled);
  };

  const handleRemove = async () => {
    if (program.essential) {
      alert(`Cannot remove "${program.name}" as it is essential for system functionality.`);
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to remove "${program.name}" from startup?\n\nYou can add it back later if needed.`
    );

    if (confirmed) {
      onRemove(program.id);
    }
  };

  return (
    <div className={`startup-program-card ${!program.enabled ? 'disabled' : ''} ${selected ? 'selected' : ''}`}>
      <div className="program-card-header">
        <div className="program-info-left">
          <input
            type="checkbox"
            className="program-checkbox"
            checked={selected}
            onChange={(e) => onSelect(program.id, e.target.checked)}
            disabled={program.essential}
          />

          <div className="program-main-info">
            <h4 className="program-name">{program.name}</h4>
            <p className="program-publisher">{program.publisher}</p>
          </div>
        </div>

        <div className="program-info-right">
          {getImpactBadge()}
          {getEssentialBadge()}

          <div className="program-actions">
            <button
              className="btn-icon btn-info"
              onClick={() => setShowDetails(!showDetails)}
              title="Program details"
            >
              <FaInfoCircle />
            </button>

            <button
              className={`btn-icon ${program.enabled ? 'btn-toggle-on' : 'btn-toggle-off'}`}
              onClick={handleToggle}
              title={program.enabled ? 'Disable at startup' : 'Enable at startup'}
            >
              {program.enabled ? <FaToggleOn /> : <FaToggleOff />}
            </button>

            <button
              className="btn-icon btn-danger"
              onClick={handleRemove}
              title="Remove from startup"
              disabled={program.essential}
            >
              <FaTrash />
            </button>
          </div>
        </div>
      </div>

      {showDetails && (
        <div className="program-details">
          <div className="detail-row">
            <span className="detail-label">Description:</span>
            <span className="detail-value">{program.description}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Category:</span>
            <span className="detail-value">{program.category}</span>
          </div>

          {program.path && (
            <div className="detail-row">
              <span className="detail-label">Path:</span>
              <span className="detail-value detail-path">{program.path}</span>
            </div>
          )}

          <div className="detail-row">
            <span className="detail-label">Startup Method:</span>
            <span className="detail-value">{program.method}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Boot Time Impact:</span>
            <span className="detail-value">~{program.bootTimeImpactSeconds}s</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Status:</span>
            <span className="detail-value">
              {program.enabled ? (
                <span className="status-enabled">
                  <FaCheckCircle /> Enabled
                </span>
              ) : (
                <span className="status-disabled">Disabled</span>
              )}
            </span>
          </div>

          {program.dependencies && program.dependencies.length > 0 && (
            <div className="detail-row">
              <span className="detail-label">Dependencies:</span>
              <span className="detail-value">{program.dependencies.join(', ')}</span>
            </div>
          )}

          <div className="recommendation-section">
            <h5>Recommendation:</h5>
            <p className="recommendation-text">{program.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StartupProgramCard;
