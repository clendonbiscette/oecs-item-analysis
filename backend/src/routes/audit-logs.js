import express from 'express';
import { query } from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);
router.use(adminOnly);

/**
 * GET /api/audit-logs
 * Get audit logs with filtering and pagination
 * Query params: userId, actionType, resourceType, startDate, endDate, limit, offset
 */
router.get('/', async (req, res) => {
  console.log('🔍 Audit logs list endpoint hit');
  try {
    const {
      userId,
      actionType,
      resourceType,
      status,
      startDate,
      endDate,
      limit = 100,
      offset = 0
    } = req.query;

    // Build WHERE clause
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (userId) {
      conditions.push(`al.user_id = $${paramIndex++}`);
      params.push(userId);
    }

    if (actionType) {
      conditions.push(`al.action_type = $${paramIndex++}`);
      params.push(actionType);
    }

    if (resourceType) {
      conditions.push(`al.resource_type = $${paramIndex++}`);
      params.push(resourceType);
    }

    if (status) {
      conditions.push(`al.status = $${paramIndex++}`);
      params.push(status);
    }

    if (startDate) {
      conditions.push(`al.created_at >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`al.created_at <= $${paramIndex++}`);
      params.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM audit_logs al ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get logs with user details
    params.push(limit, offset);
    const result = await query(
      `SELECT al.*,
              u.email as user_email,
              u.full_name as user_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    res.json({
      logs: result.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
      }
    });
  } catch (error) {
    console.error('Audit logs fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

/**
 * GET /api/audit-logs/stats
 * Get audit log statistics
 */
router.get('/stats', async (req, res) => {
  console.log('📈 Audit stats endpoint hit');
  try {
    const { startDate, endDate } = req.query;
    console.log('Query params:', { startDate, endDate });

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get statistics
    const [totalResult, actionTypesResult, statusResult, topUsersResult] = await Promise.all([
      // Total logs
      query(`SELECT COUNT(*) as total FROM audit_logs ${whereClause}`, params),

      // By action type
      query(`
        SELECT action_type, COUNT(*) as count
        FROM audit_logs
        ${whereClause}
        GROUP BY action_type
        ORDER BY count DESC
        LIMIT 10
      `, params),

      // By status
      query(`
        SELECT status, COUNT(*) as count
        FROM audit_logs
        ${whereClause}
        GROUP BY status
      `, params),

      // Top active users
      query(`
        SELECT al.user_id, u.full_name, u.email, COUNT(*) as action_count
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ${whereClause}
        GROUP BY al.user_id, u.full_name, u.email
        ORDER BY action_count DESC
        LIMIT 10
      `, params)
    ]);

    res.json({
      total: parseInt(totalResult.rows[0].total),
      byActionType: actionTypesResult.rows,
      byStatus: statusResult.rows,
      topUsers: topUsersResult.rows
    });
  } catch (error) {
    console.error('Audit stats error:', error);
    res.status(500).json({ error: 'Failed to fetch audit statistics' });
  }
});

/**
 * GET /api/audit-logs/:id
 * Get a specific audit log entry
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT al.*,
              u.email as user_email,
              u.full_name as user_name,
              u.role as user_role
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Audit log fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

/**
 * GET /api/audit-logs/export/csv
 * Export audit logs as CSV
 */
router.get('/export/csv', async (req, res) => {
  try {
    const { startDate, endDate, actionType, resourceType } = req.query;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (startDate) {
      conditions.push(`al.created_at >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`al.created_at <= $${paramIndex++}`);
      params.push(endDate);
    }

    if (actionType) {
      conditions.push(`al.action_type = $${paramIndex++}`);
      params.push(actionType);
    }

    if (resourceType) {
      conditions.push(`al.resource_type = $${paramIndex++}`);
      params.push(resourceType);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT al.id,
              al.created_at,
              u.email as user_email,
              u.full_name as user_name,
              al.action_type,
              al.resource_type,
              al.resource_id,
              al.description,
              al.ip_address,
              al.status
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC`,
      params
    );

    // Generate CSV
    const headers = ['ID', 'Timestamp', 'User Email', 'User Name', 'Action', 'Resource Type', 'Resource ID', 'Description', 'IP Address', 'Status'];
    const csvRows = [headers.join(',')];

    result.rows.forEach(row => {
      const values = [
        row.id,
        row.created_at,
        row.user_email || 'N/A',
        row.user_name || 'N/A',
        row.action_type,
        row.resource_type || '',
        row.resource_id || '',
        `"${row.description?.replace(/"/g, '""') || ''}"`,
        row.ip_address || '',
        row.status
      ];
      csvRows.push(values.join(','));
    });

    const csv = csvRows.join('\n');

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);

    // Log the export action
    await req.audit.log({
      actionType: 'export',
      resourceType: 'audit_logs',
      description: `Exported ${result.rows.length} audit log entries`
    });
  } catch (error) {
    console.error('Audit logs export error:', error);
    res.status(500).json({ error: 'Failed to export audit logs' });
  }
});

export default router;
