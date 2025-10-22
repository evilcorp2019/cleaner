const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Handle uncaught exceptions to prevent EPIPE crashes
process.on('uncaughtException', (error) => {
  // Ignore EPIPE errors (broken pipe when console output is closed)
  if (error.code === 'EPIPE' || error.errno === -32) {
    return;
  }
  console.error('Uncaught Exception:', error);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Safe console logging wrapper to prevent EPIPE crashes
const safeLog = (...args) => {
  try {
    console.log(...args);
  } catch (e) {
    // Silently ignore console errors
  }
};

const { scanSystem, cleanFiles } = require('./cleaner');
const {
  checkDriverUpdates,
  updateDrivers,
  checkWindowsUpdate,
  checkAdminPrivileges,
  checkPSWindowsUpdateModule,
  installPSWindowsUpdateModule,
  detectProblemDevices
} = require('./driverUpdater');
const { checkSystemUpdates, installSystemUpdates } = require('./systemUpdater');
const { findDuplicates, deleteDuplicates } = require('./duplicateFinder');
const { detectBrowsers, analyzeBrowserData, cleanBrowserData } = require('./browserCleaner');
const { scanLargeFiles, cancelLargeFileScan, deleteFiles, openFileLocation, exportToCSV } = require('./largeFileFinder');
const ProcessManager = require('./processManager');
const { scanAppCaches, cleanAppCache, cleanMultipleCaches, checkAppRunning, quitApplication } = require('./appCacheManager');
const {
  initDatabase,
  addCleaningEvent,
  getCleaningHistory,
  getCleaningStats,
  deleteCleaningEvent,
  clearCleaningHistory,
  exportHistoryToCSV,
  closeDatabase
} = require('./database');
const ProfileManager = require('./cleaningProfiles');
const ScheduleDatabase = require('./scheduleDatabase');
const SchedulerService = require('./schedulerService');
const StartupManager = require('./startupManager');
const BootTimeTracker = require('./bootTimeTracker');
const { getOptimizationRecommendations } = require('./startupProgramDatabase');
const ExtensionRemnantCleaner = require('./extensionRemnantCleaner');
// Screen recording feature removed

let mainWindow;
let profileManager;
let scheduleDb;
let schedulerService;
let startupManager;
let bootTimeTracker;
let extensionCleaner;

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');
  safeLog('[MAIN] Preload script path:', preloadPath);
  safeLog('[MAIN] Preload script exists:', require('fs').existsSync(preloadPath));

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath
    },
    backgroundColor: '#1a1a2e',
    titleBarStyle: 'hiddenInset',
    show: false
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    safeLog('[MAIN] Window ready to show');
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.webContents.on('did-finish-load', () => {
    safeLog('[MAIN] Page finished loading');
    // Give the preload script a moment to execute
    setTimeout(() => {
      mainWindow.webContents.executeJavaScript('console.log("[MAIN->RENDERER] Checking electronAPI:", typeof window.electronAPI);')
        .catch(err => {
          try {
            console.error('[MAIN] Error checking electronAPI:', err);
          } catch (e) {
            // Ignore console errors
          }
        });
    }, 100);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Initialize database
  try {
    initDatabase();
  } catch (error) {
    console.error('[MAIN] Failed to initialize database:', error);
  }

  // Initialize scheduler components
  try {
    profileManager = new ProfileManager();
    scheduleDb = new ScheduleDatabase();
    schedulerService = new SchedulerService(scheduleDb, profileManager);

    // Start scheduler service
    schedulerService.start();
  } catch (error) {
    console.error('[MAIN] Failed to initialize scheduler:', error);
  }

  // Initialize startup manager and boot time tracker
  try {
    startupManager = new StartupManager();
    bootTimeTracker = new BootTimeTracker();

    // Record boot time on app start
    setTimeout(async () => {
      try {
        const startupPrograms = await startupManager.getStartupPrograms();
        await bootTimeTracker.recordBootTime(startupPrograms);
      } catch (error) {
        console.error('[MAIN] Failed to record boot time:', error);
      }
    }, 5000); // Wait 5 seconds after app launch
  } catch (error) {
    console.error('[MAIN] Failed to initialize startup manager:', error);
  }

  // Initialize extension remnant cleaner
  try {
    extensionCleaner = new ExtensionRemnantCleaner();
  } catch (error) {
    console.error('[MAIN] Failed to initialize extension cleaner:', error);
  }

  createWindow();
});

app.on('window-all-closed', () => {
  closeDatabase();

  // Stop scheduler and close schedule database
  if (schedulerService) {
    schedulerService.stop();
  }
  if (scheduleDb) {
    scheduleDb.close();
  }

  // Close boot time tracker database
  if (bootTimeTracker) {
    bootTimeTracker.close();
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // Only create window if app is ready and no windows exist
  if (app.isReady() && BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('get-system-info', async () => {
  return {
    platform: process.platform,
    arch: process.arch,
    version: process.getSystemVersion()
  };
});

ipcMain.handle('scan-system', async (event) => {
  try {
    const results = await scanSystem((progress) => {
      event.sender.send('scan-progress', progress);
    });
    return { success: true, data: results };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clean-files', async (event, filesToClean) => {
  try {
    const results = await cleanFiles(filesToClean, (progress) => {
      event.sender.send('clean-progress', progress);
    });
    return { success: true, data: results };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Driver Update Handlers (Windows only)
ipcMain.handle('check-windows-update', async () => {
  try {
    const result = await checkWindowsUpdate();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('check-driver-updates', async (event) => {
  try {
    const results = await checkDriverUpdates((progress) => {
      event.sender.send('driver-check-progress', progress);
    });
    return results;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-drivers', async (event, driverIds) => {
  try {
    const results = await updateDrivers(driverIds, (progress) => {
      event.sender.send('driver-update-progress', progress);
    });
    return results;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('check-admin-privileges', async () => {
  try {
    const result = await checkAdminPrivileges();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('check-pswu-module', async () => {
  try {
    const result = await checkPSWindowsUpdateModule();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('install-pswu-module', async () => {
  try {
    const result = await installPSWindowsUpdateModule();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('detect-problem-devices', async () => {
  try {
    const result = await detectProblemDevices();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// System Update Handlers
ipcMain.handle('check-system-updates', async (event) => {
  try {
    const results = await checkSystemUpdates((progress) => {
      event.sender.send('system-update-check-progress', progress);
    });
    return results;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('install-system-updates', async (event) => {
  try {
    const results = await installSystemUpdates((progress) => {
      event.sender.send('system-update-install-progress', progress);
    });
    return results;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Duplicate Finder Handlers
let duplicateScanCancelToken = null;

ipcMain.handle('scan-duplicates', async (event, options) => {
  try {
    // Create a new cancel token
    duplicateScanCancelToken = { cancelled: false };

    const results = await findDuplicates(options, (progress) => {
      event.sender.send('duplicate-scan-progress', progress);
    }, duplicateScanCancelToken);

    return results;
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    duplicateScanCancelToken = null;
  }
});

ipcMain.handle('cancel-duplicate-scan', async () => {
  if (duplicateScanCancelToken) {
    duplicateScanCancelToken.cancelled = true;
    return { success: true, message: 'Scan cancelled' };
  }
  return { success: false, message: 'No active scan to cancel' };
});

ipcMain.handle('delete-duplicates', async (event, filePaths) => {
  try {
    const results = await deleteDuplicates(filePaths, (progress) => {
      event.sender.send('duplicate-delete-progress', progress);
    });
    return results;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Browser Cleaner Handlers
ipcMain.handle('detect-browsers', async () => {
  try {
    const browsers = await detectBrowsers();
    return { success: true, data: browsers };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('analyze-browser-data', async (event, { browserId, dataTypes }) => {
  try {
    const analysis = await analyzeBrowserData(browserId, dataTypes);
    return { success: true, data: analysis };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clean-browser-data', async (event, { browserId, dataTypes, options }) => {
  try {
    const results = await cleanBrowserData(browserId, dataTypes, options);
    return { success: true, data: results };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Process Manager Handlers
const processManager = new ProcessManager();

ipcMain.handle('quit-browser', async (event, browserId) => {
  try {
    const result = await processManager.quitBrowser(browserId);
    return result;
  } catch (error) {
    return {
      success: false,
      message: error.message,
      code: 'QUIT_ERROR'
    };
  }
});

ipcMain.handle('check-browser-running', async (event, browserId) => {
  try {
    const isRunning = await processManager.isBrowserRunning(browserId);
    return { success: true, isRunning };
  } catch (error) {
    return { success: false, isRunning: false, error: error.message };
  }
});

// Cleaning History Handlers
ipcMain.handle('add-cleaning-event', async (event, eventData) => {
  try {
    const result = addCleaningEvent(eventData);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-cleaning-history', async (event, options) => {
  try {
    const history = getCleaningHistory(options);
    return { success: true, data: history };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-cleaning-stats', async () => {
  try {
    const stats = getCleaningStats();
    return { success: true, data: stats };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-cleaning-event', async (event, id) => {
  try {
    const result = deleteCleaningEvent(id);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clear-cleaning-history', async () => {
  try {
    const result = clearCleaningHistory();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-history-csv', async () => {
  try {
    const csv = exportHistoryToCSV();
    return { success: true, data: csv };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Large File Finder Handlers
let largeFileScanCancelToken = null;

ipcMain.handle('scan-large-files', async (event, options) => {
  try {
    largeFileScanCancelToken = { cancelled: false };

    const results = await scanLargeFiles(options, (progress) => {
      event.sender.send('large-file-scan-progress', progress);
    });

    return results;
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    largeFileScanCancelToken = null;
  }
});

ipcMain.handle('cancel-large-file-scan', async () => {
  if (largeFileScanCancelToken) {
    cancelLargeFileScan();
    return { success: true, message: 'Scan cancelled' };
  }
  return { success: false, message: 'No active scan to cancel' };
});

ipcMain.handle('delete-large-files', async (event, filePaths) => {
  try {
    const results = await deleteFiles(filePaths, (progress) => {
      event.sender.send('large-file-delete-progress', progress);
    });
    return results;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-file-location', async (event, filePath) => {
  try {
    const result = await openFileLocation(filePath);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-large-files-csv', async (event, files) => {
  try {
    const csv = exportToCSV(files);
    return { success: true, data: csv };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Application Cache Manager Handlers
ipcMain.handle('scan-app-caches', async () => {
  try {
    const results = await scanAppCaches();
    return results;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clean-app-cache', async (event, appId) => {
  try {
    const result = await cleanAppCache(appId);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clean-multiple-caches', async (event, appIds) => {
  try {
    const results = await cleanMultipleCaches(appIds, (progress) => {
      event.sender.send('app-cache-clean-progress', progress);
    });
    return results;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('is-app-running', async (event, appId) => {
  try {
    const result = await checkAppRunning(appId);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('quit-app', async (event, appId) => {
  try {
    const result = await quitApplication(appId);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==================== Cleaning Profiles Handlers ====================

ipcMain.handle('get-cleaning-profiles', async () => {
  try {
    const profiles = profileManager.getAllProfiles();
    return { success: true, data: profiles };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-cleaning-profile', async (event, profileId) => {
  try {
    const profile = profileManager.getProfile(profileId);
    if (!profile) {
      return { success: false, error: 'Profile not found' };
    }
    return { success: true, data: profile };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-profile', async (event, profile) => {
  try {
    const result = profileManager.createProfile(profile);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-profile', async (event, { id, updates }) => {
  try {
    const result = profileManager.updateProfile(id, updates);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-profile', async (event, profileId) => {
  try {
    const result = profileManager.deleteProfile(profileId);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-profile', async (event, profileId) => {
  try {
    const result = profileManager.exportProfile(profileId);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('import-profile', async (event, jsonData) => {
  try {
    const result = profileManager.importProfile(jsonData);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==================== Schedules Handlers ====================

ipcMain.handle('get-schedules', async (event, enabledOnly = false) => {
  try {
    const schedules = scheduleDb.getSchedules(enabledOnly);
    return { success: true, data: schedules };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-schedule', async (event, scheduleId) => {
  try {
    const schedule = scheduleDb.getSchedule(scheduleId);
    if (!schedule) {
      return { success: false, error: 'Schedule not found' };
    }
    return { success: true, data: schedule };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-schedule', async (event, schedule) => {
  try {
    const result = scheduleDb.addSchedule(schedule);

    // If successful and scheduler is running, reload schedules
    if (result.success && schedulerService.isRunning) {
      schedulerService.loadSchedules();
    }

    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-schedule', async (event, { id, updates }) => {
  try {
    const result = scheduleDb.updateSchedule(id, updates);

    // Reload schedules if running
    if (result.success && schedulerService.isRunning) {
      schedulerService.loadSchedules();
    }

    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-schedule', async (event, scheduleId) => {
  try {
    const result = scheduleDb.deleteSchedule(scheduleId);

    // Reload schedules if running
    if (result.success && schedulerService.isRunning) {
      schedulerService.loadSchedules();
    }

    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('toggle-schedule', async (event, { id, enabled }) => {
  try {
    const result = scheduleDb.toggleSchedule(id, enabled);

    // Reload schedules if running
    if (result.success && schedulerService.isRunning) {
      schedulerService.loadSchedules();
    }

    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-schedule-logs', async (event, scheduleId, limit = 50) => {
  try {
    const logs = scheduleDb.getScheduleLogs(scheduleId, limit);
    return { success: true, data: logs };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-recent-schedule-logs', async (event, limit = 100) => {
  try {
    const logs = scheduleDb.getRecentLogs(limit);
    return { success: true, data: logs };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-execution-stats', async (event, scheduleId = null) => {
  try {
    const stats = scheduleDb.getExecutionStats(scheduleId);
    return { success: true, data: stats };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-upcoming-schedules', async () => {
  try {
    const schedules = scheduleDb.getUpcomingSchedules();
    return { success: true, data: schedules };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-schedules-by-profile', async (event, profileId) => {
  try {
    const schedules = scheduleDb.getSchedulesByProfile(profileId);
    return { success: true, data: schedules };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==================== Scheduler Service Handlers ====================

ipcMain.handle('start-scheduler', async () => {
  try {
    const result = schedulerService.start();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-scheduler', async () => {
  try {
    const result = schedulerService.stop();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-scheduler-status', async () => {
  try {
    const status = schedulerService.getStatus();
    return { success: true, data: status };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('execute-schedule-now', async (event, scheduleId) => {
  try {
    const result = await schedulerService.executeSchedule(scheduleId);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('test-profile', async (event, profileId) => {
  try {
    const profile = profileManager.getProfile(profileId);
    if (!profile) {
      return { success: false, error: 'Profile not found' };
    }

    // Execute the cleaning tasks for this profile
    const result = await schedulerService.executeCleaningTasks(profile);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==================== Startup Manager Handlers ====================

ipcMain.handle('get-startup-programs', async () => {
  try {
    const programs = await startupManager.getStartupPrograms();
    return { success: true, data: programs };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('toggle-startup-program', async (event, { itemId, enabled }) => {
  try {
    const result = await startupManager.toggleStartupItem(itemId, enabled);

    // Record the change
    if (result.success && bootTimeTracker) {
      const programs = await startupManager.getStartupPrograms();
      const program = programs.find(p => p.id === itemId);
      if (program) {
        bootTimeTracker.recordChange(
          program.name,
          program.path,
          enabled ? 'enabled' : 'disabled',
          program.impact
        );
      }
    }

    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('remove-startup-program', async (event, itemId) => {
  try {
    const programs = await startupManager.getStartupPrograms();
    const program = programs.find(p => p.id === itemId);

    const result = await startupManager.removeStartupItem(itemId);

    // Record the change
    if (result.success && bootTimeTracker && program) {
      bootTimeTracker.recordChange(
        program.name,
        program.path,
        'removed',
        program.impact
      );
    }

    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('add-startup-program', async (event, { programPath, programName }) => {
  try {
    const result = await startupManager.addStartupItem(programPath, programName);

    // Record the change
    if (result.success && bootTimeTracker) {
      bootTimeTracker.recordChange(
        programName,
        programPath,
        'added',
        'medium'
      );
    }

    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('optimize-startup', async () => {
  try {
    const programs = await startupManager.getStartupPrograms();
    const recommendations = getOptimizationRecommendations(programs);

    const disabledPrograms = [];
    const errors = [];

    // Disable recommended programs
    for (const rec of recommendations) {
      if (rec.action === 'disable') {
        const program = programs.find(p => p.name === rec.program);
        if (program && program.enabled) {
          const result = await startupManager.toggleStartupItem(program.id, false);
          if (result.success) {
            disabledPrograms.push(program.name);

            // Record change
            if (bootTimeTracker) {
              bootTimeTracker.recordChange(
                program.name,
                program.path,
                'disabled',
                program.impact,
                'Auto-optimized'
              );
            }
          } else {
            errors.push({ program: program.name, error: result.error });
          }
        }
      }
    }

    return {
      success: true,
      disabledCount: disabledPrograms.length,
      disabledPrograms,
      errors
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==================== Boot Time Tracker Handlers ====================

ipcMain.handle('get-boot-time-history', async (event, days = 30) => {
  try {
    const history = bootTimeTracker.getBootTimeHistory(days);
    return { success: true, data: history };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-boot-time-stats', async (event, days = 30) => {
  try {
    const stats = bootTimeTracker.getBootTimeStats(days);
    return { success: true, data: stats };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-boot-time-chart-data', async (event, days = 30) => {
  try {
    const chartData = bootTimeTracker.getChartData(days);
    return { success: true, data: chartData };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-boot-time-trend', async (event, days = 7) => {
  try {
    const trend = bootTimeTracker.getBootTimeTrend(days);
    return { success: true, data: trend };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('estimate-boot-improvement', async (event, { currentBootTime, programsToDisable }) => {
  try {
    const estimate = bootTimeTracker.estimateImprovement(currentBootTime, programsToDisable);
    return { success: true, data: estimate };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-startup-recommendations', async () => {
  try {
    const programs = await startupManager.getStartupPrograms();
    const recommendations = getOptimizationRecommendations(programs);
    return { success: true, data: recommendations };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-recent-startup-changes', async (event, limit = 20) => {
  try {
    const changes = bootTimeTracker.getRecentChanges(limit);
    return { success: true, data: changes };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==================== Extension Remnant Cleaner Handlers ====================

ipcMain.handle('scan-extension-remnants', async (event, browserName) => {
  try {
    if (!extensionCleaner) {
      return { success: false, error: 'Extension cleaner not initialized' };
    }

    const remnants = await extensionCleaner.scanExtensionRemnants(browserName);
    return { success: true, data: remnants };
  } catch (error) {
    console.error(`[MAIN] Error scanning extension remnants for ${browserName}:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clean-extension-remnant', async (event, remnantPaths) => {
  try {
    if (!extensionCleaner) {
      return { success: false, error: 'Extension cleaner not initialized' };
    }

    const result = await extensionCleaner.cleanRemnant(remnantPaths);
    return { success: true, data: result };
  } catch (error) {
    console.error('[MAIN] Error cleaning extension remnant:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clean-multiple-extension-remnants', async (event, remnantsList) => {
  try {
    if (!extensionCleaner) {
      return { success: false, error: 'Extension cleaner not initialized' };
    }

    const result = await extensionCleaner.cleanMultipleRemnants(remnantsList, (progress) => {
      event.sender.send('extension-clean-progress', progress);
    });

    return { success: true, data: result };
  } catch (error) {
    console.error('[MAIN] Error cleaning multiple extension remnants:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-extension-stats', async () => {
  try {
    if (!extensionCleaner) {
      return { success: false, error: 'Extension cleaner not initialized' };
    }

    const stats = await extensionCleaner.getAllBrowserStats();
    return { success: true, data: stats };
  } catch (error) {
    console.error('[MAIN] Error getting extension stats:', error);
    return { success: false, error: error.message };
  }
});

// ==================== Screen Recorder Handlers ====================

// Renderer logging handler - log critical messages to main process terminal
ipcMain.handle('log-to-main', async (event, { level, tag, message, data }) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [RENDERER-${level.toUpperCase()}] [${tag}] ${message}`;

  if (level === 'error') {
    console.error(logMessage, data || '');
  } else if (level === 'warn') {
    console.warn(logMessage, data || '');
  } else {
    console.log(logMessage, data || '');
  }

  return { success: true };
});

// Screen recording IPC handlers removed
