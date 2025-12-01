import xlsx from 'xlsx';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';

/**
 * Parse OERA/OEMA file (Excel or CSV) in the exact INPUT sheet format
 *
 * Expected structure:
 * Row 3: Answer key (Column C = "KEY", then answers in D, E, F...)
 * Row 4: Headers (ID, Name, Sex, Q1, Q2, Q3...)
 * Row 5+: Student data
 *
 * @param {string} filePath - Path to uploaded file
 * @param {string} mimeType - File MIME type
 * @returns {Object} Parsed data with students, answerKey, items
 */
export function parseOERAFile(filePath, mimeType) {
  let rawData;

  // Parse file based on type
  if (mimeType === 'text/csv') {
    const content = readFileSync(filePath, 'utf-8');
    // Parse as array of arrays (not objects)
    rawData = parse(content, { skip_empty_lines: false, relax_column_count: true });
  } else {
    // Excel file
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,  // Return array of arrays
      defval: '',
      blankrows: false
    });
  }

  if (!rawData || rawData.length < 5) {
    throw new Error('File must have at least 5 rows (header rows + data)');
  }

  // Find the answer key row (row with "KEY" in one of the first few columns)
  // OERA has KEY at column 2, OEMA has KEY at column 3
  let keyRowIndex = -1;
  let answerKey = {};

  for (let i = 0; i < Math.min(10, rawData.length); i++) {
    const row = rawData[i];
    // Check first 5 columns for "KEY"
    for (let col = 0; col < Math.min(5, row.length); col++) {
      if (row[col] && String(row[col]).toUpperCase().trim() === 'KEY') {
        keyRowIndex = i;
        console.log(`Found KEY row at index ${i}, column ${col}`);
        break;
      }
    }
    if (keyRowIndex !== -1) break;
  }

  if (keyRowIndex === -1) {
    throw new Error('Answer key row not found. Expected "KEY" in one of the first columns');
  }

  // Find the header row (should be right after KEY row, or look for "ID", "Sex", "Q1")
  let headerRowIndex = keyRowIndex + 1;
  const headerRow = rawData[headerRowIndex];

  if (!headerRow || !headerRow.includes('ID') || !headerRow.some(h => String(h).match(/^Q\d+$/))) {
    throw new Error('Header row not found after KEY row. Expected columns: ID, Name, Sex, Q1, Q2...');
  }

  console.log(`Found header row at index ${headerRowIndex}`);
  console.log(`Headers:`, headerRow.slice(0, 10));

  // Extract answer key values (starting from column D, index 3)
  const keyRow = rawData[keyRowIndex];
  const questionColumns = [];
  const seenCodes = {}; // Track item codes to detect duplicates

  const itemsMetadata = {}; // Store item type and max points

  for (let i = 0; i < headerRow.length; i++) {
    const header = String(headerRow[i]).trim();
    // Match Q followed by number (Q1, Q2) or Q followed by number and letter (Q1a, Q1b)
    if (header.match(/^Q\d+[a-z]?$/i)) {
      const answer = keyRow[i] ? String(keyRow[i]).trim() : '';
      // Accept both letter answers (A-Z) for selected response and numeric answers (0-9) for constructed response
      if (answer && (answer.match(/^[A-Z]$/i) || answer.match(/^\d+(\.\d+)?$/))) {
        // Handle duplicate item codes by appending suffix
        let uniqueCode = header;
        if (seenCodes[header]) {
          seenCodes[header]++;
          uniqueCode = `${header}_${seenCodes[header]}`;
          console.warn(`⚠️  Duplicate item code "${header}" found at column ${i}, renaming to "${uniqueCode}"`);
        } else {
          seenCodes[header] = 1;
        }

        // Detect item type and max points based on KEY row value
        const isNumeric = answer.match(/^\d+(\.\d+)?$/);
        const itemType = isNumeric ? 'CR' : 'MC';
        const maxPoints = isNumeric ? parseFloat(answer) : 1;

        answerKey[uniqueCode] = answer.toUpperCase(); // Store uppercase for consistency
        questionColumns.push({ index: i, code: uniqueCode });

        // Store metadata for this item
        itemsMetadata[uniqueCode] = {
          itemType,
          maxPoints,
          correctAnswer: itemType === 'MC' ? answer.toUpperCase() : null
        };
      }
    }
  }

  // Calculate assessment scoring summary
  const mcCount = Object.values(itemsMetadata).filter(i => i.itemType === 'MC').length;
  const crCount = Object.values(itemsMetadata).filter(i => i.itemType === 'CR').length;
  const totalPoints = Object.values(itemsMetadata).reduce((sum, item) => sum + item.maxPoints, 0);

  console.log(`Found ${questionColumns.length} questions with answer key`);
  console.log(`  - MC items: ${mcCount} (${mcCount} points)`);
  console.log(`  - CR items: ${crCount} (${totalPoints - mcCount} points)`);
  console.log(`  - Total possible points: ${totalPoints}`);
  console.log(`Answer key sample:`, Object.entries(answerKey).slice(0, 5));

  // Parse student data (rows after header)
  const students = [];
  const dataStartIndex = headerRowIndex + 1;

  // Find column indices
  const idColumnIndex = headerRow.findIndex(h => String(h).trim() === 'ID');
  const nameColumnIndex = headerRow.findIndex(h => String(h).trim() === 'Name');
  const countryColumnIndex = headerRow.findIndex(h => String(h).trim() === 'Country');
  const sexColumnIndex = headerRow.findIndex(h => String(h).trim() === 'Sex');
  const schoolColumnIndex = headerRow.findIndex(h => String(h).trim() === 'School');
  const schoolTypeColumnIndex = headerRow.findIndex(h => String(h).trim() === 'School_Type' || String(h).trim() === 'School Type');
  const districtColumnIndex = headerRow.findIndex(h => String(h).trim() === 'District');

  if (idColumnIndex === -1) {
    throw new Error('ID column not found in header row');
  }

  console.log(`Column indices - ID: ${idColumnIndex}, Name: ${nameColumnIndex}, Country: ${countryColumnIndex}, Sex: ${sexColumnIndex}, School: ${schoolColumnIndex}, School_Type: ${schoolTypeColumnIndex}, District: ${districtColumnIndex}`);

  for (let i = dataStartIndex; i < rawData.length; i++) {
    const row = rawData[i];

    // Skip empty rows
    if (!row || row.length === 0) continue;

    const studentId = row[idColumnIndex] ? String(row[idColumnIndex]).trim() : '';

    // Skip rows without student ID
    if (!studentId || studentId === '') continue;

    // Extract name (optional - may not exist in all templates)
    const nameValue = nameColumnIndex !== -1 && row[nameColumnIndex] ? String(row[nameColumnIndex]).trim() : '';

    // Extract country - prefer dedicated Country column, fall back to Name column for backward compatibility
    let countryValue = '';
    if (countryColumnIndex !== -1 && row[countryColumnIndex]) {
      // Use dedicated Country column (new format)
      countryValue = String(row[countryColumnIndex]).trim();
    } else if (nameValue) {
      // Fall back to Name column (old format where Name contained country codes)
      countryValue = nameValue;
    }

    // Extract gender - convert empty to null for database
    const genderValue = sexColumnIndex !== -1 && row[sexColumnIndex] ? String(row[sexColumnIndex]).trim().toUpperCase() : '';
    const gender = genderValue === '' ? null : genderValue;

    // Extract school information
    const schoolValue = schoolColumnIndex !== -1 && row[schoolColumnIndex] ? String(row[schoolColumnIndex]).trim() : null;
    const schoolTypeValue = schoolTypeColumnIndex !== -1 && row[schoolTypeColumnIndex] ? String(row[schoolTypeColumnIndex]).trim() : null;
    const districtValue = districtColumnIndex !== -1 && row[districtColumnIndex] ? String(row[districtColumnIndex]).trim() : null;

    const student = {
      studentId,
      name: nameValue || null,  // Name is optional
      country: countryValue || null,  // Country from dedicated column or Name column
      gender: gender,
      school: schoolValue,
      schoolType: schoolTypeValue,
      district: districtValue,
      responses: {}
    };

    // Extract responses for each question
    questionColumns.forEach(({ index, code }) => {
      const response = row[index] ? String(row[index]).trim().toUpperCase() : '';
      student.responses[code] = response;
    });

    students.push(student);
  }

  console.log(`Parsed ${students.length} students`);

  // Detect multiple responses
  let multipleResponseCount = 0;
  students.forEach(student => {
    Object.values(student.responses).forEach(response => {
      if (response && response.includes(' ')) {
        multipleResponseCount++;
      }
    });
  });

  if (multipleResponseCount > 0) {
    console.log(`⚠️  Found ${multipleResponseCount} responses with multiple answers (e.g., "A C")`);
  }

  return {
    students,
    answerKey,
    items: questionColumns.map(q => q.code),
    itemsMetadata, // NEW: Contains itemType, maxPoints, correctAnswer for each item
    metadata: {
      totalStudents: students.length,
      totalItems: questionColumns.length,
      totalPoints, // NEW: Total possible points (sum of all max_points)
      mcCount, // NEW: Number of MC items
      crCount, // NEW: Number of CR items
      isWeighted: crCount > 0 || mcCount !== questionColumns.length, // NEW: True if assessment has weighted items
      multipleResponseCount
    }
  };
}

