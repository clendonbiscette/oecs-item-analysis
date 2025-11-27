import express from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/member-states
 * Get all OECS member states
 */
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, state_code, state_name, is_active, created_at
       FROM member_states
       WHERE is_active = TRUE
       ORDER BY state_name`,
      []
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching member states:', error);
    res.status(500).json({ error: 'Failed to fetch member states' });
  }
});

/**
 * GET /api/member-states/:id
 * Get a specific member state by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT id, state_code, state_name, is_active, created_at
       FROM member_states
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member state not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching member state:', error);
    res.status(500).json({ error: 'Failed to fetch member state' });
  }
});

/**
 * GET /api/member-states/:id/assessments
 * Get all assessments for a specific member state
 */
router.get('/:id/assessments', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT a.id, a.name, a.assessment_year, a.upload_date, a.status,
              a.student_count, a.item_count, ms.state_name, ms.state_code
       FROM assessments a
       JOIN member_states ms ON a.country_id = ms.id
       WHERE a.country_id = $1
       ORDER BY a.assessment_year DESC, a.upload_date DESC`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching assessments for member state:', error);
    res.status(500).json({ error: 'Failed to fetch assessments' });
  }
});

export default router;
