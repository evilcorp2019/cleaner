const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * Cross-platform process manager for browser control
 */
class ProcessManager {
  constructor() {
    this.platform = process.platform;
  }

  /**
   * Quit a browser gracefully
   * @param {string} browserId - Browser identifier (chrome, firefox, safari, etc.)
   * @returns {Promise<{success: boolean, message: string, code?: string}>}
   */
  async quitBrowser(browserId) {
    const browserConfig = this.getBrowserConfig(browserId);

    if (!browserConfig) {
      return {
        success: false,
        message: `Unknown browser: ${browserId}`,
        code: 'UNKNOWN_BROWSER'
      };
    }

    try {
      const isRunning = await this.isBrowserRunning(browserId);

      if (!isRunning) {
        return {
          success: true,
          message: `${browserConfig.name} is not running`
        };
      }

      if (this.platform === 'darwin') {
        return await this.quitBrowserMacOS(browserConfig);
      } else if (this.platform === 'win32') {
        return await this.quitBrowserWindows(browserConfig);
      } else {
        return {
          success: false,
          message: 'Unsupported platform',
          code: 'UNSUPPORTED_PLATFORM'
        };
      }
    } catch (error) {
      console.error(`Error quitting ${browserId}:`, error);
      return {
        success: false,
        message: `Failed to quit ${browserConfig.name}: ${error.message}`,
        code: 'QUIT_FAILED',
        error: error.message
      };
    }
  }

  /**
   * Quit browser on macOS using AppleScript
   */
  async quitBrowserMacOS(browserConfig) {
    const appName = browserConfig.processNames.darwin;

    // Sanitize app name to prevent command injection
    const sanitizedAppName = appName.replace(/["'`$\\]/g, '');

    try {
      // Use AppleScript to quit gracefully
      const script = `osascript -e 'tell application "${sanitizedAppName}" to quit'`;
      await execAsync(script);

      // Wait a moment for the process to actually quit
      await this.wait(1000);

      // Verify it's actually closed
      const stillRunning = await this.isBrowserRunningByProcessName(appName);

      if (stillRunning) {
        // If still running, try force quit
        await execAsync(`killall "${sanitizedAppName}"`);
        await this.wait(500);
      }

      return {
        success: true,
        message: `${browserConfig.name} closed successfully`
      };
    } catch (error) {
      // Handle specific error cases
      if (error.message.includes('Not authorized') || error.message.includes('not allowed')) {
        return {
          success: false,
          message: `Permission denied. Please grant automation access in System Preferences → Security & Privacy → Privacy → Automation`,
          code: 'PERMISSION_DENIED',
          error: error.message
        };
      }

      if (error.message.includes('doesn\'t understand') || error.message.includes('not running')) {
        return {
          success: true,
          message: `${browserConfig.name} is not running`
        };
      }

      throw error;
    }
  }

  /**
   * Quit browser on Windows using taskkill
   */
  async quitBrowserWindows(browserConfig) {
    const processName = browserConfig.processNames.win32;

    // Sanitize process name to prevent command injection
    const sanitizedProcessName = processName.replace(/["'`$\\]/g, '');

    try {
      // Try graceful shutdown first (without /F flag)
      try {
        await execAsync(`taskkill /IM "${sanitizedProcessName}" /T`);
      } catch {
        // If graceful fails, force kill
        await execAsync(`taskkill /IM "${sanitizedProcessName}" /F /T`);
      }

      await this.wait(1000);

      return {
        success: true,
        message: `${browserConfig.name} closed successfully`
      };
    } catch (error) {
      // If error is "process not found", that's actually success
      if (error.message.includes('not found') || error.message.includes('not running')) {
        return {
          success: true,
          message: `${browserConfig.name} is not running`
        };
      }

      throw error;
    }
  }

  /**
   * Check if a browser is currently running
   * @param {string} browserId
   * @returns {Promise<boolean>}
   */
  async isBrowserRunning(browserId) {
    const browserConfig = this.getBrowserConfig(browserId);
    if (!browserConfig) return false;

    const processName = browserConfig.processNames[this.platform];
    if (!processName) return false;

    return await this.isBrowserRunningByProcessName(processName);
  }

  /**
   * Check if a process is running by name
   */
  async isBrowserRunningByProcessName(processName) {
    // Sanitize process name to prevent command injection
    const sanitizedProcessName = processName.replace(/["'`$\\]/g, '');

    try {
      if (this.platform === 'darwin') {
        // Use pgrep for exact process name matching
        await execAsync(`pgrep -x "${sanitizedProcessName}"`);
        return true; // pgrep returns success if process found
      } else if (this.platform === 'win32') {
        const { stdout } = await execAsync(`tasklist /FI "IMAGENAME eq ${sanitizedProcessName}" /NH`);
        return stdout.toLowerCase().includes(sanitizedProcessName.toLowerCase());
      }
      return false;
    } catch (error) {
      return false; // Process not running
    }
  }

  /**
   * Get browser configuration
   */
  getBrowserConfig(browserId) {
    const configs = {
      chrome: {
        name: 'Google Chrome',
        processNames: {
          darwin: 'Google Chrome',
          win32: 'chrome.exe'
        }
      },
      firefox: {
        name: 'Firefox',
        processNames: {
          darwin: 'firefox',
          win32: 'firefox.exe'
        }
      },
      edge: {
        name: 'Microsoft Edge',
        processNames: {
          darwin: 'Microsoft Edge',
          win32: 'msedge.exe'
        }
      },
      safari: {
        name: 'Safari',
        processNames: {
          darwin: 'Safari'
        }
      },
      opera: {
        name: 'Opera',
        processNames: {
          darwin: 'Opera',
          win32: 'opera.exe'
        }
      },
      brave: {
        name: 'Brave',
        processNames: {
          darwin: 'Brave Browser',
          win32: 'brave.exe'
        }
      }
    };

    return configs[browserId];
  }

  /**
   * Wait utility
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ProcessManager;
