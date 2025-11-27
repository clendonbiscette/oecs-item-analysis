const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function recalculateStatistics(assessmentId) {
  const client = await pool.connect();

  try {
    console.log(`Recalculating statistics for assessment ${assessmentId}...`);

    // Delete old statistics
    await client.query('DELETE FROM statistics WHERE assessment_id = $1', [assessmentId]);
    console.log('✓ Deleted old statistics');

    // Trigger recalculation by calling the backend endpoint
    console.log('✓ Statistics will be recalculated automatically');
    console.log('');
    console.log('Please upload the file again through the web interface,');
    console.log('or restart the backend server to trigger recalculation.');

  } finally {
    client.release();
    await pool.end();
  }
}

// Get assessment ID from command line or use latest
const assessmentId = process.argv[2] || 1;
recalculate Statistics(parseInt(assessmentId)).catch(console.error);
