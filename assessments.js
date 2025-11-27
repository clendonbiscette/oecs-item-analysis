import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import xlsx from 'xlsx';
import { query, getClient } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import * as stats from '../utils/statistics.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'application/vnd.ms-excel' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'));
    }
  }
});

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * GET /api/assessments
 * List all assessments for current user
 */
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT a.*, u.full_name as uploaded_by_name
       FROM assessments a
       LEFT JOIN users u ON a.uploaded_by = u.id
       ORDER BY a.upload_date DESC`
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching assessments:', error);
    res.status(500).json({ error: 'Failed to fetch assessments' });
  }
});

/**
 * GET /api/assessments/:id
 * Get single assessment details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      'SELECT * FROM assessments WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching assessment:', error);
    res.status(500).json({ error: 'Failed to fetch assessment' });
  }
});

/**
 * POST /api/assessments/upload/validate
 * Validate uploaded file
 */
router.post('/upload/validate', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Parse file based on type
    let data;
    if (req.file.mimetype === 'text/csv') {
      const fs = await import('fs');
      const fileContent = fs.readFileSync(req.file.path, 'utf-8');
      data = parse(fileContent, { columns: true, skip_empty_lines: true });
    } else {
      // Excel file
      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    }
    
    // Validation
    const validation = {
      valid: true,
      warnings: [],
      errors: [],
      summary: {}
    };
    
    if (data.length === 0) {
      validation.valid = false;
      validation.errors.push('File is empty');
      return res.json({ validation, preview: [] });
    }
    
    // Check for required columns
    const firstRow = data[0];
    const requiredColumns = ['StudentID', 'Gender'];
    const missingColumns = requiredColumns.filter(col => !(col in firstRow));
    
    if (missingColumns.length > 0) {
      validation.valid = false;
      validation.errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
    }
    
    // Find item columns (Q1, Q2, etc.)
    const itemColumns = Object.keys(firstRow).filter(col => col.match(/^Q\d+$/));
    
    if (itemColumns.length === 0) {
      validation.valid = false;
      validation.errors.push('No item columns found (Q1, Q2, etc.)');
    }
    
    // Find answer key row (first row with StudentID = 'KEY')
    const keyRow = data.find(row => row.StudentID === 'KEY' || row.StudentID === 'key');
    
    if (!keyRow) {
      validation.warnings.push('No answer key found. Please ensure first row has StudentID="KEY"');
    }
    
    // Count students (excluding KEY row)
    const students = data.filter(row => row.StudentID !== 'KEY' && row.StudentID !== 'key');
    
    // Check for missing responses
    let totalResponses = 0;
    let missingResponses = 0;
    
    students.forEach(student => {
      itemColumns.forEach(item => {
        totalResponses++;
        if (!student[item] || student[item].trim() === '') {
          missingResponses++;
        }
      });
    });
    
    if (missingResponses > 0) {
      const missingPercent = ((missingResponses / totalResponses) * 100).toFixed(1);
      validation.warnings.push(`${missingResponses} missing responses (${missingPercent}%)`);
    }
    
    // Summary
    validation.summary = {
      studentCount: students.length,
      itemCount: itemColumns.length,
      hasAnswerKey: !!keyRow,
      missingResponses
    };
    
    // Preview (first 10 students)
    const preview = students.slice(0, 10).map(row => ({
      StudentID: row.StudentID,
      Gender: row.Gender,
      responses: itemColumns.slice(0, 5).map(col => row[col] || '')
    }));
    
    // Store file info in session/temp storage
    // For MVP, we'll return it to client for next step
    res.json({
      validation,
      preview,
      fileInfo: {
        filename: req.file.originalname,
        path: req.file.path,
        itemColumns,
        hasAnswerKey: !!keyRow
      }
    });
    
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ error: 'Failed to validate file: ' + error.message });
  }
});

/**
 * POST /api/assessments/upload/confirm
 * Process and save assessment data
 */
router.post('/upload/confirm', upload.single('file'), async (req, res) => {
  const client = await getClient();
  
  try {
    const { assessmentName, assessmentYear, country } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Parse file
    let data;
    if (req.file.mimetype === 'text/csv') {
      const fs = await import('fs');
      const fileContent = fs.readFileSync(req.file.path, 'utf-8');
      data = parse(fileContent, { columns: true, skip_empty_lines: true });
    } else {
      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    }
    
    await client.query('BEGIN');
    
    // Find item columns and answer key
    const firstRow = data[0];
    const itemColumns = Object.keys(firstRow).filter(col => col.match(/^Q\d+$/)).sort();
    const keyRow = data.find(row => row.StudentID === 'KEY' || row.StudentID === 'key');
    const students = data.filter(row => row.StudentID !== 'KEY' && row.StudentID !== 'key');
    
    // Create assessment
    const assessmentResult = await client.query(
      `INSERT INTO assessments (name, assessment_year, country, uploaded_by, student_count, item_count)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [assessmentName, assessmentYear, country, req.user.id, students.length, itemColumns.length]
    );
    
    const assessmentId = assessmentResult.rows[0].id;
    
    // Insert items
    const itemIds = {};
    for (const itemCode of itemColumns) {
      const correctAnswer = keyRow ? keyRow[itemCode] : null;
      const itemResult = await client.query(
        `INSERT INTO items (assessment_id, item_code, correct_answer)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [assessmentId, itemCode, correctAnswer]
      );
      itemIds[itemCode] = itemResult.rows[0].id;
    }
    
    // Insert students and responses
    for (const studentRow of students) {
      // Insert student
      const studentResult = await client.query(
        `INSERT INTO students (assessment_id, student_code, gender)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [assessmentId, studentRow.StudentID, studentRow.Gender]
      );
      
      const studentId = studentResult.rows[0].id;
      
      // Insert responses
      let totalScore = 0;
      for (const itemCode of itemColumns) {
        const responseValue = studentRow[itemCode];
        const correctAnswer = keyRow ? keyRow[itemCode] : null;
        const isCorrect = responseValue && correctAnswer && 
                         responseValue.trim().toUpperCase() === correctAnswer.trim().toUpperCase();
        
        if (isCorrect) totalScore++;
        
        await client.query(
          `INSERT INTO responses (student_id, item_id, response_value, is_correct)
           VALUES ($1, $2, $3, $4)`,
          [studentId, itemIds[itemCode], responseValue, isCorrect]
        );
      }
      
      // Update student total score
      await client.query(
        'UPDATE students SET total_score = $1 WHERE id = $2',
        [totalScore, studentId]
      );
    }
    
    await client.query('COMMIT');
    
    // Trigger statistics calculation (async)
    calculateStatistics(assessmentId).catch(err => 
      console.error('Error calculating statistics:', err)
    );
    
    res.status(201).json({
      message: 'Assessment uploaded successfully',
      assessmentId
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload assessment: ' + error.message });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/assessments/:id
 * Delete an assessment
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      'DELETE FROM assessments WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    
    res.json({ message: 'Assessment deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete assessment' });
  }
});

