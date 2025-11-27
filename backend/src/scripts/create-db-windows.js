import pg from 'pg';

const { Client } = pg;

async function createDatabase() {
  console.log('Attempting to connect to PostgreSQL using Windows authentication...');

  // Connect to default postgres database using Windows trusted connection
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    database: 'postgres'
    // No password - rely on Windows authentication
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

    // Set password for postgres user for application use
    await client.query("ALTER USER postgres PASSWORD 'postgres123'");
    console.log('✓ Set postgres password to: postgres123');

    console.log('\nNext step: Run "npm run setup" to create tables');

  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nPlease try one of these solutions:');
    console.log('1. Open pgAdmin and reset the postgres password');
    console.log('2. Or use Windows Command Prompt as Administrator:');
    console.log('   psql -U postgres');
    console.log('   ALTER USER postgres PASSWORD \'postgres123\';');
    process.exit(1);
  } finally {
    await client.end();
  }
}

createDatabase();
