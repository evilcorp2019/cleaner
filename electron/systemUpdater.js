const { exec } = require('child_process');
const { promisify } = require('util');
const os = require('os');

const execAsync = promisify(exec);

/**
 * Check for system updates
 */
async function checkSystemUpdates(progressCallback) {
  const platform = os.platform();

  console.log(`[SYSTEM_UPDATER] Platform detected: ${platform}`);
  console.log(`[SYSTEM_UPDATER] Starting system update check...`);

  try {
    if (platform === 'darwin') {
      console.log(`[SYSTEM_UPDATER] Using macOS update method`);
      return await checkMacOSUpdates(progressCallback);
    } else if (platform === 'win32') {
      console.log(`[SYSTEM_UPDATER] Using Windows update method`);
      return await checkWindowsUpdates(progressCallback);
    } else {
      console.log(`[SYSTEM_UPDATER] Unsupported platform: ${platform}`);
      return {
        success: false,
        error: `System updates not supported on this platform (${platform})`
      };
    }
  } catch (error) {
    console.error(`[SYSTEM_UPDATER] Error in checkSystemUpdates:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check for macOS updates
 */
async function checkMacOSUpdates(progressCallback) {
  console.log(`[SYSTEM_UPDATER] Checking for macOS updates using softwareupdate command`);
  progressCallback?.({ status: 'Checking for macOS updates...', progress: 30 });

  try {
    const { stdout, stderr } = await execAsync('softwareupdate -l');

    if (stderr) {
      console.warn(`[SYSTEM_UPDATER] softwareupdate stderr:`, stderr);
    }

    // Parse output to check for updates - check both stdout and stderr
    const outputText = stdout + stderr;
    const hasUpdates = !outputText.includes('No new software available');
    console.log(`[SYSTEM_UPDATER] Has updates: ${hasUpdates}`);

    if (hasUpdates) {
      // Extract update information
      const updates = parseUpdateList(stdout);
      console.log(`[SYSTEM_UPDATER] Found ${updates.length} update(s)`);

      progressCallback?.({ status: 'Updates found', progress: 100 });

      return {
        success: true,
        data: {
          available: true,
          count: updates.length,
          updates: updates,
          message: `${updates.length} update(s) available`
        }
      };
    } else {
      console.log(`[SYSTEM_UPDATER] No updates available`);
      progressCallback?.({ status: 'System is up to date', progress: 100 });

      return {
        success: true,
        data: {
          available: false,
          count: 0,
          updates: [],
          message: 'Your system is up to date'
        }
      };
    }
  } catch (error) {
    console.error(`[SYSTEM_UPDATER] Error checking macOS updates:`, error);
    return {
      success: false,
      error: `Failed to check for macOS updates: ${error.message}`
    };
  }
}

/**
 * Check for Windows updates
 */
async function checkWindowsUpdates(progressCallback) {
  console.log(`[SYSTEM_UPDATER] Checking for Windows updates using PowerShell`);

  // Platform safety check
  if (os.platform() !== 'win32') {
    const errorMsg = `Cannot execute Windows update check on ${os.platform()}. This feature requires Windows.`;
    console.error(`[SYSTEM_UPDATER] ${errorMsg}`);
    return {
      success: false,
      error: errorMsg
    };
  }

  progressCallback?.({ status: 'Checking for Windows updates...', progress: 30 });

  try {
    // Use PowerShell to check for updates
    const psCommand = `
      $UpdateSession = New-Object -ComObject Microsoft.Update.Session
      $UpdateSearcher = $UpdateSession.CreateUpdateSearcher()
      $SearchResult = $UpdateSearcher.Search("IsInstalled=0")
      $SearchResult.Updates | Select-Object Title, Description | ConvertTo-Json
    `;

    console.log(`[SYSTEM_UPDATER] Executing PowerShell command to check for Windows updates`);
    const { stdout, stderr } = await execAsync(`powershell -Command "${psCommand.replace(/\n/g, ' ')}"`);

    if (stderr) {
      console.warn(`[SYSTEM_UPDATER] PowerShell stderr:`, stderr);
    }

    const updates = JSON.parse(stdout || '[]');
    const updateArray = Array.isArray(updates) ? updates : [updates];
    console.log(`[SYSTEM_UPDATER] Found ${updateArray.length} Windows update(s)`);

    progressCallback?.({ status: 'Updates found', progress: 100 });

    return {
      success: true,
      data: {
        available: updateArray.length > 0,
        count: updateArray.length,
        updates: updateArray,
        message: updateArray.length > 0
          ? `${updateArray.length} update(s) available`
          : 'Your system is up to date'
      }
    };
  } catch (error) {
    console.error(`[SYSTEM_UPDATER] Error checking Windows updates:`, error);
    return {
      success: false,
      error: `Failed to check for Windows updates: ${error.message}. Make sure you have appropriate permissions.`
    };
  }
}

/**
 * Install system updates
 */
async function installSystemUpdates(progressCallback) {
  const platform = os.platform();

  console.log(`[SYSTEM_UPDATER] Platform detected: ${platform}`);
  console.log(`[SYSTEM_UPDATER] Starting system update installation...`);

  try {
    if (platform === 'darwin') {
      console.log(`[SYSTEM_UPDATER] Using macOS installation method`);
      return await installMacOSUpdates(progressCallback);
    } else if (platform === 'win32') {
      console.log(`[SYSTEM_UPDATER] Using Windows installation method`);
      return await installWindowsUpdates(progressCallback);
    } else {
      console.log(`[SYSTEM_UPDATER] Unsupported platform: ${platform}`);
      return {
        success: false,
        error: `System updates not supported on this platform (${platform})`
      };
    }
  } catch (error) {
    console.error(`[SYSTEM_UPDATER] Error in installSystemUpdates:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Install macOS updates
 */
async function installMacOSUpdates(progressCallback) {
  console.log(`[SYSTEM_UPDATER] Starting macOS update installation`);
  progressCallback?.({ status: 'Installing macOS updates...', progress: 10 });

  try {
    // Install all recommended updates
    progressCallback?.({ status: 'Downloading and installing updates...', progress: 30 });

    console.log(`[SYSTEM_UPDATER] Executing softwareupdate -i -a command`);
    const { stdout, stderr } = await execAsync('softwareupdate -i -a', {
      timeout: 600000 // 10 minute timeout
    });

    if (stderr) {
      console.warn(`[SYSTEM_UPDATER] softwareupdate stderr:`, stderr);
    }

    progressCallback?.({ status: 'Updates installed successfully', progress: 100 });

    // Check if restart is required
    const requiresRestart = stdout.includes('restart') || stderr.includes('restart');
    console.log(`[SYSTEM_UPDATER] Installation complete. Restart required: ${requiresRestart}`);

    return {
      success: true,
      data: {
        installed: true,
        requiresRestart,
        message: requiresRestart
          ? 'Updates installed. Please restart your computer to complete the installation.'
          : 'Updates installed successfully'
      }
    };
  } catch (error) {
    console.error(`[SYSTEM_UPDATER] Error installing macOS updates:`, error);
    return {
      success: false,
      error: `Failed to install macOS updates: ${error.message}`
    };
  }
}

/**
 * Install Windows updates
 */
async function installWindowsUpdates(progressCallback) {
  console.log(`[SYSTEM_UPDATER] Starting Windows update installation`);

  // Platform safety check
  if (os.platform() !== 'win32') {
    const errorMsg = `Cannot execute Windows update installation on ${os.platform()}. This feature requires Windows.`;
    console.error(`[SYSTEM_UPDATER] ${errorMsg}`);
    return {
      success: false,
      error: errorMsg
    };
  }

  progressCallback?.({ status: 'Installing Windows updates...', progress: 10 });

  try {
    // Use PowerShell to install updates
    const psCommand = `
      $UpdateSession = New-Object -ComObject Microsoft.Update.Session
      $UpdateSearcher = $UpdateSession.CreateUpdateSearcher()
      $SearchResult = $UpdateSearcher.Search("IsInstalled=0")

      if ($SearchResult.Updates.Count -eq 0) {
        Write-Output "No updates to install"
        exit 0
      }

      $UpdatesToInstall = New-Object -ComObject Microsoft.Update.UpdateColl
      foreach ($Update in $SearchResult.Updates) {
        $UpdatesToInstall.Add($Update) | Out-Null
      }

      $Installer = $UpdateSession.CreateUpdateInstaller()
      $Installer.Updates = $UpdatesToInstall
      $InstallResult = $Installer.Install()

      $InstallResult.ResultCode
    `;

    progressCallback?.({ status: 'Downloading and installing updates...', progress: 30 });

    console.log(`[SYSTEM_UPDATER] Executing PowerShell command to install Windows updates`);
    const { stdout, stderr } = await execAsync(`powershell -Command "${psCommand.replace(/\n/g, ' ')}"`, {
      timeout: 1800000 // 30 minute timeout for Windows updates
    });

    if (stderr) {
      console.warn(`[SYSTEM_UPDATER] PowerShell stderr:`, stderr);
    }

    progressCallback?.({ status: 'Updates installed successfully', progress: 100 });

    const resultCode = parseInt(stdout.trim());
    const requiresRestart = resultCode === 3; // 3 = Succeeded with errors (usually means restart required)
    console.log(`[SYSTEM_UPDATER] Installation complete. Result code: ${resultCode}, Restart required: ${requiresRestart}`);

    return {
      success: true,
      data: {
        installed: true,
        requiresRestart,
        message: requiresRestart
          ? 'Updates installed. Please restart your computer to complete the installation.'
          : 'Updates installed successfully'
      }
    };
  } catch (error) {
    console.error(`[SYSTEM_UPDATER] Error installing Windows updates:`, error);
    return {
      success: false,
      error: `Failed to install Windows updates: ${error.message}. Make sure you have appropriate permissions.`
    };
  }
}

/**
 * Parse macOS update list
 */
function parseUpdateList(stdout) {
  const lines = stdout.split('\n');
  const updates = [];

  for (const line of lines) {
    // Look for lines that start with * (indicating an update)
    if (line.trim().startsWith('*')) {
      const match = line.match(/\*\s+(.+)/);
      if (match) {
        updates.push({
          title: match[1].trim(),
          description: 'macOS System Update'
        });
      }
    }
  }

  return updates;
}

module.exports = {
  checkSystemUpdates,
  installSystemUpdates
};
