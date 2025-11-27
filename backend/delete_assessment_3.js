import { query } from './src/db.js';

async function deleteAssessment3() {
  try {
    console.log('Deleting incomplete assessment ID 3...');

    // Delete students and their responses (cascade)
    await query('DELETE FROM students WHERE assessment_id = 3');
    console.log('✓ Deleted students and responses');

    // Delete items
    await query('DELETE FROM items WHERE assessment_id = 3');
    console.log('✓ Deleted items');

    // Delete assessment
    await query('DELETE FROM assessments WHERE id = 3');
    console.log('✓ Deleted assessment');

    console.log('\nCleanup complete. Ready to re-run split script.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deleteAssessment3();
