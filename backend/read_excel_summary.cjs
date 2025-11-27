const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, '../docs/2025 OERA Item Analysis_LATEST.xlsx');

try {
  const workbook = XLSX.readFile(excelPath);

  console.log('='.repeat(80));
  console.log('EXCEL FILE STRUCTURE');
  console.log('='.repeat(80));
  console.log('Available sheets:', workbook.SheetNames);
  console.log('');

  // Try to find the Summary sheet
  const summarySheetName = workbook.SheetNames.find(name =>
    name.toLowerCase().includes('summary')
  );

  if (summarySheetName) {
    console.log(`Found Summary sheet: "${summarySheetName}"`);
    console.log('='.repeat(80));

    const summarySheet = workbook.Sheets[summarySheetName];

    // Convert to JSON to see the data
    const data = XLSX.utils.sheet_to_json(summarySheet, { header: 1, defval: '' });

    // Print first 50 rows to see the structure
    console.log('\nFirst 50 rows of Summary sheet:');
    console.log('-'.repeat(80));
    data.slice(0, 50).forEach((row, idx) => {
      if (row.some(cell => cell !== '')) { // Only print non-empty rows
        console.log(`Row ${idx + 1}:`, row.slice(0, 10)); // First 10 columns
      }
    });

    // Try to find item statistics (look for Q1, Q2, etc.)
    console.log('\n' + '='.repeat(80));
    console.log('SEARCHING FOR ITEM STATISTICS...');
    console.log('='.repeat(80));

    data.forEach((row, idx) => {
      const rowStr = row.join('|').toLowerCase();
      if (rowStr.includes('difficulty') ||
          rowStr.includes('discrimination') ||
          rowStr.includes('point-biserial') ||
          rowStr.includes('p-value') ||
          (row[0] && row[0].toString().match(/^q\d+$/i))) {
        console.log(`Row ${idx + 1}:`, row.slice(0, 15));
      }
    });

  } else {
    console.log('No Summary sheet found!');
    console.log('Available sheets:', workbook.SheetNames);
  }

} catch (error) {
  console.error('Error reading Excel file:', error.message);
}
