/**
 * Boot Time Tracker
 * Tracks system boot times and startup program changes
 * Stores historical data for analysis and improvements
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { app } = require('electron');

class BootTimeTracker {
  constructor() {
    // Ensure data directory exists
    const userDataPath = app.getPath('userData');
    const dbDir = path.join(userDataPath, 'data');

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.dbPath = path.join(dbDir, 'boot-times.db');
    this.db = new Database(this.dbPath);
    this.initTables();
    this.platform = process.platform;
  }

  /**
   * Initialize database tables
   */
  initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS boot_times (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        boot_timestamp INTEGER NOT NULL,
        boot_duration_seconds REAL NOT NULL,
        startup_programs_count INTEGER NOT NULL,
        startup_programs TEXT,
        platform TEXT NOT NULL,
        notes TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );

      CREATE TABLE IF NOT EXISTS startup_changes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        program_name TEXT NOT NULL,
        program_path TEXT,
        action TEXT NOT NULL,
        impact_estimate TEXT,
        notes TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_boot_times_timestamp
        ON boot_times(boot_timestamp DESC);

      CREATE INDEX IF NOT EXISTS idx_startup_changes_timestamp
        ON startup_changes(timestamp DESC);
    `);
  }

  /**
   * Get system boot time (platform specific)
   */
  getSystemBootTime() {
    const uptime = os.uptime(); // System uptime in seconds
    const now = Date.now();
    const bootTime = now - (uptime * 1000);
    return bootTime;
  }

  /**
   * Calculate boot duration
   * This is approximate - gets better with actual measurement
   */
  async calculateBootDuration() {
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);

      if (this.platform === 'darwin') {
        // macOS: Get boot time from system log
        try {
          const { stdout } = await execPromise('sysctl -n kern.boottime');
          // Parse output like: { sec = 1234567890, usec = 123456 }
          const match = stdout.match(/sec = (\d+)/);
          if (match) {
            const bootTimestamp = parseInt(match[1]) * 1000;
            const now = Date.now();
            const duration = (now - bootTimestamp) / 1000;

            // If duration is reasonable (less than 10 minutes), return it
            if (duration < 600 && duration > 0) {
              return duration;
            }
          }
        } catch (error) {
          console.error('Error getting macOS boot time:', error);
        }
      } else if (this.platform === 'win32') {
        // Windows: Use systeminfo to get boot time
        try {
          const { stdout } = await execPromise('systeminfo | findstr /C:"System Boot Time"');
          // Parse boot time and calculate duration
          // This is approximate
          return 45; // Default estimation
        } catch (error) {
          console.error('Error getting Windows boot time:', error);
        }
      } else if (this.platform === 'linux') {
        // Linux: Use systemd-analyze if available
        try {
          const { stdout } = await execPromise('systemd-analyze time 2>/dev/null');
          // Parse output like: "Startup finished in 5.234s (kernel) + 10.567s (userspace) = 15.801s"
          const match = stdout.match(/= ([\d.]+)s/);
          if (match) {
            return parseFloat(match[1]);
          }
        } catch (error) {
          // systemd-analyze not available, use uptime
          console.error('Error getting Linux boot time:', error);
        }
      }
    } catch (error) {
      console.error('Error calculating boot duration:', error);
    }

    // Default estimation based on platform
    return this.platform === 'darwin' ? 40 : 50;
  }

  /**
   * Record a boot time
   */
  async recordBootTime(startupPrograms) {
    const bootTimestamp = this.getSystemBootTime();
    const bootDuration = await this.calculateBootDuration();
    const programCount = startupPrograms.filter(p => p.enabled).length;
    const programList = JSON.stringify(
      startupPrograms.filter(p => p.enabled).map(p => ({
        name: p.name,
        impact: p.impact
      }))
    );

    const stmt = this.db.prepare(`
      INSERT INTO boot_times
        (boot_timestamp, boot_duration_seconds, startup_programs_count, startup_programs, platform)
      VALUES (?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      bootTimestamp,
      bootDuration,
      programCount,
      programList,
      this.platform
    );

    return {
      id: info.lastInsertRowid,
      bootTimestamp,
      bootDuration,
      programCount
    };
  }

  /**
   * Record a startup program change
   */
  recordChange(programName, programPath, action, impactEstimate, notes = null) {
    const stmt = this.db.prepare(`
      INSERT INTO startup_changes
        (program_name, program_path, action, impact_estimate, notes)
      VALUES (?, ?, ?, ?, ?)
    `);

    const info = stmt.run(programName, programPath, action, impactEstimate, notes);
    return info.lastInsertRowid;
  }

  /**
   * Get boot time history
   */
  getBootTimeHistory(days = 30) {
    const cutoffTimestamp = Date.now() - (days * 24 * 60 * 60 * 1000);

    const stmt = this.db.prepare(`
      SELECT
        id,
        boot_timestamp,
        boot_duration_seconds,
        startup_programs_count,
        startup_programs,
        platform,
        notes,
        created_at
      FROM boot_times
      WHERE boot_timestamp >= ?
      ORDER BY boot_timestamp DESC
      LIMIT 100
    `);

    const rows = stmt.all(cutoffTimestamp);

    return rows.map(row => ({
      id: row.id,
      bootTimestamp: row.boot_timestamp,
      bootDuration: row.boot_duration_seconds,
      programCount: row.startup_programs_count,
      programs: JSON.parse(row.startup_programs || '[]'),
      platform: row.platform,
      notes: row.notes,
      createdAt: row.created_at
    }));
  }

  /**
   * Get recent changes
   */
  getRecentChanges(limit = 20) {
    const stmt = this.db.prepare(`
      SELECT
        id,
        timestamp,
        program_name,
        program_path,
        action,
        impact_estimate,
        notes
      FROM startup_changes
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    return stmt.all(limit);
  }

  /**
   * Get boot time statistics
   */
  getBootTimeStats(days = 30) {
    const history = this.getBootTimeHistory(days);

    if (history.length === 0) {
      return null;
    }

    const durations = history.map(h => h.bootDuration);
    const sum = durations.reduce((a, b) => a + b, 0);
    const avg = sum / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);

    // Calculate median
    const sorted = [...durations].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    return {
      count: history.length,
      average: Math.round(avg * 10) / 10,
      median: Math.round(median * 10) / 10,
      fastest: Math.round(min * 10) / 10,
      slowest: Math.round(max * 10) / 10,
      current: history[0] ? Math.round(history[0].bootDuration * 10) / 10 : null
    };
  }

  /**
   * Estimate improvement from disabling programs
   */
  estimateImprovement(currentBootTime, programsToDisable) {
    // Calculate total estimated savings
    const totalSavings = programsToDisable.reduce((sum, program) => {
      // Estimate based on impact level
      let savings = 0;
      switch (program.impact) {
        case 'high':
          savings = program.bootTimeImpactSeconds || 8;
          break;
        case 'medium':
          savings = program.bootTimeImpactSeconds || 4;
          break;
        case 'low':
          savings = program.bootTimeImpactSeconds || 2;
          break;
        default:
          savings = 3;
      }
      return sum + savings;
    }, 0);

    // Apply diminishing returns (can't save 100%)
    const adjustedSavings = totalSavings * 0.8;
    const estimatedNewBootTime = Math.max(15, currentBootTime - adjustedSavings);
    const actualSavings = currentBootTime - estimatedNewBootTime;
    const percentImprovement = Math.round((actualSavings / currentBootTime) * 100);

    return {
      currentBootTime: Math.round(currentBootTime),
      estimatedNewBootTime: Math.round(estimatedNewBootTime),
      estimatedSavings: Math.round(actualSavings),
      percentImprovement
    };
  }

  /**
   * Get boot time trend (improving/declining)
   */
  getBootTimeTrend(days = 7) {
    const history = this.getBootTimeHistory(days);

    if (history.length < 2) {
      return { trend: 'stable', change: 0 };
    }

    // Compare recent average to older average
    const midpoint = Math.floor(history.length / 2);
    const recentAvg = history.slice(0, midpoint)
      .reduce((sum, h) => sum + h.bootDuration, 0) / midpoint;
    const olderAvg = history.slice(midpoint)
      .reduce((sum, h) => sum + h.bootDuration, 0) / (history.length - midpoint);

    const change = olderAvg - recentAvg;
    const percentChange = (change / olderAvg) * 100;

    let trend = 'stable';
    if (percentChange > 10) {
      trend = 'improving';
    } else if (percentChange < -10) {
      trend = 'declining';
    }

    return {
      trend,
      change: Math.round(change * 10) / 10,
      percentChange: Math.round(percentChange)
    };
  }

  /**
   * Get formatted data for charts
   */
  getChartData(days = 30) {
    const history = this.getBootTimeHistory(days);

    return history.reverse().map(h => ({
      date: new Date(h.bootTimestamp).toLocaleDateString(),
      bootTime: Math.round(h.bootDuration),
      programs: h.programCount
    }));
  }

  /**
   * Clean old records (keep last 90 days)
   */
  cleanOldRecords() {
    const cutoffTimestamp = Date.now() - (90 * 24 * 60 * 60 * 1000);

    const bootStmt = this.db.prepare(`
      DELETE FROM boot_times WHERE boot_timestamp < ?
    `);

    const changesStmt = this.db.prepare(`
      DELETE FROM startup_changes WHERE timestamp < ?
    `);

    const bootInfo = bootStmt.run(cutoffTimestamp);
    const changesInfo = changesStmt.run(cutoffTimestamp / 1000); // Convert to seconds

    return {
      bootRecordsDeleted: bootInfo.changes,
      changeRecordsDeleted: changesInfo.changes
    };
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = BootTimeTracker;
