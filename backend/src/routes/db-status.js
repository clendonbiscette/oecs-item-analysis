import express from 'express';
import { query } from '../db.js';

const router = express.Router();

/**
 * GET /api/db-status
 * Check database connection and table existence
 * Useful for debugging deployment issues
 */
router.get('/', async (req, res) => {
  try {
    const results = {
      connected: false,
      tables: {},
      timestamp: new Date().toISOString()
    };

    // Test connection
    try {
      await query('SELECT NOW()', []);
      results.connected = true;
    } catch (error) {
      return res.status(500).json({
        ...results,
        error: 'Database connection failed',
        message: error.message
      });
    }

    // Check each required table
    const requiredTables = [
      'member_states',
      'users',
      'assessments',
      'items',
      'students',
      'responses',
      'statistics',
      'audit_logs'
    ];

    for (const tableName of requiredTables) {
      try {
        const result = await query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = $1
          )`,
          [tableName]
        );

        const exists = result.rows[0].exists;
        results.tables[tableName] = { exists };

        // If table exists, get row count
        if (exists) {
          try {
            const countResult = await query(`SELECT COUNT(*) as count FROM ${tableName}`, []);
            results.tables[tableName].count = parseInt(countResult.rows[0].count);
          } catch (err) {
            results.tables[tableName].count = 'error';
          }
        }
      } catch (error) {
        results.tables[tableName] = {
          exists: false,
          error: error.message
        };
      }
    }

    // Check for missing tables
    const missingTables = requiredTables.filter(
      table => !results.tables[table]?.exists
    );

    if (missingTables.length > 0) {
      return res.status(500).json({
        ...results,
        status: 'incomplete',
        missingTables,
        message: `Database schema incomplete. Missing tables: ${missingTables.join(', ')}`,
        solution: 'Run the database schema setup: psql $DATABASE_URL < backend/schema.sql'
      });
    }

    res.json({
      ...results,
      status: 'ok',
      message: 'Database is properly configured'
    });

  } catch (error) {
    console.error('Database status check error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to check database status',
      message: error.message
    });
  }
});

export default router;
