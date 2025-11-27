import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function createDatabase() {
  // Get password from environment or use default
  const pgPassword = process.env.POSTGRES_PASSWORD || 'postgres';

  console.log('Attempting to connect to PostgreSQL...');
  console.log('If authentication fails, set POSTGRES_PASSWORD environment variable');

  // Connect to default postgres database
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: pgPassword,
    database: 'postgres'
  });

  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL');

    // Check if database exists
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname='oecs_analysis'"
    );

    if (result.rows.length === 0) {
      // Create database
      await client.query('CREATE DATABASE oecs_analysis');
      console.log('✓ Database "oecs_analysis" created successfully');
    } else {
      console.log('✓ Database "oecs_analysis" already exists');
    }

    console.log('\nNext step: Run "npm run setup" to create tables');

  } catch (error) {
    console.error('Error creating database:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createDatabase();
