const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function getAllStats() {
  const client = await pool.connect();
  try {
    const assessment = await client.query('SELECT * FROM assessments ORDER BY id DESC LIMIT 1');
    const assessmentId = assessment.rows[0].id;

    console.log('='.repeat(80));
    console.log('PLATFORM STATISTICS COMPARISON REPORT');
    console.log('='.repeat(80));
    console.log(`Assessment: ${assessment.rows[0].name}`);
    console.log(`Students: ${assessment.rows[0].student_count}`);
    console.log(`Items: ${assessment.rows[0].item_count}`);
    console.log('='.repeat(80));

    // Get test-level statistics
    const testStats = await client.query(
      'SELECT stat_type, stat_value FROM statistics WHERE assessment_id = $1 AND item_id IS NULL ORDER BY stat_type',
      [assessmentId]
    );

    console.log('\n--- TEST-LEVEL STATISTICS ---');
    console.log('Statistic              | Platform Value | Excel Value | Difference');
    console.log('-'.repeat(70));

    const statsMap = {};
    testStats.rows.forEach(row => {
      statsMap[row.stat_type] = parseFloat(row.stat_value);
    });

    console.log(`Mean                   | ${statsMap.mean?.toFixed(4) || 'N/A'}         | [FILL IN]   | `);
    console.log(`Median                 | ${statsMap.median?.toFixed(4) || 'N/A'}         | [FILL IN]   | `);
    console.log(`Std Deviation          | ${statsMap.stdev?.toFixed(4) || 'N/A'}         | [FILL IN]   | `);
    console.log(`Min                    | ${statsMap.min?.toFixed(4) || 'N/A'}          | [FILL IN]   | `);
    console.log(`Max                    | ${statsMap.max?.toFixed(4) || 'N/A'}         | [FILL IN]   | `);
    console.log(`Cronbach's Alpha       | ${statsMap.cronbach_alpha?.toFixed(4) || 'N/A'}         | [FILL IN]   | `);
    console.log(`SEM                    | ${statsMap.sem?.toFixed(4) || 'N/A'}         | [FILL IN]   | `);
    console.log(`N (students)           | ${statsMap.n?.toFixed(0) || 'N/A'}         | [FILL IN]   | `);

    // Get all item statistics
    const itemStats = await client.query(
      `SELECT i.item_code, s.stat_type, s.stat_value
       FROM statistics s
       JOIN items i ON s.item_id = i.id
       WHERE s.assessment_id = $1 AND s.item_id IS NOT NULL
       ORDER BY i.item_code, s.stat_type`,
      [assessmentId]
    );

    // Organize by item
    const items = {};
    itemStats.rows.forEach(row => {
      if (!items[row.item_code]) {
        items[row.item_code] = {};
      }
      items[row.item_code][row.stat_type] = parseFloat(row.stat_value);
    });

    console.log('\n--- ITEM-LEVEL STATISTICS ---');
    console.log('Item | Difficulty | Discrimination | Point-Biserial');
    console.log('-'.repeat(70));

    Object.keys(items).sort((a, b) => {
      const aNum = parseInt(a.replace('Q', ''));
      const bNum = parseInt(b.replace('Q', ''));
      return aNum - bNum;
    }).forEach(item => {
      const stats = items[item];
      const diff = stats.difficulty?.toFixed(4) || 'N/A';
      const disc = stats.discrimination?.toFixed(4) || 'N/A';
      const pb = stats.point_biserial?.toFixed(4) || 'N/A';
      console.log(`${item.padEnd(4)} | ${diff.padStart(10)} | ${disc.padStart(14)} | ${pb.padStart(14)}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('INSTRUCTIONS:');
    console.log('1. Open: docs/2025 OERA Item Analysis_LATEST.xlsx');
    console.log('2. Find the corresponding statistics in the Excel file');
    console.log('3. Fill in the "Excel Value" column above');
    console.log('4. Calculate differences (Platform - Excel)');
    console.log('5. All differences should be within ±0.001 tolerance');
    console.log('='.repeat(80));

  } finally {
    client.release();
    await pool.end();
  }
}

getAllStats().catch(console.error);
