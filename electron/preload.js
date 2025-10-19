const { contextBridge, ipcRenderer } = require('electron');

console.log('[PRELOAD] Preload script is running');
console.log('[PRELOAD] contextBridge available:', typeof contextBridge);
console.log('[PRELOAD] ipcRenderer available:', typeof ipcRenderer);

contextBridge.exposeInMainWorld('electronAPI', {
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  scanSystem: () => ipcRenderer.invoke('scan-system'),
  cleanFiles: (files) => ipcRenderer.invoke('clean-files', files),
  onScanProgress: (callback) => ipcRenderer.on('scan-progress', (_, data) => callback(data)),
  onCleanProgress: (callback) => ipcRenderer.on('clean-progress', (_, data) => callback(data)),
  removeScanProgressListener: () => ipcRenderer.removeAllListeners('scan-progress'),
  removeCleanProgressListener: () => ipcRenderer.removeAllListeners('clean-progress'),

  // Driver update APIs (Windows only)
  checkWindowsUpdate: () => ipcRenderer.invoke('check-windows-update'),
  checkDriverUpdates: () => ipcRenderer.invoke('check-driver-updates'),
  updateDrivers: (driverIds) => ipcRenderer.invoke('update-drivers', driverIds),
  checkAdminPrivileges: () => ipcRenderer.invoke('check-admin-privileges'),
  checkPSWUModule: () => ipcRenderer.invoke('check-pswu-module'),
  installPSWUModule: () => ipcRenderer.invoke('install-pswu-module'),
  detectProblemDevices: () => ipcRenderer.invoke('detect-problem-devices'),
  onDriverCheckProgress: (callback) => ipcRenderer.on('driver-check-progress', (_, data) => callback(data)),
  onDriverUpdateProgress: (callback) => ipcRenderer.on('driver-update-progress', (_, data) => callback(data)),
  removeDriverCheckProgressListener: () => ipcRenderer.removeAllListeners('driver-check-progress'),
  removeDriverUpdateProgressListener: () => ipcRenderer.removeAllListeners('driver-update-progress'),

  // System update APIs
  checkSystemUpdates: () => ipcRenderer.invoke('check-system-updates'),
  installSystemUpdates: () => ipcRenderer.invoke('install-system-updates'),
  onSystemUpdateCheckProgress: (callback) => ipcRenderer.on('system-update-check-progress', (_, data) => callback(data)),
  onSystemUpdateInstallProgress: (callback) => ipcRenderer.on('system-update-install-progress', (_, data) => callback(data)),
  removeSystemUpdateCheckProgressListener: () => ipcRenderer.removeAllListeners('system-update-check-progress'),
  removeSystemUpdateInstallProgressListener: () => ipcRenderer.removeAllListeners('system-update-install-progress'),

  // Duplicate finder APIs
  scanDuplicates: (options) => ipcRenderer.invoke('scan-duplicates', options),
  cancelDuplicateScan: () => ipcRenderer.invoke('cancel-duplicate-scan'),
  deleteDuplicates: (filePaths) => ipcRenderer.invoke('delete-duplicates', filePaths),
  onDuplicateScanProgress: (callback) => ipcRenderer.on('duplicate-scan-progress', (_, data) => callback(data)),
  onDuplicateDeleteProgress: (callback) => ipcRenderer.on('duplicate-delete-progress', (_, data) => callback(data)),
  removeDuplicateScanProgressListener: () => ipcRenderer.removeAllListeners('duplicate-scan-progress'),
  removeDuplicateDeleteProgressListener: () => ipcRenderer.removeAllListeners('duplicate-delete-progress'),

  // Browser cleaner APIs
  detectBrowsers: () => ipcRenderer.invoke('detect-browsers'),
  analyzeBrowserData: (browserId, dataTypes) => ipcRenderer.invoke('analyze-browser-data', { browserId, dataTypes }),
  cleanBrowserData: (browserId, dataTypes, options) => ipcRenderer.invoke('clean-browser-data', { browserId, dataTypes, options }),

  // Browser process management APIs
  quitBrowser: (browserId) => ipcRenderer.invoke('quit-browser', browserId),
  checkBrowserRunning: (browserId) => ipcRenderer.invoke('check-browser-running', browserId),

  // Cleaning history APIs
  addCleaningEvent: (eventData) => ipcRenderer.invoke('add-cleaning-event', eventData),
  getCleaningHistory: (options) => ipcRenderer.invoke('get-cleaning-history', options),
  getCleaningStats: () => ipcRenderer.invoke('get-cleaning-stats'),
  deleteCleaningEvent: (id) => ipcRenderer.invoke('delete-cleaning-event', id),
  clearCleaningHistory: () => ipcRenderer.invoke('clear-cleaning-history'),
  exportHistoryCSV: () => ipcRenderer.invoke('export-history-csv'),

  // Large file finder APIs
  scanLargeFiles: (options) => ipcRenderer.invoke('scan-large-files', options),
  cancelLargeFileScan: () => ipcRenderer.invoke('cancel-large-file-scan'),
  deleteLargeFiles: (filePaths) => ipcRenderer.invoke('delete-large-files', filePaths),
  openFileLocation: (filePath) => ipcRenderer.invoke('open-file-location', filePath),
  exportLargeFilesCSV: (files) => ipcRenderer.invoke('export-large-files-csv', files),
  onLargeFileScanProgress: (callback) => ipcRenderer.on('large-file-scan-progress', (_, data) => callback(data)),
  onLargeFileDeleteProgress: (callback) => ipcRenderer.on('large-file-delete-progress', (_, data) => callback(data)),
  removeLargeFileScanProgressListener: () => ipcRenderer.removeAllListeners('large-file-scan-progress'),
  removeLargeFileDeleteProgressListener: () => ipcRenderer.removeAllListeners('large-file-delete-progress'),

  // Application Cache Manager APIs
  scanAppCaches: () => ipcRenderer.invoke('scan-app-caches'),
  cleanAppCache: (appId) => ipcRenderer.invoke('clean-app-cache', appId),
  cleanMultipleCaches: (appIds) => ipcRenderer.invoke('clean-multiple-caches', appIds),
  isAppRunning: (appId) => ipcRenderer.invoke('is-app-running', appId),
  quitApp: (appId) => ipcRenderer.invoke('quit-app', appId),
  onAppCacheCleanProgress: (callback) => ipcRenderer.on('app-cache-clean-progress', (_, data) => callback(data)),
  removeAppCacheCleanProgressListener: () => ipcRenderer.removeAllListeners('app-cache-clean-progress'),

  // Cleaning Profiles APIs
  getCleaningProfiles: () => ipcRenderer.invoke('get-cleaning-profiles'),
  getCleaningProfile: (profileId) => ipcRenderer.invoke('get-cleaning-profile', profileId),
  createProfile: (profile) => ipcRenderer.invoke('create-profile', profile),
  updateProfile: (id, updates) => ipcRenderer.invoke('update-profile', { id, updates }),
  deleteProfile: (profileId) => ipcRenderer.invoke('delete-profile', profileId),
  exportProfile: (profileId) => ipcRenderer.invoke('export-profile', profileId),
  importProfile: (jsonData) => ipcRenderer.invoke('import-profile', jsonData),
  testProfile: (profileId) => ipcRenderer.invoke('test-profile', profileId),

  // Schedules APIs
  getSchedules: (enabledOnly) => ipcRenderer.invoke('get-schedules', enabledOnly),
  getSchedule: (scheduleId) => ipcRenderer.invoke('get-schedule', scheduleId),
  createSchedule: (schedule) => ipcRenderer.invoke('create-schedule', schedule),
  updateSchedule: (id, updates) => ipcRenderer.invoke('update-schedule', { id, updates }),
  deleteSchedule: (scheduleId) => ipcRenderer.invoke('delete-schedule', scheduleId),
  toggleSchedule: (id, enabled) => ipcRenderer.invoke('toggle-schedule', { id, enabled }),
  getScheduleLogs: (scheduleId, limit) => ipcRenderer.invoke('get-schedule-logs', scheduleId, limit),
  getRecentScheduleLogs: (limit) => ipcRenderer.invoke('get-recent-schedule-logs', limit),
  getExecutionStats: (scheduleId) => ipcRenderer.invoke('get-execution-stats', scheduleId),
  getUpcomingSchedules: () => ipcRenderer.invoke('get-upcoming-schedules'),
  getSchedulesByProfile: (profileId) => ipcRenderer.invoke('get-schedules-by-profile', profileId),

  // Scheduler Service APIs
  startScheduler: () => ipcRenderer.invoke('start-scheduler'),
  stopScheduler: () => ipcRenderer.invoke('stop-scheduler'),
  getSchedulerStatus: () => ipcRenderer.invoke('get-scheduler-status'),
  executeScheduleNow: (scheduleId) => ipcRenderer.invoke('execute-schedule-now', scheduleId),

  // Startup Manager APIs
  getStartupPrograms: () => ipcRenderer.invoke('get-startup-programs'),
  toggleStartupProgram: (itemId, enabled) => ipcRenderer.invoke('toggle-startup-program', { itemId, enabled }),
  removeStartupProgram: (itemId) => ipcRenderer.invoke('remove-startup-program', itemId),
  addStartupProgram: (programPath, programName) => ipcRenderer.invoke('add-startup-program', { programPath, programName }),
  optimizeStartup: () => ipcRenderer.invoke('optimize-startup'),

  // Boot Time Tracker APIs
  getBootTimeHistory: (days) => ipcRenderer.invoke('get-boot-time-history', days),
  getBootTimeStats: (days) => ipcRenderer.invoke('get-boot-time-stats', days),
  getBootTimeChartData: (days) => ipcRenderer.invoke('get-boot-time-chart-data', days),
  getBootTimeTrend: (days) => ipcRenderer.invoke('get-boot-time-trend', days),
  estimateBootImprovement: (currentBootTime, programsToDisable) => ipcRenderer.invoke('estimate-boot-improvement', { currentBootTime, programsToDisable }),
  getStartupRecommendations: () => ipcRenderer.invoke('get-startup-recommendations'),
  getRecentStartupChanges: (limit) => ipcRenderer.invoke('get-recent-startup-changes', limit),

  // Extension Remnant Cleaner APIs
  scanExtensionRemnants: (browserName) => ipcRenderer.invoke('scan-extension-remnants', browserName),
  cleanExtensionRemnant: (remnantPaths) => ipcRenderer.invoke('clean-extension-remnant', remnantPaths),
  cleanMultipleExtensionRemnants: (remnantsList) => ipcRenderer.invoke('clean-multiple-extension-remnants', remnantsList),
  getExtensionStats: () => ipcRenderer.invoke('get-extension-stats'),
  onExtensionCleanProgress: (callback) => ipcRenderer.on('extension-clean-progress', (_, data) => callback(data)),
  removeExtensionCleanProgressListener: () => ipcRenderer.removeAllListeners('extension-clean-progress'),

  // Logging API - send logs to main process (visible in terminal)
  logToMain: (level, tag, message, data) => ipcRenderer.invoke('log-to-main', { level, tag, message, data })

  // Screen recording APIs removed
});

console.log('[PRELOAD] electronAPI exposed to window');
