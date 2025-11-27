import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getClient } from './src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function splitSQL(sql) {
  // Remove comments
  const lines = sql.split('\n').filter(line => !line.trim().startsWith('--'));
  const cleanSQL = lines.join('\n');

  // Split by semicolons, but be smart about it
  const statements = [];
  let current = '';
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < cleanSQL.length; i++) {
    const char = cleanSQL[i];
    const prevChar = i > 0 ? cleanSQL[i - 1] : '';

    // Handle string literals
    if ((char === "'" || char === '"') && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
    }

    // Split on semicolon if not in string
    if (char === ';' && !inString) {
      const stmt = current.trim();
      if (stmt.length > 0) {
        statements.push(stmt);
      }
      current = '';
    } else {
      current += char;
    }
  }

  // Add last statement if exists
  const lastStmt = current.trim();
  if (lastStmt.length > 0) {
    statements.push(lastStmt);
  }

  return statements;
}

async function runMigration(migrationFile) {
  const client = await getClient();

  try {
    console.log(`Running migration: ${migrationFile}`);

    const migrationPath = path.join(__dirname, 'migrations', migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Split into individual statements
    const statements = splitSQL(sql);

    console.log(`Found ${statements.length} statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      await client.query(statement);
    }

    console.log(`✓ Migration ${migrationFile} completed successfully`);
  } catch (error) {
    console.error(`✗ Migration ${migrationFile} failed:`, error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2] || '001_add_member_states.sql';

runMigration(migrationFile)
  .then(() => {
    console.log('All migrations completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
