import { query } from './src/db.js';

async function listAssessments() {
  try {
    const result = await query(`
      SELECT id, name, assessment_year, country_id, student_count
      FROM assessments
      ORDER BY id
    `);

    console.log('\nAll Assessments in Database:\n');
    result.rows.forEach(row => {
      console.log(`ID ${row.id}: ${row.name}`);
      console.log(`  Country ID: ${row.country_id || 'null (Regional)'}`);
      console.log(`  Year: ${row.assessment_year}`);
      console.log(`  Students: ${row.student_count}`);
      console.log('');
    });

    console.log(`Total: ${result.rows.length} assessments`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listAssessments();
