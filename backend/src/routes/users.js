import express from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(adminOnly);

/**
 * GET /api/users
 * List all users
 */
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.created_at, u.last_login, u.country_id,
              ms.state_name, ms.state_code
       FROM users u
       LEFT JOIN member_states ms ON u.country_id = ms.id
       ORDER BY u.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/users/:id
 * Get specific user details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.created_at, u.last_login, u.country_id,
              ms.state_name, ms.state_code
       FROM users u
       LEFT JOIN member_states ms ON u.country_id = ms.id
       WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * POST /api/users
 * Create new user
 */
router.post('/', async (req, res) => {
  try {
    const { email, password, fullName, role, countryId } = req.body;

    if (!email || !password || !fullName || !role) {
      return res.status(400).json({
        error: 'Email, password, full name, and role are required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters'
      });
    }

    // Validate role
    const validRoles = ['admin', 'national_coordinator', 'analyst'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: `Role must be one of: ${validRoles.join(', ')}`
      });
    }

    // National coordinators must have a country
    if (role === 'national_coordinator' && !countryId) {
      return res.status(400).json({
        error: 'National coordinators must be assigned to a country'
      });
    }

    // Check if user already exists
    const existing = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, role, country_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, role, country_id, created_at`,
      [email.toLowerCase(), passwordHash, fullName, role, countryId || null]
    );

    res.status(201).json({
      message: 'User created successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * PUT /api/users/:id
 * Update user details
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, fullName, role, countryId, isActive } = req.body;

    // Validate role if provided
    if (role) {
      const validRoles = ['admin', 'national_coordinator', 'analyst'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          error: `Role must be one of: ${validRoles.join(', ')}`
        });
      }

      // National coordinators must have a country
      if (role === 'national_coordinator' && !countryId) {
        return res.status(400).json({
          error: 'National coordinators must be assigned to a country'
        });
      }
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (email) {
      updates.push(`email = $${paramCount++}`);
      values.push(email.toLowerCase());
    }
    if (fullName) {
      updates.push(`full_name = $${paramCount++}`);
      values.push(fullName);
    }
    if (role) {
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }
    if (countryId !== undefined) {
      updates.push(`country_id = $${paramCount++}`);
      values.push(countryId || null);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(isActive);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    const result = await query(
      `UPDATE users
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, email, full_name, role, country_id, is_active`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * PUT /api/users/:id/password
 * Update user password
 */
router.put('/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters'
      });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const result = await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id',
      [passwordHash, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

/**
 * DELETE /api/users/:id
 * Delete user (soft delete by setting is_active = false)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting self
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await query(
      'UPDATE users SET is_active = false WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

/**
 * DELETE /api/users/:id/permanent
 * Permanently delete user from database (hard delete)
 * Only works on users who are already deactivated (is_active = false)
 */
router.delete('/:id/permanent', async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting self
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if user exists and is already inactive
    const userCheck = await query(
      'SELECT id, is_active, email FROM users WHERE id = $1',
      [id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userCheck.rows[0];

    // Only allow permanent deletion of inactive users
    if (user.is_active) {
      return res.status(400).json({
        error: 'User must be deactivated first before permanent deletion'
      });
    }

    // Set uploaded_by to NULL for any assessments they uploaded
    // This maintains referential integrity
    await query(
      'UPDATE assessments SET uploaded_by = NULL WHERE uploaded_by = $1',
      [id]
    );

    // Set user_id to NULL in audit logs to maintain audit trail
    // We keep the logs but disassociate them from the deleted user
    await query(
      'UPDATE audit_logs SET user_id = NULL WHERE user_id = $1',
      [id]
    );

    // Permanently delete the user
    await query('DELETE FROM users WHERE id = $1', [id]);

    // Log audit trail
    await req.audit.log({
      userId: req.user.id,
      actionType: 'delete',
      resourceType: 'user',
      resourceId: id,
      description: `Permanently deleted user: ${user.email}`,
      changes: { deleted_user_email: user.email }
    });

    res.json({
      message: 'User permanently deleted successfully',
      email: user.email
    });
  } catch (error) {
    console.error('Error permanently deleting user:', error);
    res.status(500).json({ error: 'Failed to permanently delete user' });
  }
});

export default router;
