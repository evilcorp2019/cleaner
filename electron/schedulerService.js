const { Notification, powerMonitor, app } = require('electron');
const path = require('path');
const os = require('os');

/**
 * Scheduler Service
 * Manages scheduled cleaning tasks and automation
 */
class SchedulerService {
  constructor(scheduleDb, profileManager) {
    this.scheduleDb = scheduleDb;
    this.profileManager = profileManager;
    this.timers = new Map();
    this.isRunning = false;
    this.checkInterval = null;
    this.idleCheckInterval = null;
    this.lastIdleCheck = Date.now();
    this.systemIdleTime = 0;
  }

  /**
   * Start the scheduler service
   */
  start() {
    if (this.isRunning) {
      console.log('[SCHEDULER] Already running');
      return { success: true, message: 'Already running' };
    }

    console.log('[SCHEDULER] Starting service...');

    // Load all enabled schedules
    this.loadSchedules();

    // Check for schedules every minute
    this.checkInterval = setInterval(() => {
      this.checkSchedules();
    }, 60000); // 60 seconds

    // Check system idle time every 30 seconds
    this.idleCheckInterval = setInterval(() => {
      this.checkIdleTriggers();
    }, 30000); // 30 seconds

    // Check for startup triggers
    this.checkStartupTriggers();

    this.isRunning = true;

    console.log('[SCHEDULER] Service started');
    return { success: true, message: 'Scheduler started' };
  }