/**
 * Score a single response against answer key
 * Handles both selected response (A, B, C, D) and constructed response (numeric scores)
 * Handles multiple responses (e.g., "A C") by treating as incorrect
 *
 * @param {string} response - Student response
 * @param {string} correctAnswer - Correct answer from key (letter or number)
 * @param {Object} itemMetadata - Item metadata with itemType and maxPoints
 * @returns {Object} { isCorrect, isMultiple, response, pointsEarned, maxPoints }
 */
export function scoreResponse(response, correctAnswer, itemMetadata = null) {
  // Determine item type and max points
  const isConstructedResponse = correctAnswer.match(/^\d+(\.\d+)?$/);
  const maxPoints = itemMetadata ? itemMetadata.maxPoints : (isConstructedResponse ? parseFloat(correctAnswer) : 1);
  const itemType = itemMetadata ? itemMetadata.itemType : (isConstructedResponse ? 'CR' : 'MC');

  if (!response || response === '') {
    return {
      isCorrect: false,
      isMultiple: false,
      response: '',
      pointsEarned: 0,
      maxPoints,
      itemType
    };
  }

  if (itemType === 'CR') {
    // Constructed response: Student's response IS the points they earned
    const studentScore = parseFloat(response);

    // Check if response is a valid number
    if (isNaN(studentScore)) {
      return {
        isCorrect: false,
        isMultiple: false,
        response,
        pointsEarned: 0,
        maxPoints,
        itemType
      };
    }

    // For CR items, isCorrect means they got full points
    const isCorrect = studentScore === maxPoints;
    const pointsEarned = Math.min(studentScore, maxPoints); // Cap at max points

    return {
      isCorrect,
      isMultiple: false,
      response,
      pointsEarned,
      maxPoints,
      itemType
    };
  } else {
    // Selected response (MC): Check for multiple responses and match letters
    const hasMultiple = response.includes(' ') || response.length > 1;

    if (hasMultiple) {
      // Multiple responses are marked as incorrect
      return {
        isCorrect: false,
        isMultiple: true,
        response,
        pointsEarned: 0,
        maxPoints: 1,
        itemType: 'MC'
      };
    }

    // Single response - check if correct
    const isCorrect = response === correctAnswer;
    return {
      isCorrect,
      isMultiple: false,
      response,
      pointsEarned: isCorrect ? 1 : 0,
      maxPoints: 1,
      itemType: 'MC'
    };
  }
}
