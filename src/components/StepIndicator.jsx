import React from 'react';
import './StepIndicator.css';

/**
 * Step indicator for multi-step workflows
 * @param {number} currentStep - Current active step (0-indexed)
 */
function StepIndicator({ currentStep = 0 }) {
  const steps = [
    { label: 'Close Browser', description: 'Quit running browsers' },
    { label: 'Select Data', description: 'Choose what to clean' },
    { label: 'Clean & Verify', description: 'Remove data and review' }
  ];

  return (
    <div className="step-indicator">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        const isFuture = index > currentStep;

        return (
          <React.Fragment key={index}>
            <div className={`step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isFuture ? 'future' : ''}`}>
              <div className="step-marker">
                {isCompleted ? (
                  <svg className="checkmark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span className="step-number">{index + 1}</span>
                )}
              </div>
              <div className="step-content">
                <div className="step-label">{step.label}</div>
                <div className="step-description">{step.description}</div>
              </div>
            </div>

            {index < steps.length - 1 && (
              <div className={`step-connector ${isCompleted ? 'completed' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default StepIndicator;
