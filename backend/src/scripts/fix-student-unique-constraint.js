import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function fixStudentUniqueConstraint() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Check current constraints
    const constraintResult = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'students'::regclass
      AND contype = 'u'
    `);

    console.log('\nCurrent unique constraints on students table:');
    constraintResult.rows.forEach(row => {
      console.log(`  ${row.conname}: ${row.definition}`);
    });

    // Drop the old constraint (assessment_id, student_code)
    await client.query(`
      ALTER TABLE students
      DROP CONSTRAINT IF EXISTS students_assessment_id_student_code_key;
    `);
    console.log('\n✓ Dropped old constraint (assessment_id, student_code)');

    // Add new constraint (assessment_id, student_code, country)
    // This allows same student ID across different countries in regional assessments
    await client.query(`
      ALTER TABLE students
      ADD CONSTRAINT students_assessment_id_student_code_country_key
      UNIQUE (assessment_id, student_code, country);
    `);
    console.log('✓ Added new constraint (assessment_id, student_code, country)');

    // Verify new constraint
    const newConstraintResult = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'students'::regclass
      AND contype = 'u'
    `);

    console.log('\nNew unique constraints on students table:');
    newConstraintResult.rows.forEach(row => {
      console.log(`  ${row.conname}: ${row.definition}`);
    });

    console.log('\n✓ Student unique constraint updated successfully!');
    console.log('  Students can now have the same ID across different countries in regional assessments');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixStudentUniqueConstraint();
