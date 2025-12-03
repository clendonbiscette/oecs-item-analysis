/**
 * Run DIF statistics migration on production database
 */
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres.kiwftkxmhrunhztbidjb:OecsAnalysis2025!SecurePass@aws-0-us-west-2.pooler.supabase.com:5432/postgres',
  max: 1,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Running DIF statistics migration on PRODUCTION...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '006_add_dif_statistics.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file:', migrationPath);
    console.log('\n📋 SQL to execute:');
    console.log('──────────────────────────────────────');
    console.log(migrationSQL);
    console.log('──────────────────────────────────────\n');

    // Execute migration
    console.log('⏳ Executing migration...');
    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');

    // Verify table was created
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'dif_statistics'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Verified: dif_statistics table exists');

      // Check table structure
      const columnsResult = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'dif_statistics'
        ORDER BY ordinal_position
      `);

      console.log('\n📊 Table structure:');
      columnsResult.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type}`);
      });

      // Check row count
      const countResult = await client.query('SELECT COUNT(*) FROM dif_statistics');
      console.log(`\n📈 Current row count: ${countResult.rows[0].count}`);

    } else {
      console.log('❌ ERROR: dif_statistics table was not created!');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
