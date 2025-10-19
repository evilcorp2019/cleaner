const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs').promises;
const execPromise = util.promisify(exec);

/**
 * Windows Driver Update Module
 * Uses Windows Update API via PowerShell to check and install driver updates
 *
 * Note: Driver updates are Windows-only. macOS handles driver updates automatically
 * through system updates and doesn't provide a user-facing driver update mechanism.
 */

// Windows Update Result Codes
const RESULT_CODES = {
  0: 'Not Started',
  1: 'In Progress',
  2: 'Succeeded',
  3: 'Succeeded with Errors',
  4: 'Failed',
  5: 'Aborted'
};

/**
 * Check for driver updates using PSWindowsUpdate module (preferred method)
 */
async function checkDriverUpdatesWithPSWU(progressCallback) {
  if (progressCallback) {
    progressCallback({ status: 'Checking for PSWindowsUpdate module...' });
  }

  // Check if module is installed
  let moduleCheck = await checkPSWindowsUpdateModule();

  if (!moduleCheck.installed) {
    console.log('[DRIVER_UPDATER] PSWindowsUpdate not installed. Attempting installation...');
    if (progressCallback) {
      progressCallback({ status: 'Installing PSWindowsUpdate module (first time only)...' });
    }

    try {
      await installPSWindowsUpdateModule();
      moduleCheck = await checkPSWindowsUpdateModule();

      if (!moduleCheck.installed) {
        throw new Error('Failed to install PSWindowsUpdate module');
      }
    } catch (installError) {
      console.warn('[DRIVER_UPDATER] Could not install PSWindowsUpdate:', installError.message);
      return null; // Signal to use fallback method
    }
  }

  if (progressCallback) {
    progressCallback({ status: 'Scanning for driver updates using PSWindowsUpdate...' });
  }

  try {
    const psScript = `
      Import-Module PSWindowsUpdate -ErrorAction Stop

      # Get driver updates
      $Updates = Get-WUList -MicrosoftUpdate -UpdateType Driver -IsInstalled:$false

      $DriverList = @()
      foreach ($Update in $Updates) {
        $UpdateInfo = @{
          Title = $Update.Title
          Description = $Update.Description
          Size = $Update.Size
          KB = $Update.KB
          UpdateID = $Update.UpdateID
          IsDownloaded = $Update.IsDownloaded
          RebootRequired = $Update.RebootRequired
          Categories = ($Update.Categories -join ', ')
        }
        $DriverList += $UpdateInfo
      }

      $DriverList | ConvertTo-Json
    `;

    // Use script file approach to avoid command injection
    const scriptPath = path.join(process.env.TEMP || '/tmp', `driver-check-${Date.now()}.ps1`);
    await fs.writeFile(scriptPath, psScript, 'utf8');

    let stdout, stderr;
    try {
      const result = await execPromise(
        `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`,
        { timeout: 90000 }
      );
      stdout = result.stdout;
      stderr = result.stderr;

      // Clean up script file
      await fs.unlink(scriptPath).catch(() => {});
    } catch (error) {
      // Clean up script file on error
      await fs.unlink(scriptPath).catch(() => {});
      throw error;
    }

    if (stderr && !stderr.toLowerCase().includes('warning')) {
      console.warn('[DRIVER_UPDATER] PSWindowsUpdate stderr:', stderr);
    }

    let drivers = [];
    try {
      const jsonOutput = stdout.trim();
      if (jsonOutput && jsonOutput !== 'null' && jsonOutput !== '') {
        const parsed = JSON.parse(jsonOutput);
        drivers = Array.isArray(parsed) ? parsed : [parsed];
      }
    } catch (parseError) {
      console.error('[DRIVER_UPDATER] Failed to parse PSWindowsUpdate results:', parseError);
      return null; // Signal to use fallback
    }

    console.log(`[DRIVER_UPDATER] PSWindowsUpdate found ${drivers.length} driver updates`);
    return drivers;

  } catch (error) {
    console.warn('[DRIVER_UPDATER] PSWindowsUpdate method failed:', error.message);
    return null; // Signal to use fallback method
  }
}

