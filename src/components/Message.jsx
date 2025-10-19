import React from 'react';
import './Message.css';

/**
 * Message component for errors, warnings, info, and success notifications
 * @param {Object} props
 * @param {string} props.type - Message type: 'error' | 'warning' | 'info' | 'success'
 * @param {string} props.title - Message title
 * @param {string} props.message - Message content
 * @param {string} props.details - Optional technical details
 * @param {string} props.action - Action button text
 * @param {Function} props.onAction - Action button handler
 * @param {Function} props.onDismiss - Dismiss handler
 * @param {boolean} props.showIcon - Show icon (default: true)
 */
function Message({
  type = 'error',
  title,
  message,
  details,
  action,
  onAction,
  onDismiss,
  showIcon = true,
  className = ''
}) {
  const icons = {
    error: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    warning: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    info: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
    success: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    )
  };

  return (
    <div className={`message message-${type} ${className}`} role="alert">
      <div className="message-content">
        {showIcon && (
          <div className="message-icon">
            {icons[type]}
          </div>
        )}

        <div className="message-text">
          {title && <div className="message-title">{title}</div>}
          {message && <div className="message-body">{message}</div>}
          {details && <div className="message-details">{details}</div>}
        </div>

        {onDismiss && (
          <button
            className="message-dismiss"
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {action && onAction && (
        <div className="message-actions">
          <button
            className={`message-action-button message-action-button-${type}`}
            onClick={onAction}
          >
            {action}
          </button>
        </div>
      )}
    </div>
  );
}

export default Message;
