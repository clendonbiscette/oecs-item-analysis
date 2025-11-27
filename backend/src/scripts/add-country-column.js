import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function addCountryColumn() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Add country column to students table
    await client.query(`
      ALTER TABLE students
      ADD COLUMN IF NOT EXISTS country VARCHAR(100);
    `);
    console.log('✓ Added country column to students table');

    // Also update assessments table to support "Regional"
    await client.query(`
      ALTER TABLE assessments
      ALTER COLUMN country DROP NOT NULL;
    `);
    console.log('✓ Made country optional in assessments table');

    console.log('\n✓ Database schema updated successfully!');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addCountryColumn();
