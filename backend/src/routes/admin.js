import express from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { sendApprovalEmail, sendRejectionEmail } from '../services/emailService.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authMiddleware);

/**
 * Middleware to check if user is admin
 */
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

router.use(requireAdmin);

/**
 * GET /api/admin/pending-users
 * Get list of users pending approval
 */
router.get('/pending-users', async (req, res) => {
  try {
    const result = await query(
      `SELECT
        u.id,
        u.email,
        u.full_name,
        u.role,
        u.country_id,
        ms.state_name as country_name,
        ms.state_code as country_code,
        u.access_justification,
        u.created_at,
        u.registration_status
       FROM users u
       LEFT JOIN member_states ms ON u.country_id = ms.id
       WHERE u.registration_status = 'pending_approval'
       ORDER BY u.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pending users:', error);
    res.status(500).json({ error: 'Failed to fetch pending users' });
  }
});

/**
 * POST /api/admin/approve-user/:id
 * Approve a pending user registration
 */
router.post('/approve-user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { role: overrideRole, countryId: overrideCountryId } = req.body;

    // Get user details
    const userResult = await query(
      `SELECT
        u.id,
        u.email,
        u.full_name,
        u.role,
        u.country_id,
        u.registration_status,
        ms.state_name as country_name
       FROM users u
       LEFT JOIN member_states ms ON u.country_id = ms.id
       WHERE u.id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Check if user is pending approval
    if (user.registration_status !== 'pending_approval') {
      return res.status(400).json({
        error: `User is not pending approval. Current status: ${user.registration_status}`
      });
    }

    // Determine final role and country (use override if provided, otherwise keep user's selection)
    const finalRole = overrideRole || user.role;
    const finalCountryId = overrideCountryId !== undefined ? overrideCountryId : user.country_id;

    // Get final country name if country was changed
    let finalCountryName = user.country_name;
    if (overrideCountryId !== undefined && overrideCountryId !== null) {
      const countryResult = await query(
        'SELECT state_name FROM member_states WHERE id = $1',
        [overrideCountryId]
      );
      if (countryResult.rows.length > 0) {
        finalCountryName = countryResult.rows[0].state_name;
      }
    }

    // Update user: activate account, set status to approved
    await query(
      `UPDATE users
       SET is_active = TRUE,
           registration_status = 'approved',
           role = $1,
           country_id = $2,
           approved_by = $3,
           approved_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [finalRole, finalCountryId, req.user.id, id]
    );

    // Send approval email
    await sendApprovalEmail({
      to: user.email,
      fullName: user.full_name,
      role: finalRole,
      country: finalCountryName
    });

    // Log the approval
    await req.audit.log({
      actionType: 'user_approval',
      resourceType: 'user',
      resourceId: id,
      description: `Approved user registration for ${user.email} (role: ${finalRole}${finalCountryName ? `, country: ${finalCountryName}` : ''})`,
      status: 'success'
    });

    res.json({
      success: true,
      message: `User ${user.email} approved successfully`,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: finalRole,
        country: finalCountryName
      }
    });

  } catch (error) {
    console.error('Error approving user:', error);
    res.status(500).json({ error: 'Failed to approve user' });
  }
});

/**
 * POST /api/admin/reject-user/:id
 * Reject a pending user registration
 */
router.post('/reject-user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    // Get user details
    const userResult = await query(
      `SELECT id, email, full_name, registration_status
       FROM users
       WHERE id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Check if user is pending approval
    if (user.registration_status !== 'pending_approval') {
      return res.status(400).json({
        error: `User is not pending approval. Current status: ${user.registration_status}`
      });
    }

    // Update user: set status to rejected, record reason
    await query(
      `UPDATE users
       SET registration_status = 'rejected',
           rejected_reason = $1,
           approved_by = $2,
           approved_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [reason, req.user.id, id]
    );

    // Send rejection email
    await sendRejectionEmail({
      to: user.email,
      fullName: user.full_name,
      reason
    });

    // Log the rejection
    await req.audit.log({
      actionType: 'user_rejection',
      resourceType: 'user',
      resourceId: id,
      description: `Rejected user registration for ${user.email}`,
      status: 'success',
      errorMessage: reason
    });

    res.json({
      success: true,
      message: `User ${user.email} rejected`,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name
      }
    });

  } catch (error) {
    console.error('Error rejecting user:', error);
    res.status(500).json({ error: 'Failed to reject user' });
  }
});

/**
 * GET /api/admin/registration-stats
 * Get registration statistics
 */
router.get('/registration-stats', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        registration_status,
        COUNT(*) as count
      FROM users
      WHERE registration_status IN ('pending_verification', 'pending_approval', 'approved', 'rejected')
      GROUP BY registration_status
    `);

    const stats = {
      pending_verification: 0,
      pending_approval: 0,
      approved: 0,
      rejected: 0
    };

    result.rows.forEach(row => {
      stats[row.registration_status] = parseInt(row.count);
    });

    res.json(stats);
  } catch (error) {
    console.error('Error fetching registration stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
