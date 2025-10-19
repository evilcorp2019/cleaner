const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const fs = require('fs');

let db = null;

/**
 * Initialize the database
 */
function initDatabase() {
  if (db) return db;

  try {
    // Get user data directory
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'cleaner-history.db');

    // Create database
    db = new Database(dbPath);

    // Enable WAL mode for better concurrent access
    db.pragma('journal_mode = WAL');

    // Create tables
    createTables();

    console.log('[DATABASE] Initialized at:', dbPath);
    return db;
  } catch (error) {
    console.error('[DATABASE] Failed to initialize:', error);
    throw error;
  }
}

/**
 * Create database tables
 */
function createTables() {
  const createCleaningHistoryTable = `
    CREATE TABLE IF NOT EXISTS cleaning_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      browsers_cleaned TEXT NOT NULL,
      data_types TEXT NOT NULL,
      space_saved_bytes INTEGER NOT NULL,
      space_saved_formatted TEXT NOT NULL,
      items_cleaned INTEGER NOT NULL,
      items_failed INTEGER DEFAULT 0,
      privacy_score_before INTEGER,
      privacy_score_after INTEGER,
      trackers_removed INTEGER DEFAULT 0,
      notes TEXT
    );
  `;

  const createIndexes = `
    CREATE INDEX IF NOT EXISTS idx_timestamp ON cleaning_history(timestamp DESC);
  `;

  try {
    db.exec(createCleaningHistoryTable);
    db.exec(createIndexes);
    console.log('[DATABASE] Tables created successfully');
  } catch (error) {
    console.error('[DATABASE] Failed to create tables:', error);
    throw error;
  }
}

/**
 * Add a cleaning event to history
 * @param {Object} event - Cleaning event data
 * @returns {Object} - Insert result
 */
function addCleaningEvent(event) {
  try {
    const stmt = db.prepare(`
      INSERT INTO cleaning_history (
        timestamp,
        browsers_cleaned,
        data_types,
        space_saved_bytes,
        space_saved_formatted,
        items_cleaned,
        items_failed,
        privacy_score_before,
        privacy_score_after,
        trackers_removed,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      event.timestamp || Date.now(),
      JSON.stringify(event.browsersСleaned || []),
      JSON.stringify(event.dataTypes || []),
      event.spaceSavedBytes || 0,
      event.spaceSavedFormatted || '0 Bytes',
      event.itemsCleaned || 0,
      event.itemsFailed || 0,
      event.privacyScoreBefore || null,
      event.privacyScoreAfter || null,
      event.trackersRemoved || 0,
      event.notes || null
    );

    return {
      success: true,
      id: result.lastInsertRowid
    };
  } catch (error) {
    console.error('[DATABASE] Failed to add cleaning event:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get cleaning history with pagination
 * @param {Object} options - Query options
 * @returns {Array} - Cleaning events
 */
function getCleaningHistory(options = {}) {
  try {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const stmt = db.prepare(`
      SELECT * FROM cleaning_history
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(limit, offset);

    // Parse JSON fields
    const events = rows.map(row => ({
      ...row,
      browsersСleaned: JSON.parse(row.browsers_cleaned),
      dataTypes: JSON.parse(row.data_types),
      date: new Date(row.timestamp)
    }));

    return events;
  } catch (error) {
    console.error('[DATABASE] Failed to get cleaning history:', error);
    return [];
  }
}

/**
 * Get cleaning statistics
 * @returns {Object} - Statistics
 */
function getCleaningStats() {
  try {
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total_cleanings,
        SUM(space_saved_bytes) as total_space_saved,
        SUM(items_cleaned) as total_items_cleaned,
        SUM(trackers_removed) as total_trackers_removed,
        MAX(timestamp) as last_cleaning,
        AVG(privacy_score_after - privacy_score_before) as avg_privacy_improvement
      FROM cleaning_history
    `);

    const stats = stmt.get();

    return {
      totalCleanings: stats.total_cleanings || 0,
      totalSpaceSaved: stats.total_space_saved || 0,
      totalItemsCleaned: stats.total_items_cleaned || 0,
      totalTrackersRemoved: stats.total_trackers_removed || 0,
      lastCleaning: stats.last_cleaning ? new Date(stats.last_cleaning) : null,
      avgPrivacyImprovement: Math.round(stats.avg_privacy_improvement || 0)
    };
  } catch (error) {
    console.error('[DATABASE] Failed to get stats:', error);
    return {
      totalCleanings: 0,
      totalSpaceSaved: 0,
      totalItemsCleaned: 0,
      totalTrackersRemoved: 0,
      lastCleaning: null,
      avgPrivacyImprovement: 0
    };
  }
}

/**
 * Delete a cleaning event
 * @param {number} id - Event ID
 * @returns {Object} - Delete result
 */
function deleteCleaningEvent(id) {
  try {
    const stmt = db.prepare('DELETE FROM cleaning_history WHERE id = ?');
    const result = stmt.run(id);

    return {
      success: result.changes > 0,
      deleted: result.changes
    };
  } catch (error) {
    console.error('[DATABASE] Failed to delete event:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Clear all cleaning history
 * @returns {Object} - Clear result
 */
function clearCleaningHistory() {
  try {
    const stmt = db.prepare('DELETE FROM cleaning_history');
    const result = stmt.run();

    return {
      success: true,
      deleted: result.changes
    };
  } catch (error) {
    console.error('[DATABASE] Failed to clear history:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Export cleaning history to CSV
 * @returns {string} - CSV data
 */
function exportHistoryToCSV() {
  try {
    const events = getCleaningHistory({ limit: 10000 });

    const headers = [
      'Date',
      'Browsers',
      'Data Types',
      'Space Saved',
      'Items Cleaned',
      'Privacy Score Before',
      'Privacy Score After',
      'Trackers Removed'
    ];

    const rows = events.map(event => [
      event.date.toISOString(),
      event.browsersСleaned.join(', '),
      event.dataTypes.join(', '),
      event.space_saved_formatted,
      event.items_cleaned,
      event.privacy_score_before || 'N/A',
      event.privacy_score_after || 'N/A',
      event.trackers_removed
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csv;
  } catch (error) {
    console.error('[DATABASE] Failed to export to CSV:', error);
    throw error;
  }
}

/**
 * Close database connection
 */
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('[DATABASE] Closed');
  }
}

module.exports = {
  initDatabase,
  addCleaningEvent,
  getCleaningHistory,
  getCleaningStats,
  deleteCleaningEvent,
  clearCleaningHistory,
  exportHistoryToCSV,
  closeDatabase
};
