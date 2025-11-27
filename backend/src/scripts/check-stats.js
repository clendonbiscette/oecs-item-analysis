import { query } from '../db.js';

async function checkStats() {
  try {
    console.log('Checking statistics in database...\n');

    // Check test-level stats
    const testStats = await query(
      'SELECT * FROM statistics WHERE assessment_id = 1 AND item_id IS NULL'
    );
    console.log(`Test-level statistics: ${testStats.rows.length} rows`);
    testStats.rows.forEach(row => {
      console.log(`  - ${row.stat_type}: ${row.stat_value}`);
    });

    // Check item-level stats
    const itemStats = await query(
      'SELECT * FROM statistics WHERE assessment_id = 1 AND item_id IS NOT NULL ORDER BY item_id, stat_type'
    );
    console.log(`\nItem-level statistics: ${itemStats.rows.length} rows`);

    // Group by item
    const byItem = {};
    itemStats.rows.forEach(row => {
      if (!byItem[row.item_id]) {
        byItem[row.item_id] = [];
      }
      byItem[row.item_id].push(`${row.stat_type}: ${row.stat_value}`);
    });

    Object.entries(byItem).forEach(([itemId, stats]) => {
      console.log(`\n  Item ID ${itemId}:`);
      stats.forEach(s => console.log(`    - ${s}`));
    });

    // Check items
    const items = await query('SELECT * FROM items WHERE assessment_id = 1');
    console.log(`\n\nItems in database: ${items.rows.length} rows`);
    items.rows.forEach(row => {
      console.log(`  - ID ${row.id}: ${row.item_code}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStats();
