import { parseOERAFile } from '../utils/parse-oera-file.js';

const filePath = 'C:/Users/Clendon/ITEM_ANAYSIS_PLATFORM/docs/2025 OERA Item Analysis_TEST.xlsx';
const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

try {
  console.log('Parsing file to check for duplicate student IDs...\n');

  const parsed = parseOERAFile(filePath, mimeType);
  const { students } = parsed;

  // Track student IDs
  const idCounts = {};
  const duplicates = [];

  students.forEach(student => {
    const id = student.studentId;
    if (idCounts[id]) {
      idCounts[id]++;
      duplicates.push(student);
    } else {
      idCounts[id] = 1;
    }
  });

  // Find all duplicated IDs
  const duplicatedIds = Object.entries(idCounts)
    .filter(([id, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]);

  console.log(`Total students: ${students.length}`);
  console.log(`Unique student IDs: ${Object.keys(idCounts).length}`);
  console.log(`Duplicate student IDs: ${duplicatedIds.length}\n`);

  if (duplicatedIds.length > 0) {
    console.log('Top 20 duplicated student IDs:');
    duplicatedIds.slice(0, 20).forEach(([id, count]) => {
      console.log(`  ID "${id}" appears ${count} times`);
    });

    console.log('\nSample duplicate records (first 10):');
    duplicates.slice(0, 10).forEach(student => {
      console.log(`  ID: ${student.studentId}, Country: ${student.country}, Gender: ${student.gender || 'empty'}`);
    });
  }

} catch (error) {
  console.error('Error:', error.message);
}