  /**
   * Stop the scheduler service
   */
  stop() {
    if (!this.isRunning) {
      console.log('[SCHEDULER] Not running');
      return { success: true, message: 'Not running' };
    }

    console.log('[SCHEDULER] Stopping service...');

    // Clear all timers
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval);
      this.idleCheckInterval = null;
    }

    this.timers.forEach((timer, id) => {
      clearTimeout(timer);
    });
    this.timers.clear();

    this.isRunning = false;

    console.log('[SCHEDULER] Service stopped');
    return { success: true, message: 'Scheduler stopped' };
  }

  /**
   * Load all enabled schedules
   */
  loadSchedules() {
    const schedules = this.scheduleDb.getSchedules(true); // enabled only

    schedules.forEach(schedule => {
      // Calculate next run if not set
      if (!schedule.nextRun && schedule.trigger === 'time') {
        const nextRun = this.calculateNextRun(schedule);
        this.scheduleDb.updateNextRun(schedule.id, nextRun);
      }
    });

    console.log(`[SCHEDULER] Loaded ${schedules.length} enabled schedules`);
  }

  /**
   * Check for schedules that need to run
   */
  checkSchedules() {
    if (!this.isRunning) return;

    const now = Date.now();
    const schedules = this.scheduleDb.getSchedules(true);

    schedules.forEach(schedule => {
      if (schedule.trigger === 'time' && schedule.nextRun && schedule.nextRun <= now) {
        console.log(`[SCHEDULER] Time to run schedule ${schedule.id}`);
        this.executeSchedule(schedule.id);
      }
    });
  }

  /**
   * Check for idle triggers
   */
  checkIdleTriggers() {
    if (!this.isRunning) return;

    try {
      // Get system idle time in seconds
      const idleTime = powerMonitor.getSystemIdleTime();
      const idleMinutes = Math.floor(idleTime / 60);

      const schedules = this.scheduleDb.getSchedules(true);

      schedules.forEach(schedule => {
        if (schedule.trigger === 'idle' && schedule.idleMinutes) {
          if (idleMinutes >= schedule.idleMinutes) {
            // Check if we haven't run this recently (avoid running every 30 seconds)
            const timeSinceLastRun = schedule.lastRun
              ? Date.now() - schedule.lastRun
              : Infinity;

            // Only run if it's been at least 1 hour since last run
            if (timeSinceLastRun > 60 * 60 * 1000) {
              console.log(`[SCHEDULER] System idle for ${idleMinutes} minutes, running schedule ${schedule.id}`);
              this.executeSchedule(schedule.id);
            }
          }
        }
      });
    } catch (error) {
      console.error('[SCHEDULER] Error checking idle triggers:', error);
    }
  }

  /**
   * Check for startup triggers
   */
  checkStartupTriggers() {
    const schedules = this.scheduleDb.getSchedules(true);

    schedules.forEach(schedule => {
      if (schedule.trigger === 'startup') {
        // Check if we should run on startup
        const timeSinceLastRun = schedule.lastRun
          ? Date.now() - schedule.lastRun
          : Infinity;

        // Only run if it's been at least 1 hour since last run
        if (timeSinceLastRun > 60 * 60 * 1000) {
          console.log(`[SCHEDULER] Running startup schedule ${schedule.id}`);
          // Delay startup triggers by 30 seconds to let system settle
          setTimeout(() => {
            this.executeSchedule(schedule.id);
          }, 30000);
        }
      }
    });
  }

  /**
   * Execute a scheduled cleaning task
   */
  async executeSchedule(scheduleId) {
    const startTime = Date.now();

    try {
      const schedule = this.scheduleDb.getSchedule(scheduleId);
      if (!schedule || !schedule.enabled) {
        console.log(`[SCHEDULER] Schedule ${scheduleId} not found or disabled`);
        return { success: false, error: 'Schedule not found or disabled' };
      }

      const profile = this.profileManager.getProfile(schedule.profileId);
      if (!profile) {
        console.log(`[SCHEDULER] Profile ${schedule.profileId} not found`);
        return { success: false, error: 'Profile not found' };
      }

      console.log(`[SCHEDULER] Executing schedule ${scheduleId} with profile ${profile.name}`);

      // Show notification
      if (profile.options.showNotifications) {
        this.showNotification(
          'Scheduled Cleaning Started',
          `Running ${profile.name}...`
        );
      }

      // Check battery status
      if (!profile.options.runOnBattery && this.isOnBattery()) {
        console.log('[SCHEDULER] Skipping - device is on battery');

        this.scheduleDb.logExecution({
          scheduleId: schedule.id,
          profileId: profile.id,
          executedAt: Date.now(),
          success: false,
          errorMessage: 'Skipped - device on battery'
        });

        return { success: false, error: 'Device on battery' };
      }

      // Execute cleaning based on profile tasks
      const results = await this.executeCleaningTasks(profile);

      const duration = Math.floor((Date.now() - startTime) / 1000);

      // Log execution
      this.scheduleDb.logExecution({
        scheduleId: schedule.id,
        profileId: profile.id,
        executedAt: startTime,
        success: true,
        spaceSavedBytes: results.totalSpaceSaved || 0,
        itemsCleaned: results.totalItemsCleaned || 0,
        durationSeconds: duration,
        details: results
      });

      // Update last run time
      this.scheduleDb.updateLastRun(schedule.id, Date.now());

      // Calculate and update next run time
      if (schedule.trigger === 'time') {
        const nextRun = this.calculateNextRun(schedule);
        this.scheduleDb.updateNextRun(schedule.id, nextRun);
      }

      // Show completion notification
      if (profile.options.showNotifications) {
        this.showNotification(
          'Scheduled Cleaning Complete',
          `${profile.name} cleaned ${results.totalItemsCleaned || 0} items (${this.formatBytes(results.totalSpaceSaved || 0)})`
        );
      }

      console.log(`[SCHEDULER] Schedule ${scheduleId} completed successfully`);

      return {
        success: true,
        results
      };
    } catch (error) {
      console.error(`[SCHEDULER] Error executing schedule ${scheduleId}:`, error);

      const duration = Math.floor((Date.now() - startTime) / 1000);

      // Log failed execution
      this.scheduleDb.logExecution({
        scheduleId: scheduleId,
        profileId: 'unknown',
        executedAt: startTime,
        success: false,
        durationSeconds: duration,
        errorMessage: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute cleaning tasks based on profile
   */
  async executeCleaningTasks(profile) {
    const results = {
      totalSpaceSaved: 0,
      totalItemsCleaned: 0,
      tasks: []
    };

    // Note: This is a placeholder. In a real implementation, you would:
    // 1. Import the actual cleaning modules (browserCleaner, appCacheManager, etc.)
    // 2. Execute each enabled task based on profile.cleaningTasks
    // 3. Aggregate the results

    // For now, we'll simulate the execution
    console.log('[SCHEDULER] Executing cleaning tasks for profile:', profile.name);

    // Example: Browser cleaning
    if (profile.cleaningTasks.browserHistory?.enabled) {
      // Call browser cleaner
      results.tasks.push({
        name: 'Browser History',
        success: true,
        itemsCleaned: 0,
        spaceSaved: 0
      });
    }

    if (profile.cleaningTasks.browserCookies?.enabled) {
      // Call browser cleaner
      results.tasks.push({
        name: 'Browser Cookies',
        success: true,
        itemsCleaned: 0,
        spaceSaved: 0
      });
    }

    if (profile.cleaningTasks.browserCache?.enabled) {
      // Call browser cleaner
      results.tasks.push({
        name: 'Browser Cache',
        success: true,
        itemsCleaned: 0,
        spaceSaved: 0
      });
    }

    // Temp files
    if (profile.cleaningTasks.tempFiles?.enabled) {
      // Call temp file cleaner
      results.tasks.push({
        name: 'Temporary Files',
        success: true,
        itemsCleaned: 0,
        spaceSaved: 0
      });
    }

    // App caches
    if (profile.cleaningTasks.appCaches?.enabled) {
      // Call app cache manager
      results.tasks.push({
        name: 'Application Caches',
        success: true,
        itemsCleaned: 0,
        spaceSaved: 0
      });
    }

    return results;
  }

  /**
   * Calculate next run time for a schedule
   */
  calculateNextRun(schedule) {
    const now = new Date();

    switch (schedule.frequency) {
      case 'daily': {
        if (!schedule.time) return null;

        const [hours, minutes] = schedule.time.split(':').map(Number);
        const next = new Date(now);
        next.setHours(hours, minutes, 0, 0);

        // If time has passed today, schedule for tomorrow
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }

        return next.getTime();
      }

      case 'weekly': {
        if (!schedule.time || schedule.dayOfWeek === null) return null;

        const [hours, minutes] = schedule.time.split(':').map(Number);
        const next = new Date(now);
        next.setHours(hours, minutes, 0, 0);

        // Calculate days until target day of week
        const currentDay = next.getDay();
        const targetDay = schedule.dayOfWeek;
        let daysToAdd = targetDay - currentDay;

        if (daysToAdd < 0 || (daysToAdd === 0 && next <= now)) {
          daysToAdd += 7;
        }

        next.setDate(next.getDate() + daysToAdd);

        return next.getTime();
      }

      case 'monthly': {
        if (!schedule.time || !schedule.dayOfMonth) return null;

        const [hours, minutes] = schedule.time.split(':').map(Number);
        const next = new Date(now);
        next.setDate(schedule.dayOfMonth);
        next.setHours(hours, minutes, 0, 0);

        // If date has passed this month, schedule for next month
        if (next <= now) {
          next.setMonth(next.getMonth() + 1);
        }

        return next.getTime();
      }

      case 'custom': {
        if (!schedule.intervalMinutes) return null;

        const next = new Date(now);
        next.setMinutes(next.getMinutes() + schedule.intervalMinutes);

        return next.getTime();
      }

      default:
        return null;
    }
  }

  /**
   * Check if device is on battery
   */
  isOnBattery() {
    try {
      // This is only available on some platforms
      if (powerMonitor.isOnBatteryPower) {
        return powerMonitor.isOnBatteryPower();
      }
      return false;
    } catch (error) {
      console.error('[SCHEDULER] Error checking battery status:', error);
      return false;
    }
  }

  /**
   * Show system notification
   */
  showNotification(title, body) {
    try {
      const notification = new Notification({
        title,
        body,
        silent: false
      });

      notification.show();
    } catch (error) {
      console.error('[SCHEDULER] Error showing notification:', error);
    }
  }

  /**
   * Format bytes to human-readable string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get service status
   */
  getStatus() {
    const schedules = this.scheduleDb.getSchedules(true);
    const upcoming = this.scheduleDb.getUpcomingSchedules();

    return {
      isRunning: this.isRunning,
      totalSchedules: schedules.length,
      upcomingSchedules: upcoming.length,
      nextSchedule: upcoming.length > 0 ? upcoming[0] : null
    };
  }
}

module.exports = SchedulerService;
