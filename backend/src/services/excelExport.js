import xlsx from 'xlsx';
import { query } from '../db.js';

/**
 * Generate Excel workbook with comprehensive item analysis report
 */
export async function generateExcelReport(assessmentId) {
  try {
    // Create new workbook
    const workbook = xlsx.utils.book_new();

    // Get assessment details
    const assessmentResult = await query(
      'SELECT * FROM assessments WHERE id = $1',
      [assessmentId]
    );
    const assessment = assessmentResult.rows[0];

    if (!assessment) {
      throw new Error('Assessment not found');
    }

    // Sheet 1: Test Statistics
    const testStatsSheet = await createTestStatsSheet(assessmentId, assessment);
    xlsx.utils.book_append_sheet(workbook, testStatsSheet, 'Test Statistics');

    // Sheet 2: Item Statistics
    const itemStatsSheet = await createItemStatsSheet(assessmentId);
    xlsx.utils.book_append_sheet(workbook, itemStatsSheet, 'Item Statistics');

    // Sheet 3: Distractor Analysis
    const distractorSheet = await createDistractorSheet(assessmentId);
    xlsx.utils.book_append_sheet(workbook, distractorSheet, 'Distractor Analysis');

    // Sheet 4: Raw Data
    const rawDataSheet = await createRawDataSheet(assessmentId);
    xlsx.utils.book_append_sheet(workbook, rawDataSheet, 'Raw Data');

    return workbook;
  } catch (error) {
    console.error('Error generating Excel report:', error);
    throw error;
  }
}

/**
 * Create Test Statistics sheet
 */
async function createTestStatsSheet(assessmentId, assessment) {
  // Get test-level statistics
  const statsResult = await query(
    `SELECT stat_type, stat_value
     FROM statistics
     WHERE assessment_id = $1 AND item_id IS NULL
     ORDER BY stat_type`,
    [assessmentId]
  );

  const stats = {};
  statsResult.rows.forEach(row => {
    stats[row.stat_type] = parseFloat(row.stat_value);
  });

  // Create data for sheet
  const data = [
    ['Test Statistics Report'],
    [''],
    ['Assessment Name', assessment.name],
    ['Assessment Year', assessment.assessment_year],
    ['Country', assessment.country],
    ['Upload Date', new Date(assessment.upload_date).toLocaleDateString()],
    [''],
    ['Statistic', 'Value'],
    ['Number of Students', stats.n || assessment.student_count],
    ['Number of Items', assessment.item_count],
    ['Mean Score', stats.mean?.toFixed(2)],
    ['Median Score', stats.median?.toFixed(2)],
    ['Standard Deviation', stats.stdev?.toFixed(2)],
    ['Minimum Score', stats.min],
    ['Maximum Score', stats.max],
    ['Cronbach\'s Alpha', stats.cronbach_alpha?.toFixed(4)],
    ['Standard Error of Measurement (SEM)', stats.sem?.toFixed(2)],
  ];

  return xlsx.utils.aoa_to_sheet(data);
}

/**
 * Create Item Statistics sheet
 */
async function createItemStatsSheet(assessmentId) {
  // Get all items with their statistics
  const itemsResult = await query(
    `SELECT
       i.item_code,
       i.correct_answer,
       MAX(CASE WHEN s.stat_type = 'difficulty' THEN s.stat_value END) as difficulty,
       MAX(CASE WHEN s.stat_type = 'discrimination' THEN s.stat_value END) as discrimination,
       MAX(CASE WHEN s.stat_type = 'point_biserial' THEN s.stat_value END) as point_biserial
     FROM items i
     LEFT JOIN statistics s ON s.item_id = i.id
     WHERE i.assessment_id = $1
     GROUP BY i.id, i.item_code, i.correct_answer
     ORDER BY LENGTH(i.item_code), i.item_code`,
    [assessmentId]
  );

  // Create header row
  const data = [
    ['Item Statistics'],
    [''],
    ['Item', 'Correct Answer', 'Difficulty', 'Discrimination', 'Point-Biserial', 'Interpretation']
  ];

  // Add item rows
  itemsResult.rows.forEach(item => {
    const difficulty = parseFloat(item.difficulty);
    const discrimination = parseFloat(item.discrimination);
    const pointBiserial = parseFloat(item.point_biserial);

    let interpretation = 'Good';
    if (discrimination < 0.20) {
      interpretation = 'Poor - Review';
    } else if (discrimination < 0.30 || (pointBiserial && pointBiserial < 0.20)) {
      interpretation = 'Needs Review';
    }

    data.push([
      item.item_code,
      item.correct_answer || 'N/A',
      difficulty?.toFixed(3) || 'N/A',
      discrimination?.toFixed(3) || 'N/A',
      pointBiserial?.toFixed(3) || 'N/A',
      interpretation
    ]);
  });

  return xlsx.utils.aoa_to_sheet(data);
}

