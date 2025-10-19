import { useState, useEffect, useRef } from 'react';

/**
 * Hook for polling browser process status
 * @param {string} browserId - Browser to check (chrome, firefox, safari, etc.)
 * @param {Object} options - Polling configuration
 * @returns {Object} - { isRunning, isChecking, error, refresh }
 */
export function useProcessPolling(browserId, options = {}) {
  const {
    enabled = true,
    interval = 3000, // Default 3 seconds
    fastInterval = 500, // Fast polling after quit (500ms)
    onProcessClosed = null,
    onProcessDetected = null
  } = options;

  const [isRunning, setIsRunning] = useState(null); // null = unknown
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState(null);
  const previousIsRunning = useRef(null);
  const timeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const [pollingSpeed, setPollingSpeed] = useState('normal'); // 'normal' | 'fast'

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Manual refresh function
  const refresh = async () => {
    if (!window.electronAPI || !browserId) return;

    setIsChecking(true);
    try {
      const result = await window.electronAPI.checkBrowserRunning(browserId);

      if (!isMountedRef.current) return;

      if (result.success) {
        const running = result.isRunning;
        setIsRunning(running);
        setError(null);

        // Trigger callbacks on state change
        if (previousIsRunning.current !== null && previousIsRunning.current !== running) {
          if (running && onProcessDetected) {
            onProcessDetected();
          } else if (!running && onProcessClosed) {
            onProcessClosed();
          }
        }

        previousIsRunning.current = running;
      } else {
        setError(result.error || 'Failed to check browser status');
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err.message);
      console.error('Error checking browser status:', err);
    } finally {
      if (isMountedRef.current) {
        setIsChecking(false);
      }
    }
  };

  // Polling effect
  useEffect(() => {
    if (!enabled || !browserId || !window.electronAPI) return;

    const poll = async () => {
      await refresh();

      if (isMountedRef.current && enabled) {
        // Use fast or normal interval based on polling speed
        const currentInterval = pollingSpeed === 'fast' ? fastInterval : interval;
        timeoutRef.current = setTimeout(poll, currentInterval);
      }
    };

    // Start polling
    poll();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [browserId, enabled, interval, fastInterval, pollingSpeed, onProcessClosed, onProcessDetected]);

  // Function to enable fast polling (used after quit button is clicked)
  const enableFastPolling = () => {
    setPollingSpeed('fast');

    // Automatically switch back to normal after 15 seconds
    setTimeout(() => {
      if (isMountedRef.current) {
        setPollingSpeed('normal');
      }
    }, 15000);
  };

  return {
    isRunning,
    isChecking,
    error,
    isLoading: isRunning === null,
    refresh,
    enableFastPolling
  };
}
