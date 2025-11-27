import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Client } = pg;

async function setup() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    console.log('✓ Connected to database');
    
    // Read schema file
    const schemaPath = join(__dirname, '../../schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    
    // Execute schema
    await client.query(schema);
    console.log('✓ Database schema created successfully');
    
    console.log('\nDatabase setup complete!');
    console.log('Next step: Run "npm run seed" to create an admin user');
    
  } catch (error) {
    console.error('Setup error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setup();
