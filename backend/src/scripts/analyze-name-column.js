import xlsx from 'xlsx';

const filePath = 'C:/Users/Clendon/ITEM_ANAYSIS_PLATFORM/docs/2025 OERA Item Analysis_TEST.xlsx';

const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
  header: 1,
  defval: '',
  blankrows: false
});

// Find header row
let headerRowIndex = -1;
for (let i = 0; i < Math.min(10, rawData.length); i++) {
  const row = rawData[i];
  if (row.includes('ID') && row.some(h => String(h).match(/^Q\d+$/))) {
    headerRowIndex = i;
    break;
  }
}

const headerRow = rawData[headerRowIndex];
const idColumnIndex = headerRow.findIndex(h => String(h).trim() === 'ID');
const nameColumnIndex = headerRow.findIndex(h => String(h).trim() === 'Name');

console.log(`Header row at index ${headerRowIndex}`);
console.log(`ID column: ${idColumnIndex}, Name column: ${nameColumnIndex}\n`);

// Sample first 30 rows
console.log('Sample of first 30 student records (ID, Name):');
console.log('='.repeat(80));

const dataStartIndex = headerRowIndex + 1;
for (let i = dataStartIndex; i < Math.min(dataStartIndex + 30, rawData.length); i++) {
  const row = rawData[i];
  if (!row || row.length === 0) continue;

  const studentId = row[idColumnIndex] ? String(row[idColumnIndex]).trim() : '';
  const nameValue = row[nameColumnIndex] ? String(row[nameColumnIndex]).trim() : '';

  if (studentId) {
    console.log(`Row ${i + 1}: ID="${studentId}" | Name="${nameValue}"`);
  }
}

console.log('\n' + '='.repeat(80));

// Find duplicates for student ID "104" in SVG
console.log('\nSearching for all instances of student ID "104" from SVG:');
console.log('='.repeat(80));

const matches = [];
for (let i = dataStartIndex; i < rawData.length; i++) {
  const row = rawData[i];
  if (!row || row.length === 0) continue;

  const studentId = row[idColumnIndex] ? String(row[idColumnIndex]).trim() : '';
  const nameValue = row[nameColumnIndex] ? String(row[nameColumnIndex]).trim() : '';

  if (studentId === '104' && nameValue === 'SVG') {
    matches.push({
      rowNum: i + 1,
      id: studentId,
      name: nameValue,
      fullRow: row.slice(0, 5) // First 5 columns
    });
  }
}

console.log(`Found ${matches.length} instances of ID="104" with Name="SVG"`);
if (matches.length > 0) {
  matches.forEach(m => {
    console.log(`  Row ${m.rowNum}: ${JSON.stringify(m.fullRow)}`);
  });
}
