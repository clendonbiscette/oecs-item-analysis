const XLSX = require('xlsx');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const excelPath = path.join(__dirname, '../docs/2025 OERA Item Analysis_LATEST.xlsx');

async function compareStats() {
  // Read Excel file
  const workbook = XLSX.readFile(excelPath);
  const itemAnalysisSheet = workbook.Sheets['Item Analysis'];
  const data = XLSX.utils.sheet_to_json(itemAnalysisSheet, { header: 1, defval: '' });

  // Extract Excel item statistics
  // Row 4 (index 3): Item numbers (Q1, Q2, etc.) starting at column E (index 4)
  // Row 10 (index 9): Difficulty index
  // Row 11 (index 10): Discrimination index
  // Row 12 (index 11): Point-biserial correlation

  const itemRow = data[3]; // Row 4
  const diffRow = data[9];  // Row 10 - diff index
  const discRow = data[10]; // Row 11 - dis index
  const pbRow = data[11];   // Row 12 - rpbis

  const excelStats = {};

  // Extract from column E (index 4) onwards
  for (let i = 4; i < itemRow.length; i++) {
    const itemCode = itemRow[i];
    if (itemCode && itemCode.toString().match(/^Q\d+$/)) {
      excelStats[itemCode] = {
        difficulty: parseFloat(diffRow[i]) || null,
        discrimination: parseFloat(discRow[i]) || null,
        point_biserial: parseFloat(pbRow[i]) || null
      };
    }
  }

  // Get platform statistics from database
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    const assessment = await client.query('SELECT * FROM assessments ORDER BY id DESC LIMIT 1');
    const assessmentId = assessment.rows[0].id;

    const itemStats = await client.query(
      `SELECT i.item_code, s.stat_type, s.stat_value
       FROM statistics s
       JOIN items i ON s.item_id = i.id
       WHERE s.assessment_id = $1 AND s.item_id IS NOT NULL
       ORDER BY i.item_code, s.stat_type`,
      [assessmentId]
    );

    const platformStats = {};
    itemStats.rows.forEach(row => {
      if (!platformStats[row.item_code]) {
        platformStats[row.item_code] = {};
      }
      platformStats[row.item_code][row.stat_type] = parseFloat(row.stat_value);
    });

    // Compare and print results
    console.log('='.repeat(100));
    console.log('ITEM STATISTICS VALIDATION - Platform vs Excel');
    console.log('='.repeat(100));
    console.log('Item | Stat Type        | Excel Value | Platform Value | Difference | Status');
    console.log('-'.repeat(100));

    const items = Object.keys(excelStats).sort((a, b) => {
      const aNum = parseInt(a.replace('Q', ''));
      const bNum = parseInt(b.replace('Q', ''));
      return aNum - bNum;
    });

    let allPassed = true;
    const failures = [];

    items.forEach(item => {
      const excel = excelStats[item];
      const platform = platformStats[item] || {};

      // Difficulty
      const diffExcel = excel.difficulty;
      const diffPlatform = platform.difficulty;
      const diffDiff = diffPlatform ? Math.abs(diffExcel - diffPlatform) : null;
      const diffStatus = diffDiff !== null && diffDiff <= 0.001 ? '✅ PASS' : '❌ FAIL';
      if (diffStatus === '❌ FAIL') {
        allPassed = false;
        failures.push(`${item} Difficulty: ${diffDiff?.toFixed(4)}`);
      }

      console.log(
        `${item.padEnd(4)} | ${'Difficulty'.padEnd(16)} | ` +
        `${(diffExcel?.toFixed(4) || 'N/A').padStart(11)} | ` +
        `${(diffPlatform?.toFixed(4) || 'N/A').padStart(14)} | ` +
        `${(diffDiff?.toFixed(4) || 'N/A').padStart(10)} | ${diffStatus}`
      );

      // Discrimination
      const discExcel = excel.discrimination;
      const discPlatform = platform.discrimination;
      const discDiff = discPlatform ? Math.abs(discExcel - discPlatform) : null;
      const discStatus = discDiff !== null && discDiff <= 0.001 ? '✅ PASS' : '❌ FAIL';
      if (discStatus === '❌ FAIL') {
        allPassed = false;
        failures.push(`${item} Discrimination: ${discDiff?.toFixed(4)}`);
      }

      console.log(
        `${item.padEnd(4)} | ${'Discrimination'.padEnd(16)} | ` +
        `${(discExcel?.toFixed(4) || 'N/A').padStart(11)} | ` +
        `${(discPlatform?.toFixed(4) || 'N/A').padStart(14)} | ` +
        `${(discDiff?.toFixed(4) || 'N/A').padStart(10)} | ${discStatus}`
      );

      // Point-Biserial
      const pbExcel = excel.point_biserial;
      const pbPlatform = platform.point_biserial;
      const pbDiff = pbPlatform ? Math.abs(pbExcel - pbPlatform) : null;
      const pbStatus = pbDiff !== null && pbDiff <= 0.001 ? '✅ PASS' : '❌ FAIL';
      if (pbStatus === '❌ FAIL') {
        allPassed = false;
        failures.push(`${item} Point-Biserial: ${pbDiff?.toFixed(4)}`);
      }

      console.log(
        `${item.padEnd(4)} | ${'Point-Biserial'.padEnd(16)} | ` +
        `${(pbExcel?.toFixed(4) || 'N/A').padStart(11)} | ` +
        `${(pbPlatform?.toFixed(4) || 'N/A').padStart(14)} | ` +
        `${(pbDiff?.toFixed(4) || 'N/A').padStart(10)} | ${pbStatus}`
      );

      console.log('-'.repeat(100));
    });

    console.log('='.repeat(100));
    if (allPassed) {
      console.log('🎉 ALL ITEM STATISTICS VALIDATED! ALL DIFFERENCES WITHIN ±0.001 TOLERANCE!');
    } else {
      console.log('❌ VALIDATION FAILED! Some differences exceed ±0.001 tolerance:');
      failures.forEach(f => console.log('  - ' + f));
    }
    console.log('='.repeat(100));

  } finally {
    client.release();
    await pool.end();
  }
}

compareStats().catch(console.error);
