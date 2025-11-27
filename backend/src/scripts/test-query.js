import { query } from '../db.js';

async function testQuery() {
  try {
    console.log('Testing the exact query used in the API...\n');

    const result = await query(
      `SELECT i.id, i.item_code, i.correct_answer,
              s.stat_type, s.stat_value
       FROM items i
       LEFT JOIN statistics s ON s.item_id = i.id
       WHERE i.assessment_id = $1
       ORDER BY i.item_code, s.stat_type`,
      [1]
    );

    console.log(`Query returned ${result.rows.length} rows\n`);

    // Show first 10 rows
    console.log('First 10 rows:');
    result.rows.slice(0, 10).forEach((row, idx) => {
      console.log(`${idx + 1}. Item ${row.item_code} (ID ${row.id}): ${row.stat_type} = ${row.stat_value}`);
    });

    // Group by item
    const byItem = {};
    result.rows.forEach(row => {
      if (!byItem[row.item_code]) {
        byItem[row.item_code] = { stats: [] };
      }
      if (row.stat_type) {
        byItem[row.item_code].stats.push(row.stat_type);
      }
    });

    console.log('\n\nStats per item:');
    Object.entries(byItem).forEach(([itemCode, data]) => {
      console.log(`  ${itemCode}: ${data.stats.length} stats (${data.stats.join(', ')})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testQuery();
