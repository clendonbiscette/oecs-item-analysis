import { query } from './src/db.js';

/**
 * Reset Assessment Data
 * Deletes all assessments, students, responses, items, statistics, and audit logs
 * Preserves users and member_states
 */

async function resetAssessmentData() {
  console.log('\n🗑️  Resetting assessment data...\n');

  try {
    // Delete in correct order to respect foreign key constraints
    console.log('Deleting responses...');
    const responsesResult = await query('DELETE FROM responses');
    console.log(`  ✓ Deleted ${responsesResult.rowCount} responses`);

    console.log('Deleting statistics...');
    const statsResult = await query('DELETE FROM statistics');
    console.log(`  ✓ Deleted ${statsResult.rowCount} statistics records`);

    console.log('Deleting students...');
    const studentsResult = await query('DELETE FROM students');
    console.log(`  ✓ Deleted ${studentsResult.rowCount} students`);

    console.log('Deleting items...');
    const itemsResult = await query('DELETE FROM items');
    console.log(`  ✓ Deleted ${itemsResult.rowCount} items`);

    console.log('Deleting assessments...');
    const assessmentsResult = await query('DELETE FROM assessments');
    console.log(`  ✓ Deleted ${assessmentsResult.rowCount} assessments`);

    console.log('Deleting audit logs...');
    const auditResult = await query('DELETE FROM audit_logs');
    console.log(`  ✓ Deleted ${auditResult.rowCount} audit log entries`);

    // Reset sequences to start from 1
    console.log('\nResetting ID sequences...');
    await query('ALTER SEQUENCE assessments_id_seq RESTART WITH 1');
    await query('ALTER SEQUENCE students_id_seq RESTART WITH 1');
    await query('ALTER SEQUENCE items_id_seq RESTART WITH 1');
    await query('ALTER SEQUENCE responses_id_seq RESTART WITH 1');
    await query('ALTER SEQUENCE statistics_id_seq RESTART WITH 1');
    await query('ALTER SEQUENCE audit_logs_id_seq RESTART WITH 1');
    console.log('  ✓ All sequences reset to 1');

    console.log('\n✅ Assessment data reset complete!\n');
    console.log('Preserved:');
    console.log('  - Users');
    console.log('  - Member States');
    console.log('  - Database schema\n');

  } catch (error) {
    console.error('\n❌ Error resetting assessment data:', error);
    throw error;
  }
}

async function main() {
  try {
    await resetAssessmentData();
    process.exit(0);
  } catch (err) {
    console.error('Reset failed:', err);
    process.exit(1);
  }
}

main();
