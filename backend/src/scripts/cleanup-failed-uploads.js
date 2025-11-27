import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function cleanupFailedUploads() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Check current data
    const assessmentsResult = await client.query('SELECT id, name FROM assessments');
    console.log(`\nFound ${assessmentsResult.rows.length} assessments:`);
    assessmentsResult.rows.forEach(a => console.log(`  - ID ${a.id}: ${a.name}`));

    const studentsResult = await client.query('SELECT COUNT(*) as count FROM students');
    console.log(`Found ${studentsResult.rows[0].count} students`);

    const itemsResult = await client.query('SELECT COUNT(*) as count FROM items');
    console.log(`Found ${itemsResult.rows[0].count} items`);

    const responsesResult = await client.query('SELECT COUNT(*) as count FROM responses');
    console.log(`Found ${responsesResult.rows[0].count} responses`);

    // Check gender constraint
    const constraintResult = await client.query(`
      SELECT conname, pg_get_constraintdef(oid)
      FROM pg_constraint
      WHERE conname = 'students_gender_check'
    `);

    if (constraintResult.rows.length > 0) {
      console.log('\nGender constraint:');
      console.log(`  ${constraintResult.rows[0].pg_get_constraintdef}`);
    } else {
      console.log('\n⚠️  No gender constraint found!');
    }

    // Delete all assessment data (cascade will delete students, items, responses, statistics)
    if (assessmentsResult.rows.length > 0) {
      console.log('\nDeleting all assessments and related data...');
      await client.query('DELETE FROM assessments');
      console.log('✓ All data cleaned up');
    }

    // Reset sequences
    await client.query(`SELECT setval('assessments_id_seq', 1, false)`);
    await client.query(`SELECT setval('students_id_seq', 1, false)`);
    await client.query(`SELECT setval('items_id_seq', 1, false)`);
    await client.query(`SELECT setval('responses_id_seq', 1, false)`);
    console.log('✓ Reset ID sequences');

    console.log('\n✓ Database cleaned and ready for new upload!');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

cleanupFailedUploads();