/**
 * Create Distractor Analysis sheet
 */
async function createDistractorSheet(assessmentId) {
  // Get all items
  const itemsResult = await query(
    `SELECT id, item_code, correct_answer
     FROM items
     WHERE assessment_id = $1
     ORDER BY LENGTH(item_code), item_code`,
    [assessmentId]
  );

  // Get student data for distractor analysis
  const studentsResult = await query(
    `SELECT s.id, s.total_score,
            json_agg(json_build_object(
              'item_id', r.item_id,
              'response_value', r.response_value,
              'is_correct', r.is_correct
            ) ORDER BY LENGTH(i.item_code), i.item_code) as responses
     FROM students s
     LEFT JOIN responses r ON r.student_id = s.id
     LEFT JOIN items i ON i.id = r.item_id
     WHERE s.assessment_id = $1
     GROUP BY s.id
     ORDER BY s.total_score DESC`,
    [assessmentId]
  );

  const students = studentsResult.rows;
  const groupSize = Math.floor(students.length * 0.27);
  const upperGroup = students.slice(0, groupSize);
  const lowerGroup = students.slice(-groupSize);

  // Create header
  const data = [
    ['Distractor Analysis'],
    [''],
    ['Item', 'Correct Answer', 'Option', 'Upper Count', 'Lower Count', 'Discrimination', 'Status']
  ];

  // Analyze each item
  for (const item of itemsResult.rows) {
    // Dynamically detect unique response options from actual student responses
    const uniqueOptions = new Set();
    students.forEach(s => {
      const response = s.responses?.find(r => r.item_id === item.id);
      if (response && response.response_value) {
        // Handle single letter responses (A, B, C, D, etc.)
        const value = response.response_value.trim().toUpperCase();
        if (value.match(/^[A-Z]$/)) {
          uniqueOptions.add(value);
        }
      }
    });

    // Convert to sorted array (A, B, C, D, etc.)
    let options = Array.from(uniqueOptions).sort();

    // Fallback to A, B, C if no options detected
    if (options.length === 0) {
      options = ['A', 'B', 'C'];
    }

    for (const option of options) {
      const upperCount = upperGroup.filter(s => {
        const response = s.responses?.find(r => r.item_id === item.id);
        return response && response.response_value === option;
      }).length;

      const lowerCount = lowerGroup.filter(s => {
        const response = s.responses?.find(r => r.item_id === item.id);
        return response && response.response_value === option;
      }).length;

      const discrimination = (upperCount - lowerCount) / groupSize;
      const isCorrect = option === item.correct_answer;

      let status;
      if (isCorrect) {
        status = discrimination > 0 ? 'Functioning' : 'Poor Discrimination';
      } else {
        status = discrimination < 0 ? 'Functioning' : 'Non-Functioning';
      }

      data.push([
        item.item_code,
        item.correct_answer || 'N/A',
        option,
        upperCount,
        lowerCount,
        discrimination.toFixed(3),
        status
      ]);
    }

    // Add blank row between items
    data.push([]);
  }

  return xlsx.utils.aoa_to_sheet(data);
}

/**
 * Create Raw Data sheet
 */
async function createRawDataSheet(assessmentId) {
  // Get all items
  const itemsResult = await query(
    `SELECT item_code FROM items WHERE assessment_id = $1 ORDER BY LENGTH(item_code), item_code`,
    [assessmentId]
  );
  const items = itemsResult.rows.map(i => i.item_code);

  // Get all students with responses
  const studentsResult = await query(
    `SELECT
       s.student_code,
       s.gender,
       s.country,
       s.total_score,
       json_agg(
         json_build_object(
           'item_code', i.item_code,
           'response_value', r.response_value,
           'is_correct', r.is_correct
         ) ORDER BY LENGTH(i.item_code), i.item_code
       ) as responses
     FROM students s
     LEFT JOIN responses r ON r.student_id = s.id
     LEFT JOIN items i ON i.id = r.item_id
     WHERE s.assessment_id = $1
     GROUP BY s.id, s.student_code, s.gender, s.country, s.total_score
     ORDER BY s.student_code`,
    [assessmentId]
  );

  // Create header row
  const header = ['Student ID', 'Gender', 'Country', ...items, 'Total Score'];
  const data = [header];

  // Add student rows
  studentsResult.rows.forEach(student => {
    const row = [
      student.student_code,
      student.gender || '',
      student.country || ''
    ];

    // Add responses in order
    items.forEach(itemCode => {
      const response = student.responses?.find(r => r.item_code === itemCode);
      row.push(response?.response_value || '');
    });

    row.push(student.total_score);
    data.push(row);
  });

  return xlsx.utils.aoa_to_sheet(data);
}
