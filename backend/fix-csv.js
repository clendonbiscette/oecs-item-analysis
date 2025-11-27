import { readFileSync, writeFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

// Read the original CSV
const inputFile = '../docs/oera_2025_test.csv';
const outputFile = '../docs/oera_2025_fixed.csv';

console.log('Reading CSV file...');
const content = readFileSync(inputFile, 'utf-8');

// Parse with original headers
const lines = content.split('\n');

// Find the answer key line (row with KEY)
let keyRow = null;
let headerRow = null;
let dataStartIndex = 0;

for (let i = 0; i < Math.min(10, lines.length); i++) {
  const line = lines[i];
  if (line.includes('KEY') && line.includes(',C,A,C')) {
    keyRow = line.split(',');
    console.log(`Found KEY row at line ${i + 1}`);
  }
  if (line.includes('ID,Name,Sex,Q1')) {
    headerRow = line.split(',');
    dataStartIndex = i + 1;
    console.log(`Found header row at line ${i + 1}`);
  }
}

if (!keyRow || !headerRow) {
  console.error('Could not find KEY row or header row');
  process.exit(1);
}

// Extract answer key values starting from the first Q column
const keyIndex = keyRow.findIndex(cell => cell.trim() === 'KEY');
const answerKeyValues = keyRow.slice(keyIndex + 1).filter(val => val.match(/^[A-D]$/));

console.log(`Found ${answerKeyValues.length} answer key values`);

// Get question columns
const questionColumns = headerRow.filter(col => col.match(/^Q\d+$/));
console.log(`Found ${questionColumns.length} question columns`);

// Build new data
const newData = [];

// Add header row
const newHeader = ['StudentID', 'Gender', ...questionColumns];
newData.push(newHeader);

// Add KEY row
const keyRowData = ['KEY', 'M', ...answerKeyValues.slice(0, questionColumns.length)];
newData.push(keyRowData);

// Process student rows
for (let i = dataStartIndex; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const cells = line.split(',');

  // Skip if ID is empty or not a number/code
  const id = cells[0];
  if (!id || id === 'ID') continue;

  const sex = cells[2]; // Sex column
  const studentData = [id, sex];

  // Extract Q1-Q21 values (columns 3-23)
  for (let q = 0; q < questionColumns.length; q++) {
    const value = cells[3 + q] || '';
    studentData.push(value.trim());
  }

  newData.push(studentData);
}

console.log(`Processing ${newData.length - 2} student rows (excluding header and KEY)`);

// Convert to CSV
const csvOutput = stringify(newData);

// Write output
writeFileSync(outputFile, csvOutput);

console.log(`\n✅ Fixed CSV written to: ${outputFile}`);
console.log(`\nSummary:`);
console.log(`- Headers: ${newHeader.join(', ')}`);
console.log(`- Answer key: ${answerKeyValues.slice(0, 5).join(', ')}...`);
console.log(`- Students: ${newData.length - 2}`);
console.log(`- Items: ${questionColumns.length}`);
