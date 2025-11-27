import { query } from '../db.js';

async function purgeAssessments() {
  try {
    console.log('Deleting all assessments and related data...');

    // Delete all assessments (cascades to all related tables)
    await query('DELETE FROM assessments');

    // Reset all ID sequences to start at 1
    await query('ALTER SEQUENCE assessments_id_seq RESTART WITH 1');
    await query('ALTER SEQUENCE items_id_seq RESTART WITH 1');
    await query('ALTER SEQUENCE students_id_seq RESTART WITH 1');
    await query('ALTER SEQUENCE responses_id_seq RESTART WITH 1');
    await query('ALTER SEQUENCE statistics_id_seq RESTART WITH 1');

    console.log('✓ All assessments deleted successfully');
    console.log('✓ ID sequences reset to 1');

    process.exit(0);
  } catch (error) {
    console.error('Purge error:', error);
    process.exit(1);
  }
}

purgeAssessments();
