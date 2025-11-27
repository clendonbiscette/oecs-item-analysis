const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, '../docs/2025 OERA Item Analysis_LATEST.xlsx');

try {
  const workbook = XLSX.readFile(excelPath);
  const summarySheet = workbook.Sheets['Summary'];
  const data = XLSX.utils.sheet_to_json(summarySheet, { header: 1, defval: '' });

  console.log('='.repeat(80));
  console.log('ITEM STATISTICS FROM EXCEL - Summary Sheet');
  console.log('='.repeat(80));

  // Based on the structure we saw:
  // Row 3 (index 2) has headers
  // Column F (index 5): Item ID
  // Column H (index 7): Difficulty Index
  // Column J (index 9): Discrimination Index
  // Column L (index 11): Point Biserial Correlation

  console.log('\nItem | Excel Difficulty | Excel Discrimination | Excel Point-Biserial');
  console.log('-'.repeat(80));

  // Start from row 5 (index 4) where Q1 begins
  for (let i = 4; i < 25; i++) { // Q1 through Q21
    const row = data[i];
    if (!row) break;

    const itemId = row[6]; // Column G where Q1, Q2, etc. appear based on output
    const difficulty = row[7]; // Column H
    const discrimination = row[9]; // Column J
    const pointBiserial = row[11]; // Column L

    if (itemId && itemId.toString().match(/^Q\d+$/)) {
      console.log(
        `${itemId.toString().padEnd(4)} | ` +
        `${(difficulty || 'N/A').toString().padStart(16)} | ` +
        `${(discrimination || 'N/A').toString().padStart(20)} | ` +
        `${(pointBiserial || 'N/A').toString().padStart(21)}`
      );
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('Checking all columns around the item IDs...');
  console.log('='.repeat(80));

  // Print rows 3-10 with all columns to verify structure
  for (let i = 2; i < 26; i++) {
    const row = data[i];
    console.log(`\nRow ${i + 1}:`);
    for (let j = 0; j < 15; j++) {
      if (row[j] !== '' && row[j] !== undefined) {
        console.log(`  Col ${String.fromCharCode(65 + j)} (${j}): ${row[j]}`);
      }
    }
  }

} catch (error) {
  console.error('Error:', error.message);
}
