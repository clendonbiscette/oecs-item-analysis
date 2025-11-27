const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, '../docs/2025 OERA Item Analysis_LATEST.xlsx');

try {
  const workbook = XLSX.readFile(excelPath);

  console.log('Available sheets:', workbook.SheetNames);
  console.log('');

  // Read the Item Analysis sheet
  const itemAnalysisSheet = workbook.Sheets['Item Analysis'];
  if (!itemAnalysisSheet) {
    console.log('Item Analysis sheet not found!');
    process.exit(1);
  }

  const data = XLSX.utils.sheet_to_json(itemAnalysisSheet, { header: 1, defval: '' });

  console.log('='.repeat(80));
  console.log('ITEM ANALYSIS SHEET - First 30 rows');
  console.log('='.repeat(80));

  // Print first 30 rows to understand structure
  data.slice(0, 30).forEach((row, idx) => {
    if (row.some(cell => cell !== '')) {
      console.log(`Row ${idx + 1}:`, row.slice(0, 12).map((cell, i) =>
        `${String.fromCharCode(65 + i)}:${cell}`
      ).filter(x => !x.endsWith(':')).join(' | '));
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('Searching for item statistics rows...');
  console.log('='.repeat(80));

  // Look for rows containing item codes and their statistics
  data.forEach((row, idx) => {
    const rowStr = row.join('|').toLowerCase();
    if (rowStr.includes('q1') || rowStr.includes('q2') ||
        rowStr.includes('difficulty') || rowStr.includes('discrimination')) {
      console.log(`\nRow ${idx + 1}:`, row.slice(0, 12));
    }
  });

} catch (error) {
  console.error('Error:', error.message);
}
