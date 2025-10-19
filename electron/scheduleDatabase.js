const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

/**
 * Schedule Database Manager
 */
class ScheduleDatabase {
  constructor() {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'scheduler.db');

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');

    this.initTables();
    console.log('[SCHEDULE_DB] Initialized at:', dbPath);
  }

  /**
   * Initialize database tables
   */
  initTables() {
    const createSchedulesTable = `
      CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id TEXT NOT NULL,
        frequency TEXT NOT NULL,
        time TEXT,
        day_of_week INTEGER,
        day_of_month INTEGER,
        interval_minutes INTEGER,
        trigger TEXT NOT NULL,
        idle_minutes INTEGER,
        enabled INTEGER DEFAULT 1,
        last_run INTEGER,
        next_run INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `;

    const createScheduleLogsTable = `
      CREATE TABLE IF NOT EXISTS schedule_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        schedule_id INTEGER NOT NULL,
        profile_id TEXT NOT NULL,
        executed_at INTEGER NOT NULL,
        success INTEGER NOT NULL,
        space_saved_bytes INTEGER,
        items_cleaned INTEGER,
        duration_seconds INTEGER,
        error_message TEXT,
        details TEXT,
        FOREIGN KEY (schedule_id) REFERENCES schedules(id)
      );
    `;

    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_schedule_enabled ON schedules(enabled);
      CREATE INDEX IF NOT EXISTS idx_schedule_next_run ON schedules(next_run);
      CREATE INDEX IF NOT EXISTS idx_log_schedule ON schedule_logs(schedule_id);
      CREATE INDEX IF NOT EXISTS idx_log_executed ON schedule_logs(executed_at DESC);
    `;

    try {
      this.db.exec(createSchedulesTable);
      this.db.exec(createScheduleLogsTable);
      this.db.exec(createIndexes);
      console.log('[SCHEDULE_DB] Tables created successfully');
    } catch (error) {
      console.error('[SCHEDULE_DB] Error creating tables:', error);
      throw error;
    }
  }

  /**
   * Add new schedule
   */
  addSchedule(schedule) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO schedules (
          profile_id, frequency, time, day_of_week, day_of_month,
          interval_minutes, trigger, idle_minutes, enabled,
          next_run, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const now = Date.now();
      const result = stmt.run(
        schedule.profileId,
        schedule.frequency,
        schedule.time || null,
        schedule.dayOfWeek || null,
        schedule.dayOfMonth || null,
        schedule.intervalMinutes || null,
        schedule.trigger,
        schedule.idleMinutes || null,
        schedule.enabled !== false ? 1 : 0,
        schedule.nextRun || null,
        now,
        now
      );

      return {
        success: true,
        scheduleId: result.lastInsertRowid
      };
    } catch (error) {
      console.error('[SCHEDULE_DB] Error adding schedule:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update schedule
   */
  updateSchedule(id, updates) {
    try {
      const fields = [];
      const values = [];

      // Build dynamic update query
      const allowedFields = [
        'profile_id', 'frequency', 'time', 'day_of_week', 'day_of_month',
        'interval_minutes', 'trigger', 'idle_minutes', 'enabled', 'next_run'
      ];

      Object.keys(updates).forEach(key => {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (allowedFields.includes(dbKey)) {
          fields.push(`${dbKey} = ?`);
          values.push(updates[key]);
        }
      });

      if (fields.length === 0) {
        return { success: false, error: 'No valid fields to update' };
      }

      // Add updated_at
      fields.push('updated_at = ?');
      values.push(Date.now());

      // Add ID for WHERE clause
      values.push(id);

      const stmt = this.db.prepare(`
        UPDATE schedules
        SET ${fields.join(', ')}
        WHERE id = ?
      `);

      const result = stmt.run(...values);

      return {
        success: result.changes > 0,
        changes: result.changes
      };
    } catch (error) {
      console.error('[SCHEDULE_DB] Error updating schedule:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete schedule
   */
  deleteSchedule(id) {
    try {
      // Delete schedule logs first (foreign key constraint)
      const deleteLogsStmt = this.db.prepare('DELETE FROM schedule_logs WHERE schedule_id = ?');
      deleteLogsStmt.run(id);

      // Delete schedule
      const deleteStmt = this.db.prepare('DELETE FROM schedules WHERE id = ?');
      const result = deleteStmt.run(id);

      return {
        success: result.changes > 0,
        deleted: result.changes
      };
    } catch (error) {
      console.error('[SCHEDULE_DB] Error deleting schedule:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all schedules
   */
  getSchedules(enabledOnly = false) {
    try {
      let query = 'SELECT * FROM schedules';

      if (enabledOnly) {
        query += ' WHERE enabled = 1';
      }

      query += ' ORDER BY created_at DESC';

      const stmt = this.db.prepare(query);
      const rows = stmt.all();

      // Convert database rows to camelCase
      return rows.map(row => this.rowToSchedule(row));
    } catch (error) {
      console.error('[SCHEDULE_DB] Error getting schedules:', error);
      return [];
    }
  }

  /**
   * Get schedule by ID
   */
  getSchedule(id) {
    try {
      const stmt = this.db.prepare('SELECT * FROM schedules WHERE id = ?');
      const row = stmt.get(id);

      return row ? this.rowToSchedule(row) : null;
    } catch (error) {
      console.error('[SCHEDULE_DB] Error getting schedule:', error);
      return null;
    }
  }

  /**
   * Get upcoming schedules (next 24 hours)
   */
  getUpcomingSchedules() {
    try {
      const now = Date.now();
      const tomorrow = now + (24 * 60 * 60 * 1000);

      const stmt = this.db.prepare(`
        SELECT * FROM schedules
        WHERE enabled = 1
          AND next_run IS NOT NULL
          AND next_run <= ?
        ORDER BY next_run ASC
      `);

      const rows = stmt.all(tomorrow);
      return rows.map(row => this.rowToSchedule(row));
    } catch (error) {
      console.error('[SCHEDULE_DB] Error getting upcoming schedules:', error);
      return [];
    }
  }

  /**
   * Get schedules by profile
   */
  getSchedulesByProfile(profileId) {
    try {
      const stmt = this.db.prepare('SELECT * FROM schedules WHERE profile_id = ?');
      const rows = stmt.all(profileId);

      return rows.map(row => this.rowToSchedule(row));
    } catch (error) {
      console.error('[SCHEDULE_DB] Error getting schedules by profile:', error);
      return [];
    }
  }

  /**
   * Update last run time
   */
  updateLastRun(id, timestamp) {
    try {
      const stmt = this.db.prepare(`
        UPDATE schedules
        SET last_run = ?, updated_at = ?
        WHERE id = ?
      `);

      const result = stmt.run(timestamp, Date.now(), id);

      return {
        success: result.changes > 0
      };
    } catch (error) {
      console.error('[SCHEDULE_DB] Error updating last run:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update next run time
   */
  updateNextRun(id, timestamp) {
    try {
      const stmt = this.db.prepare(`
        UPDATE schedules
        SET next_run = ?, updated_at = ?
        WHERE id = ?
      `);

      const result = stmt.run(timestamp, Date.now(), id);

      return {
        success: result.changes > 0
      };
    } catch (error) {
      console.error('[SCHEDULE_DB] Error updating next run:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Toggle schedule enabled state
   */
  toggleSchedule(id, enabled) {
    try {
      const stmt = this.db.prepare(`
        UPDATE schedules
        SET enabled = ?, updated_at = ?
        WHERE id = ?
      `);

      const result = stmt.run(enabled ? 1 : 0, Date.now(), id);

      return {
        success: result.changes > 0,
        enabled: enabled
      };
    } catch (error) {
      console.error('[SCHEDULE_DB] Error toggling schedule:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Log schedule execution
   */
  logExecution(log) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO schedule_logs (
          schedule_id, profile_id, executed_at, success,
          space_saved_bytes, items_cleaned, duration_seconds,
          error_message, details
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        log.scheduleId,
        log.profileId,
        log.executedAt || Date.now(),
        log.success ? 1 : 0,
        log.spaceSavedBytes || 0,
        log.itemsCleaned || 0,
        log.durationSeconds || 0,
        log.errorMessage || null,
        log.details ? JSON.stringify(log.details) : null
      );

      return {
        success: true,
        logId: result.lastInsertRowid
      };
    } catch (error) {
      console.error('[SCHEDULE_DB] Error logging execution:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get schedule logs
   */
  getScheduleLogs(scheduleId, limit = 50) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM schedule_logs
        WHERE schedule_id = ?
        ORDER BY executed_at DESC
        LIMIT ?
      `);

      const rows = stmt.all(scheduleId, limit);

      return rows.map(row => ({
        id: row.id,
        scheduleId: row.schedule_id,
        profileId: row.profile_id,
        executedAt: row.executed_at,
        success: row.success === 1,
        spaceSavedBytes: row.space_saved_bytes,
        itemsCleaned: row.items_cleaned,
        durationSeconds: row.duration_seconds,
        errorMessage: row.error_message,
        details: row.details ? JSON.parse(row.details) : null
      }));
    } catch (error) {
      console.error('[SCHEDULE_DB] Error getting logs:', error);
      return [];
    }
  }

  /**
   * Get all recent logs
   */
  getRecentLogs(limit = 100) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM schedule_logs
        ORDER BY executed_at DESC
        LIMIT ?
      `);

      const rows = stmt.all(limit);

      return rows.map(row => ({
        id: row.id,
        scheduleId: row.schedule_id,
        profileId: row.profile_id,
        executedAt: row.executed_at,
        success: row.success === 1,
        spaceSavedBytes: row.space_saved_bytes,
        itemsCleaned: row.items_cleaned,
        durationSeconds: row.duration_seconds,
        errorMessage: row.error_message,
        details: row.details ? JSON.parse(row.details) : null
      }));
    } catch (error) {
      console.error('[SCHEDULE_DB] Error getting recent logs:', error);
      return [];
    }
  }

  /**
   * Get execution statistics
   */
  getExecutionStats(scheduleId = null) {
    try {
      let query = `
        SELECT
          COUNT(*) as total_executions,
          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_executions,
          SUM(space_saved_bytes) as total_space_saved,
          SUM(items_cleaned) as total_items_cleaned,
          AVG(duration_seconds) as avg_duration,
          MAX(executed_at) as last_execution
        FROM schedule_logs
      `;

      if (scheduleId) {
        query += ' WHERE schedule_id = ?';
      }

      const stmt = this.db.prepare(query);
      const stats = scheduleId ? stmt.get(scheduleId) : stmt.get();

      return {
        totalExecutions: stats.total_executions || 0,
        successfulExecutions: stats.successful_executions || 0,
        totalSpaceSaved: stats.total_space_saved || 0,
        totalItemsCleaned: stats.total_items_cleaned || 0,
        avgDuration: Math.round(stats.avg_duration || 0),
        lastExecution: stats.last_execution
      };
    } catch (error) {
      console.error('[SCHEDULE_DB] Error getting stats:', error);
      return {
        totalExecutions: 0,
        successfulExecutions: 0,
        totalSpaceSaved: 0,
        totalItemsCleaned: 0,
        avgDuration: 0,
        lastExecution: null
      };
    }
  }

  /**
   * Convert database row to schedule object
   */
  rowToSchedule(row) {
    return {
      id: row.id,
      profileId: row.profile_id,
      frequency: row.frequency,
      time: row.time,
      dayOfWeek: row.day_of_week,
      dayOfMonth: row.day_of_month,
      intervalMinutes: row.interval_minutes,
      trigger: row.trigger,
      idleMinutes: row.idle_minutes,
      enabled: row.enabled === 1,
      lastRun: row.last_run,
      nextRun: row.next_run,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      console.log('[SCHEDULE_DB] Closed');
    }
  }
}

module.exports = ScheduleDatabase;
