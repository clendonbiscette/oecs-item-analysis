import xlsx from 'xlsx';

const filePath = 'C:/Users/Clendon/ITEM_ANAYSIS_PLATFORM/docs/2025 OERA Item Analysis_TEST.xlsx';

const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
  header: 1,
  defval: '',
  blankrows: false
});

console.log(`Total rows in file: ${rawData.length}\n`);

// Find header row (contains "ID", "Name", "Sex", "Q1", etc.)
let headerRowIndex = -1;
for (let i = 0; i < Math.min(10, rawData.length); i++) {
  const row = rawData[i];
  if (row.includes('ID') && row.some(h => String(h).match(/^Q\d+$/))) {
    headerRowIndex = i;
    break;
  }
}

if (headerRowIndex === -1) {
  console.log('Could not find header row');
  process.exit(1);
}

console.log(`Header row at index ${headerRowIndex}`);
const headerRow = rawData[headerRowIndex];
const idColumnIndex = headerRow.findIndex(h => String(h).trim() === 'ID');
console.log(`ID column at index ${idColumnIndex}\n`);

// Extract all student IDs
const studentIds = [];
const dataStartIndex = headerRowIndex + 1;

for (let i = dataStartIndex; i < rawData.length; i++) {
  const row = rawData[i];
  if (!row || row.length === 0) continue;

  const studentId = row[idColumnIndex] ? String(row[idColumnIndex]).trim() : '';
  if (studentId && studentId !== '') {
    studentIds.push({ rowIndex: i + 1, id: studentId }); // +1 for Excel row number
  }
}

console.log(`Found ${studentIds.length} student IDs\n`);

// Check for duplicates
const idCounts = {};
studentIds.forEach(({ id }) => {
  idCounts[id] = (idCounts[id] || 0) + 1;
});

const duplicates = Object.entries(idCounts)
  .filter(([id, count]) => count > 1)
  .sort((a, b) => b[1] - a[1]);

console.log(`Unique IDs: ${Object.keys(idCounts).length}`);
console.log(`Duplicate IDs: ${duplicates.length}\n`);

if (duplicates.length > 0) {
  console.log('DUPLICATE STUDENT IDs FOUND:');
  console.log('==============================\n');

  duplicates.slice(0, 20).forEach(([id, count]) => {
    console.log(`ID "${id}" appears ${count} times`);
    const locations = studentIds
      .filter(item => item.id === id)
      .map(item => `row ${item.rowIndex}`)
      .join(', ');
    console.log(`  Locations: ${locations}\n`);
  });
} else {
  console.log('✓ No duplicate student IDs found!');
}
