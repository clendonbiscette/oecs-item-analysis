const XLSX = require('xlsx');
const path = require('path');

// Read the Distribution Analysis workbook
const workbookPath = path.join(__dirname, 'docs', 'Distribution Analysis.xlsx');
const workbook = XLSX.readFile(workbookPath, { cellFormula: true, cellStyles: true });

console.log('Available sheets:', workbook.SheetNames);
console.log('\n==============================================');

// Find the OERA calculations tab
const sheetName = workbook.SheetNames.find(name =>
  name.toLowerCase().includes('oera') || name.toLowerCase().includes('calculation')
);

if (sheetName) {
  console.log(`\nExamining sheet: "${sheetName}"\n`);
  const sheet = workbook.Sheets[sheetName];

  // Get the range of the sheet
  const range = XLSX.utils.decode_range(sheet['!ref']);
  console.log(`Sheet range: ${sheet['!ref']}\n`);

  // Print first 50 rows and columns A-M to see the structure
  console.log('Sheet Content (with formulas):\n');
  for (let row = range.s.r; row <= Math.min(range.e.r, 50); row++) {
    let rowData = [];
    for (let col = range.s.c; col <= Math.min(range.e.c, 12); col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellAddress];

      if (cell) {
        if (cell.f) {
          // Cell has a formula
          rowData.push(`[F:${cell.f}]`);
        } else if (cell.v !== undefined) {
          // Cell has a value
          rowData.push(String(cell.v));
        }
      } else {
        rowData.push('');
      }
    }

    // Only print non-empty rows
    if (rowData.some(cell => cell !== '')) {
      console.log(`Row ${row + 1}:`, rowData.join(' | '));
    }
  }
} else {
  console.log('\nOERA calculations tab not found. Available sheets:');
  workbook.SheetNames.forEach(name => console.log(`  - ${name}`));
}
