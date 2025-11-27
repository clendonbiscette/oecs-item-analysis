import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function fixGenderConstraint() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Drop the existing gender check constraint
    await client.query(`
      ALTER TABLE students
      DROP CONSTRAINT IF EXISTS students_gender_check;
    `);
    console.log('✓ Dropped old gender constraint');

    // Add new constraint that allows NULL or empty string
    await client.query(`
      ALTER TABLE students
      ADD CONSTRAINT students_gender_check
      CHECK (gender IS NULL OR gender = '' OR gender IN ('M', 'F'));
    `);
    console.log('✓ Added new gender constraint (allows NULL/empty)');

    console.log('\n✓ Gender constraint fixed successfully!');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixGenderConstraint();