/**
 * Calculate and store statistics for an assessment
 */
async function calculateStatistics(assessmentId) {
  try {
    // Get all students with responses
    const studentsResult = await query(
      `SELECT s.*, 
              json_agg(json_build_object(
                'item_id', r.item_id,
                'response_value', r.response_value,
                'is_correct', r.is_correct
              )) as responses
       FROM students s
       LEFT JOIN responses r ON r.student_id = s.id
       WHERE s.assessment_id = $1
       GROUP BY s.id`,
      [assessmentId]
    );
    
    const students = studentsResult.rows;
    const totalScores = students.map(s => parseFloat(s.total_score) || 0);
    
    // Calculate test-level statistics
    const descriptive = stats.calculateDescriptiveStats(totalScores);
    
    // Calculate item score matrix for Cronbach's alpha
    const itemsResult = await query(
      'SELECT id, item_code FROM items WHERE assessment_id = $1 ORDER BY item_code',
      [assessmentId]
    );
    const items = itemsResult.rows;
    
    // Build item score matrix
    const itemScoresMatrix = students.map(student => {
      return items.map(item => {
        const response = student.responses.find(r => r.item_id === item.id);
        return response && response.is_correct ? 1 : 0;
      });
    });
    
    const cronbachAlpha = stats.calculateCronbachAlpha(itemScoresMatrix);
    const sem = stats.calculateSEM(descriptive.stdev, cronbachAlpha);
    
    // Store test-level statistics
    const testStats = {
      'mean': descriptive.mean,
      'median': descriptive.median,
      'stdev': descriptive.stdev,
      'min': descriptive.min,
      'max': descriptive.max,
      'cronbach_alpha': cronbachAlpha,
      'sem': sem,
      'n': descriptive.n
    };
    
    for (const [statType, value] of Object.entries(testStats)) {
      if (value !== null) {
        await query(
          `INSERT INTO statistics (assessment_id, stat_type, stat_value)
           VALUES ($1, $2, $3)`,
          [assessmentId, statType, value]
        );
      }
    }
    
    // Calculate item-level statistics
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemColumn = itemScoresMatrix.map(row => row[i]);
      
      // Get all responses for this item
      const responsesResult = await query(
        `SELECT r.* FROM responses r
         JOIN students s ON s.id = r.student_id
         WHERE r.item_id = $1 AND s.assessment_id = $2`,
        [item.id, assessmentId]
      );
      
      const difficulty = stats.calculateDifficulty(responsesResult.rows);
      const discrimination = stats.calculateDiscrimination(students, item.id);
      const pointBiserial = stats.calculatePointBiserial(itemColumn, totalScores);
      
      // Store item statistics
      const itemStats = {
        'difficulty': difficulty,
        'discrimination': discrimination,
        'point_biserial': pointBiserial
      };
      
      for (const [statType, value] of Object.entries(itemStats)) {
        if (value !== null) {
          await query(
            `INSERT INTO statistics (assessment_id, item_id, stat_type, stat_value)
             VALUES ($1, $2, $3, $4)`,
            [assessmentId, item.id, statType, value]
          );
        }
      }
    }
    
    console.log(`✓ Statistics calculated for assessment ${assessmentId}`);
  } catch (error) {
    console.error('Error calculating statistics:', error);
    throw error;
  }
}

export default router;