async function checkDriverUpdates(progressCallback) {
  console.log(`[DRIVER_UPDATER] Platform detected: ${process.platform}`);

  if (process.platform !== 'win32') {
    const errorMsg = `Driver updates are only available on Windows. Current platform: ${process.platform}`;
    console.error(`[DRIVER_UPDATER] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  console.log(`[DRIVER_UPDATER] Starting driver update check...`);
  if (progressCallback) {
    progressCallback({ status: 'Initializing driver scan...' });
  }

  // Try PSWindowsUpdate first (more reliable)
  const pswuDrivers = await checkDriverUpdatesWithPSWU(progressCallback);

  if (pswuDrivers !== null) {
    return {
      success: true,
      driversFound: pswuDrivers.length,
      drivers: pswuDrivers,
      message: `Found ${pswuDrivers.length} driver update(s) available`,
      method: 'PSWindowsUpdate'
    };
  }

  // Fallback to COM object method
  console.log('[DRIVER_UPDATER] Falling back to COM object method');
  if (progressCallback) {
    progressCallback({ status: 'Scanning for outdated drivers using Windows Update...' });
  }

  try {
    // PowerShell script to check for driver updates using Windows Update
    const psScript = `
      try {
        $Session = New-Object -ComObject Microsoft.Update.Session
        $Searcher = $Session.CreateUpdateSearcher()
        $Searcher.Online = $true

        Write-Host "Searching for driver updates..."
        $SearchResult = $Searcher.Search("Type='Driver' and IsInstalled=0")

        $Updates = @()
        foreach ($Update in $SearchResult.Updates) {
          $UpdateInfo = @{
            Title = $Update.Title
            Description = $Update.Description
            DriverClass = $Update.DriverClass
            DriverManufacturer = $Update.DriverManufacturer
            DriverModel = $Update.DriverModel
            DriverProvider = $Update.DriverProvider
            DriverVerDate = $Update.DriverVerDate
            IsDownloaded = $Update.IsDownloaded
            RebootRequired = $Update.RebootRequired
            UpdateID = $Update.Identity.UpdateID
          }
          $Updates += $UpdateInfo
        }

        $Updates | ConvertTo-Json
      } catch {
        Write-Host "ERROR: $($_.Exception.Message)"
        exit 1
      }
    `;

    // Use script file approach to avoid command injection
    const scriptPath = path.join(process.env.TEMP || '/tmp', `driver-com-${Date.now()}.ps1`);
    await fs.writeFile(scriptPath, psScript, 'utf8');

    let stdout, stderr;
    try {
      const result = await execPromise(
        `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`,
        { timeout: 60000 }
      );
      stdout = result.stdout;
      stderr = result.stderr;

      // Clean up script file
      await fs.unlink(scriptPath).catch(() => {});
    } catch (error) {
      // Clean up script file on error
      await fs.unlink(scriptPath).catch(() => {});
      throw error;
    }

    if (stderr && !stderr.includes('Searching')) {
      console.error('[DRIVER_UPDATER] PowerShell stderr:', stderr);
    }

    if (stdout.includes('ERROR:')) {
      throw new Error(stdout.split('ERROR:')[1].trim());
    }

    let drivers = [];
    try {
      const jsonOutput = stdout.trim();
      if (jsonOutput && jsonOutput !== 'null') {
        const parsed = JSON.parse(jsonOutput);
        drivers = Array.isArray(parsed) ? parsed : [parsed];
      }
    } catch (parseError) {
      console.error('[DRIVER_UPDATER] Failed to parse driver list:', parseError);
    }

    return {
      success: true,
      driversFound: drivers.length,
      drivers: drivers,
      message: `Found ${drivers.length} driver update(s) available`,
      method: 'COM'
    };

  } catch (error) {
    // If both methods fail, try to detect problem devices via WMI
    console.log('[DRIVER_UPDATER] Both methods failed. Checking for problem devices...');

    const problemDevices = await detectProblemDevices();

    if (problemDevices.success && problemDevices.devicesFound > 0) {
      return {
        success: true,
        driversFound: 0,
        drivers: [],
        problemDevices: problemDevices.devices,
        message: `Cannot access Windows Update, but found ${problemDevices.devicesFound} device(s) with driver issues. Please enable Windows Update service or manually update drivers.`,
        method: 'WMI',
        error: error.message
      };
    }

    return {
      success: false,
      error: error.message,
      drivers: [],
      message: 'Failed to check for driver updates. Please ensure Windows Update is enabled and you have administrator privileges.'
    };
  }
}

async function updateDrivers(driverIds, progressCallback) {
  console.log(`[DRIVER_UPDATER] Platform detected: ${process.platform}`);

  if (process.platform !== 'win32') {
    const errorMsg = `Driver updates are only available on Windows. Current platform: ${process.platform}`;
    console.error(`[DRIVER_UPDATER] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  if (!driverIds || driverIds.length === 0) {
    console.error(`[DRIVER_UPDATER] No driver IDs provided`);
    return {
      success: false,
      error: 'No driver IDs provided',
      data: { updated: [], failed: [], rebootRequired: false }
    };
  }

  console.log(`[DRIVER_UPDATER] Starting driver installation for ${driverIds.length} driver(s)`);
  console.log(`[DRIVER_UPDATER] Driver IDs:`, driverIds);

  const results = {
    updated: [],
    failed: [],
    rebootRequired: false
  };

  try {
    if (progressCallback) {
      progressCallback({
        status: 'Creating system restore point...',
        current: 0,
        total: driverIds.length + 2
      });
    }

    // Create a system restore point before updating drivers
    try {
      await createRestorePoint('Before Driver Updates');
      console.log('[DRIVER_UPDATER] System restore point created');
    } catch (restoreError) {
      console.warn('[DRIVER_UPDATER] Failed to create restore point:', restoreError.message);
      // Continue anyway - restore point is optional
    }

    if (progressCallback) {
      progressCallback({
        status: 'Preparing driver updates...',
        current: 1,
        total: driverIds.length + 2
      });
    }

    // Write PowerShell script to a temporary file to avoid escaping issues
    const scriptPath = path.join(process.env.TEMP || '/tmp', `driver-update-${Date.now()}.ps1`);

    // Build the driver IDs filter for PowerShell
    const driverIdsFilter = driverIds.map(id => `"${id}"`).join(',');

    // PowerShell script to install ONLY selected driver updates
    const psScript = `
# Script to install selected driver updates
$TargetDriverIDs = @(${driverIdsFilter})
$ErrorActionPreference = "Stop"

try {
    Write-Host "=== Starting Driver Update Process ==="
    Write-Host "Target Drivers: $($TargetDriverIDs.Count)"

    $Session = New-Object -ComObject Microsoft.Update.Session
    $Searcher = $Session.CreateUpdateSearcher()
    $SearchResult = $Searcher.Search("Type='Driver' and IsInstalled=0")

    Write-Host "Found $($SearchResult.Updates.Count) available driver updates"

    $UpdatesToInstall = New-Object -ComObject Microsoft.Update.UpdateColl
    $SelectedDrivers = @()

    # Filter to install ONLY the selected drivers
    foreach ($Update in $SearchResult.Updates) {
        $UpdateID = $Update.Identity.UpdateID
        if ($TargetDriverIDs -contains $UpdateID) {
            $UpdatesToInstall.Add($Update) | Out-Null
            $SelectedDrivers += $Update.Title
            Write-Host "Selected: $($Update.Title)"
        }
    }

    if ($UpdatesToInstall.Count -eq 0) {
        Write-Host "ERROR: None of the selected drivers were found in available updates"
        exit 4
    }

    Write-Host "=== Downloading $($UpdatesToInstall.Count) driver update(s) ==="
    $Downloader = $Session.CreateUpdateDownloader()
    $Downloader.Updates = $UpdatesToInstall
    $DownloadResult = $Downloader.Download()

    Write-Host "Download Result Code: $($DownloadResult.ResultCode)"

    if ($DownloadResult.ResultCode -ne 2) {
        Write-Host "ERROR: Download failed with code $($DownloadResult.ResultCode)"
        exit 4
    }

    Write-Host "=== Installing driver updates ==="
    $Installer = $Session.CreateUpdateInstaller()
    $Installer.Updates = $UpdatesToInstall
    $InstallResult = $Installer.Install()

    Write-Host "Installation Result Code: $($InstallResult.ResultCode)"
    Write-Host "Reboot Required: $($InstallResult.RebootRequired)"

    # Output structured data
    $Result = @{
        ResultCode = $InstallResult.ResultCode
        ResultText = switch ($InstallResult.ResultCode) {
            0 { "Not Started" }
            1 { "In Progress" }
            2 { "Succeeded" }
            3 { "Succeeded with Errors" }
            4 { "Failed" }
            5 { "Aborted" }
            default { "Unknown" }
        }
        RebootRequired = $InstallResult.RebootRequired
        UpdatedDrivers = $SelectedDrivers
        UpdateCount = $UpdatesToInstall.Count
    }

    $Result | ConvertTo-Json -Compress

    exit $InstallResult.ResultCode

} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    exit 4
}
`;

    // Write the script to file
    await fs.writeFile(scriptPath, psScript, 'utf8');
    console.log(`[DRIVER_UPDATER] PowerShell script written to: ${scriptPath}`);

    if (progressCallback) {
      progressCallback({
        status: 'Installing driver updates (this may take 10-30 minutes)...',
        current: 2,
        total: driverIds.length + 2
      });
    }

    // Execute the PowerShell script with elevation
    // Note: This will trigger a UAC prompt. The app should ideally run as admin.
    const command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`;

    console.log('[DRIVER_UPDATER] Executing driver installation...');
    const { stdout, stderr } = await execPromise(command, {
      timeout: 1800000, // 30 minutes timeout for large driver downloads
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer for output
    });

    console.log('[DRIVER_UPDATER] Installation output:', stdout);

    if (stderr) {
      console.warn('[DRIVER_UPDATER] Installation stderr:', stderr);
    }

    // Clean up the temporary script file
    try {
      await fs.unlink(scriptPath);
    } catch (unlinkError) {
      console.warn('[DRIVER_UPDATER] Failed to delete temp script:', unlinkError.message);
    }

    // Parse the result
    let installResult;
    try {
      const jsonMatch = stdout.match(/\{.*"ResultCode".*\}/);
      if (jsonMatch) {
        installResult = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.warn('[DRIVER_UPDATER] Failed to parse result JSON:', parseError.message);
    }

    // Determine success based on result code
    const resultCode = installResult?.ResultCode ?? 4;
    const success = resultCode === 2 || resultCode === 3; // 2 = Success, 3 = Success with errors

    if (success) {
      results.updated = driverIds;
      results.rebootRequired = installResult?.RebootRequired || stdout.includes('Reboot Required: True');
    } else {
      results.failed = driverIds;
    }

    if (progressCallback) {
      progressCallback({
        status: success ? 'Driver updates completed' : 'Driver update failed',
        current: driverIds.length + 2,
        total: driverIds.length + 2
      });
    }

    const resultText = RESULT_CODES[resultCode] || 'Unknown';

    return {
      success,
      data: results,
      message: success
        ? `Successfully updated ${results.updated.length} driver(s). ${results.rebootRequired ? 'Please restart your computer to complete the installation.' : ''}`
        : `Driver update failed: ${resultText}. ${stderr || 'Please check if Windows Update is enabled and you have administrator privileges.'}`,
      resultCode,
      resultText
    };

  } catch (error) {
    console.error('[DRIVER_UPDATER] Error:', error);
    results.failed = driverIds;

    let errorMessage = error.message;

    // Provide helpful error messages
    if (error.message.includes('timeout')) {
      errorMessage = 'Driver installation timed out. Large drivers may take longer. Please try again or install drivers individually.';
    } else if (error.message.includes('access') || error.message.includes('permission')) {
      errorMessage = 'Permission denied. Please run the application as Administrator to install driver updates.';
    } else if (error.message.includes('Windows Update')) {
      errorMessage = 'Windows Update service is not available. Please enable it in Windows Services.';
    }

    return {
      success: false,
      error: errorMessage,
      data: results
    };
  }
}

/**
 * Create a system restore point before making changes
 */
async function createRestorePoint(description) {
  if (process.platform !== 'win32') {
    throw new Error('System restore points are only available on Windows');
  }

  // Sanitize description to prevent command injection
  const sanitizedDescription = description.replace(/['"]/g, '');

  const psScript = `
    try {
      Checkpoint-Computer -Description "${sanitizedDescription}" -RestorePointType MODIFY_SETTINGS -ErrorAction Stop
      Write-Host "SUCCESS"
    } catch {
      Write-Host "FAILED: $($_.Exception.Message)"
      exit 1
    }
  `;

  // Use script file approach to avoid command injection
  const scriptPath = path.join(process.env.TEMP || '/tmp', `restore-point-${Date.now()}.ps1`);
  await fs.writeFile(scriptPath, psScript, 'utf8');

  try {
    const { stdout } = await execPromise(
      `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`,
      { timeout: 30000 }
    );

    // Clean up script file
    await fs.unlink(scriptPath).catch(() => {});

    if (!stdout.includes('SUCCESS')) {
      throw new Error('Failed to create restore point');
    }
  } catch (error) {
    // Clean up script file on error
    await fs.unlink(scriptPath).catch(() => {});
    throw new Error(`Could not create restore point: ${error.message}`);
  }
}

async function checkWindowsUpdate() {
  if (process.platform !== 'win32') {
    return {
      available: false,
      reason: 'Not Windows',
      status: 'unavailable'
    };
  }

  try {
    // Check if Windows Update service status
    const { stdout } = await execPromise(
      'sc query wuauserv',
      { timeout: 5000 }
    );

    const isRunning = stdout.includes('RUNNING');
    const isStopped = stdout.includes('STOPPED');
    const isDisabled = stdout.includes('DISABLED');

    // If service is stopped, try to start it
    if (isStopped && !isDisabled) {
      console.log('[DRIVER_UPDATER] Windows Update service is stopped. Attempting to start...');
      try {
        await execPromise('sc start wuauserv', { timeout: 10000 });
        // Wait a moment for service to start
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify it started
        const { stdout: verifyStdout } = await execPromise('sc query wuauserv', { timeout: 5000 });
        if (verifyStdout.includes('RUNNING')) {
          console.log('[DRIVER_UPDATER] Successfully started Windows Update service');
          return {
            available: true,
            reason: 'Windows Update service started successfully',
            status: 'started',
            wasStarted: true
          };
        }
      } catch (startError) {
        console.warn('[DRIVER_UPDATER] Failed to start service:', startError.message);
        return {
          available: false,
          reason: 'Windows Update service is stopped. Please run the app as Administrator to start it.',
          status: 'stopped',
          canStart: true
        };
      }
    }

    if (isDisabled) {
      return {
        available: false,
        reason: 'Windows Update service is disabled. Please enable it in Windows Services or use alternative driver detection.',
        status: 'disabled',
        canStart: false
      };
    }

    return {
      available: isRunning,
      reason: isRunning ? 'Windows Update service is running' : 'Windows Update service is not running',
      status: isRunning ? 'running' : 'stopped',
      canStart: !isRunning
    };
  } catch (error) {
    return {
      available: false,
      reason: 'Unable to check Windows Update service: ' + error.message,
      status: 'error'
    };
  }
}

/**
 * Check if running with administrator privileges
 */
async function checkAdminPrivileges() {
  if (process.platform !== 'win32') {
    return { isAdmin: false, reason: 'Not Windows' };
  }

  try {
    // Try to read a registry key that requires admin access
    const { stdout } = await execPromise(
      'net session',
      { timeout: 5000 }
    );

    return { isAdmin: true };
  } catch (error) {
    // If this fails, we don't have admin rights
    return {
      isAdmin: false,
      reason: 'Administrator privileges required. Please run the application as Administrator.'
    };
  }
}

/**
 * Check if PSWindowsUpdate module is installed
 */
async function checkPSWindowsUpdateModule() {
  if (process.platform !== 'win32') {
    return { installed: false };
  }

  try {
    const { stdout } = await execPromise(
      'powershell -Command "Get-Module -ListAvailable -Name PSWindowsUpdate | Select-Object -ExpandProperty Version"',
      { timeout: 10000 }
    );

    const installed = stdout.trim().length > 0;
    return {
      installed,
      version: installed ? stdout.trim() : null
    };
  } catch (error) {
    return { installed: false };
  }
}

/**
 * Install PSWindowsUpdate module
 */
async function installPSWindowsUpdateModule() {
  if (process.platform !== 'win32') {
    throw new Error('PSWindowsUpdate is only available on Windows');
  }

  console.log('[DRIVER_UPDATER] Installing PSWindowsUpdate module...');

  try {
    await execPromise(
      'powershell -Command "Install-Module -Name PSWindowsUpdate -Force -AllowClobber -Scope CurrentUser"',
      { timeout: 120000 } // 2 minutes for module installation
    );

    // Verify installation
    const check = await checkPSWindowsUpdateModule();
    if (check.installed) {
      console.log('[DRIVER_UPDATER] PSWindowsUpdate module installed successfully');
      return { success: true, version: check.version };
    } else {
      throw new Error('Module installation verification failed');
    }
  } catch (error) {
    console.error('[DRIVER_UPDATER] Failed to install PSWindowsUpdate:', error);
    throw new Error('Failed to install PSWindowsUpdate module: ' + error.message);
  }
}

/**
 * Detect problem devices using WMI (devices with driver issues)
 */
async function detectProblemDevices() {
  if (process.platform !== 'win32') {
    throw new Error('WMI driver detection is only available on Windows');
  }

  try {
    const psScript = `
      $ProblemDevices = Get-WmiObject -Class Win32_PnpEntity | Where-Object {
        $_.ConfigManagerErrorCode -gt 0
      }

      $DeviceList = @()
      foreach ($Device in $ProblemDevices) {
        $DeviceInfo = @{
          Name = $Device.Name
          DeviceID = $Device.DeviceID
          ErrorCode = $Device.ConfigManagerErrorCode
          ErrorDescription = switch ($Device.ConfigManagerErrorCode) {
            1 { "Device is not configured correctly" }
            10 { "Device cannot start" }
            12 { "Device cannot find enough free resources" }
            18 { "Device drivers need to be reinstalled" }
            22 { "Device is disabled" }
            28 { "Device drivers are not installed" }
            31 { "Device is not working properly" }
            default { "Unknown error code: $($Device.ConfigManagerErrorCode)" }
          }
          Status = $Device.Status
        }
        $DeviceList += $DeviceInfo
      }

      $DeviceList | ConvertTo-Json
    `;

    // Use script file approach to avoid command injection
    const scriptPath = path.join(process.env.TEMP || '/tmp', `problem-devices-${Date.now()}.ps1`);
    await fs.writeFile(scriptPath, psScript, 'utf8');

    let stdout;
    try {
      const result = await execPromise(
        `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`,
        { timeout: 30000 }
      );
      stdout = result.stdout;

      // Clean up script file
      await fs.unlink(scriptPath).catch(() => {});
    } catch (error) {
      // Clean up script file on error
      await fs.unlink(scriptPath).catch(() => {});
      throw error;
    }

    let devices = [];
    try {
      const jsonOutput = stdout.trim();
      if (jsonOutput && jsonOutput !== 'null' && jsonOutput !== '') {
        const parsed = JSON.parse(jsonOutput);
        devices = Array.isArray(parsed) ? parsed : [parsed];
      }
    } catch (parseError) {
      console.error('[DRIVER_UPDATER] Failed to parse problem devices:', parseError);
    }

    return {
      success: true,
      devicesFound: devices.length,
      devices: devices
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      devices: []
    };
  }
}

module.exports = {
  checkDriverUpdates,
  updateDrivers,
  checkWindowsUpdate,
  checkAdminPrivileges,
  checkPSWindowsUpdateModule,
  installPSWindowsUpdateModule,
  detectProblemDevices
};
