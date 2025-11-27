import { query } from './src/db.js';

async function deleteIncompleteAssessment() {
  try {
    console.log('Deleting incomplete assessment ID 2...');

    // Delete students (responses will be deleted by cascade if any exist)
    await query('DELETE FROM students WHERE assessment_id = 2');
    console.log('✓ Deleted students');

    // Delete items
    await query('DELETE FROM items WHERE assessment_id = 2');
    console.log('✓ Deleted items');

    // Delete assessment
    await query('DELETE FROM assessments WHERE id = 2');
    console.log('✓ Deleted assessment');

    console.log('\nCleanup complete. Ready to re-run split script.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deleteIncompleteAssessment();
