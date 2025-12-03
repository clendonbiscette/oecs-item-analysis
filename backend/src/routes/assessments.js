import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, getClient } from '../db.js';
import { authMiddleware, canModify, enforceCountryAccess, filterByUserCountry } from '../middleware/auth.js';
import * as stats from '../utils/statistics.js';
import { parseOERAFile, scoreResponse } from '../utils/parse-oera-file.js';
import { generateExcelReport } from '../services/excelExport.js';
import { detectRegionalAssessment, splitRegionalAssessment } from '../utils/regionalSplitter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: process.env.UPLOAD_DIR || '/tmp/uploads/',
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
 * GET /api/assessments/template/download
 * Download CSV template for data upload
 */
router.get('/template/download', (req, res) => {
  try {
    const templatePath = path.join(__dirname, '../../templates/oera_template.csv');
    res.download(templatePath, 'OERA_Upload_Template.csv', (err) => {
      if (err) {
        console.error('Template download error:', err);
        res.status(500).json({ error: 'Failed to download template' });
      }
    });
  } catch (error) {
    console.error('Template download error:', error);
    res.status(500).json({ error: 'Failed to download template' });
  }
});

/**
 * GET /api/assessments/:id/export/excel
 * Export assessment data to Excel
 */
router.get('/:id/export/excel', enforceCountryAccess, async (req, res) => {
  try {
    const { id } = req.params;

    // Get assessment name for filename
    const assessmentResult = await query(
      'SELECT name, assessment_year FROM assessments WHERE id = $1',
      [id]
    );

    if (assessmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const assessment = assessmentResult.rows[0];
    const filename = `${assessment.name}_${assessment.assessment_year}_Item_Analysis.xlsx`;

    // Generate Excel workbook
    const workbook = await generateExcelReport(id);

    // Write to buffer
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Send file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);

  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ error: 'Failed to export to Excel: ' + error.message });
  }
});

/**
 * GET /api/assessments
 * List assessments filtered by user's role and country
 */
router.get('/', async (req, res) => {
  try {
    // Get filter based on user's role and country
    const filter = filterByUserCountry(req.user.id, req.user.role, req.user.country_id);

    const queryText = `SELECT a.*, u.full_name as uploaded_by_name,
              ms.state_name, ms.state_code
       FROM assessments a
       LEFT JOIN users u ON a.uploaded_by = u.id
       LEFT JOIN member_states ms ON a.country_id = ms.id
       ${filter.whereClause}
       ORDER BY a.upload_date DESC`;

    const result = await query(queryText, filter.params);

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
router.get('/:id', enforceCountryAccess, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT a.*, u.full_name as uploaded_by_name,
              ms.state_name, ms.state_code
       FROM assessments a
       LEFT JOIN users u ON a.uploaded_by = u.id
       LEFT JOIN member_states ms ON a.country_id = ms.id
       WHERE a.id = $1`,
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

    console.log(`Validating file: ${req.file.originalname}, type: ${req.file.mimetype}`);

    // Parse file using new OERA-specific parser
    let parsed;
    try {
      parsed = parseOERAFile(req.file.path, req.file.mimetype);
    } catch (parseError) {
      console.error('Parse error:', parseError);
      return res.status(400).json({
        validation: {
          valid: false,
          errors: [parseError.message],
          warnings: [],
          summary: {}
        },
        preview: []
      });
    }

    const { students, answerKey, items, itemsMetadata, metadata } = parsed;

    // Validation
    const validation = {
      valid: true,
      warnings: [],
      errors: [],
      summary: {}
    };

    if (students.length === 0) {
      validation.valid = false;
      validation.errors.push('No student data found');
    }

    if (items.length === 0) {
      validation.valid = false;
      validation.errors.push('No items (questions) found');
    }

    if (Object.keys(answerKey).length === 0) {
      validation.warnings.push('No answer key found');
    }

    // Check for missing responses
    let totalResponses = 0;
    let missingResponses = 0;

    students.forEach(student => {
      items.forEach(item => {
        totalResponses++;
        if (!student.responses[item] || student.responses[item] === '') {
          missingResponses++;
        }
      });
    });

    const missingPercent = totalResponses > 0 ? ((missingResponses / totalResponses) * 100).toFixed(1) : 0;

    if (missingResponses > 0) {
      validation.warnings.push(`${missingResponses} missing responses (${missingPercent}%)`);
    }

    // Warn about multiple responses
    if (metadata.multipleResponseCount > 0) {
      validation.warnings.push(`${metadata.multipleResponseCount} responses have multiple answers (e.g., "A C"). These will be marked as incorrect.`);
    }

    // Warn about duplicate student IDs within countries
    if (metadata.duplicatesRemoved > 0) {
      const duplicatesByCountry = {};
      metadata.duplicateWarnings.forEach(({ country, studentId, duplicatesRemoved }) => {
        if (!duplicatesByCountry[country]) {
          duplicatesByCountry[country] = [];
        }
        duplicatesByCountry[country].push(`${studentId} (${duplicatesRemoved} duplicate${duplicatesRemoved > 1 ? 's' : ''})`);
      });

      const warningMessages = Object.entries(duplicatesByCountry).map(([country, duplicates]) => {
        return `${country}: ${duplicates.join(', ')}`;
      });

      validation.warnings.push(
        `Found ${metadata.duplicatesRemoved} duplicate student ID${metadata.duplicatesRemoved > 1 ? 's' : ''} within countries. Kept first occurrence only. ${warningMessages.join(' | ')}`
      );
    }

    // Summary
    validation.summary = {
      studentCount: students.length,
      itemCount: items.length,
      hasAnswerKey: Object.keys(answerKey).length > 0,
      missingResponses,
      multipleResponses: metadata.multipleResponseCount,
      duplicatesRemoved: metadata.duplicatesRemoved || 0
    };

    // Preview (first 10 students)
    const preview = students.slice(0, 10).map(student => ({
      studentId: student.studentId,
      name: student.name,
      gender: student.gender,
      responses: items.slice(0, 5).map(item => student.responses[item] || '')
    }));

    res.json({
      validation,
      preview,
      fileInfo: {
        filename: req.file.originalname,
        path: req.file.path,
        itemColumns: items,
        hasAnswerKey: Object.keys(answerKey).length > 0
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
router.post('/upload/confirm', canModify, upload.single('file'), async (req, res) => {
  const client = await getClient();

  try {
    const { assessmentName, assessmentYear, country } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`Processing file: ${req.file.originalname}`);
    console.log(`Assessment: ${assessmentName}, Year: ${assessmentYear}, Country: ${country}`);

    // Parse file using OERA-specific parser
    const parsed = parseOERAFile(req.file.path, req.file.mimetype);
    const { students, answerKey, items, itemsMetadata } = parsed;

    await client.query('BEGIN');

    // Look up country_id from member_states
    let countryId = null;
    if (country && country !== 'Regional') {
      const countryResult = await client.query(
        `SELECT id FROM member_states
         WHERE state_name = $1 OR state_code = $1
         LIMIT 1`,
        [country]
      );
      if (countryResult.rows.length > 0) {
        countryId = countryResult.rows[0].id;
      }
    }

    // For regional uploads, keep country_id as null
    if (country === 'Regional') {
      console.log('Regional upload detected - will split into country assessments');
    }

    // Create assessment with country_id
    const assessmentResult = await client.query(
      `INSERT INTO assessments (name, assessment_year, country, country_id, uploaded_by, student_count, item_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [assessmentName, assessmentYear, country, countryId, req.user.id, students.length, items.length]
    );

    const assessmentId = assessmentResult.rows[0].id;
    console.log(`Created assessment ID: ${assessmentId}`);

    // =========================================================================
    // OPTIMIZED: Batch insert items (reduces N queries to 1 query)
    // =========================================================================
    const itemIds = {};
    if (items.length > 0) {
      // Build batch insert query: INSERT INTO items VALUES ($1,$2,$3,$4,$5), ...
      const itemValues = [];
      const itemParams = [];
      let paramIndex = 1;

      for (const itemCode of items) {
        const correctAnswer = answerKey[itemCode] || null;
        const metadata = itemsMetadata[itemCode] || { itemType: 'MC', maxPoints: 1, correctAnswer };

        itemValues.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4})`);
        itemParams.push(
          assessmentId,
          itemCode,
          metadata.correctAnswer, // NULL for CR items
          metadata.maxPoints,
          metadata.itemType
        );
        paramIndex += 5;
      }

      const itemResult = await client.query(
        `INSERT INTO items (assessment_id, item_code, correct_answer, max_points, item_type)
         VALUES ${itemValues.join(', ')}
         RETURNING id, item_code`,
        itemParams
      );

      // Map item codes to IDs
      itemResult.rows.forEach(row => {
        itemIds[row.item_code] = row.id;
      });

      console.log(`✓ Batch inserted ${items.length} items in 1 query`);
    }

    // =========================================================================
    // OPTIMIZED: Batch insert students (reduces N queries to 1 query)
    // =========================================================================
    const studentIdMap = {};  // Map studentCode to database ID
    let skippedDuplicates = 0;

    if (students.length > 0) {
      // Pre-calculate scores for all students (using weighted scoring)
      const studentsWithScores = students.map(student => {
        let totalScore = 0;
        for (const itemCode of items) {
          const responseValue = student.responses[itemCode] || '';
          const correctAnswer = answerKey[itemCode];
          const metadata = itemsMetadata[itemCode];
          const { pointsEarned } = scoreResponse(responseValue, correctAnswer, metadata);
          totalScore += pointsEarned;
        }
        return { ...student, totalScore };
      });

      // Build batch insert query for students
      const studentValues = [];
      const studentParams = [];
      let paramIndex = 1;

      for (const student of studentsWithScores) {
        studentValues.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7})`);
        studentParams.push(
          assessmentId,
          student.studentId,
          student.gender,
          student.country,
          student.totalScore,
          student.school || null,
          student.schoolType || null,
          student.district || null
        );
        paramIndex += 8;
      }

      try {
        const studentResult = await client.query(
          `INSERT INTO students (assessment_id, student_code, gender, country, total_score, school, school_type, district)
           VALUES ${studentValues.join(', ')}
           ON CONFLICT (assessment_id, student_code, country) DO NOTHING
           RETURNING id, student_code, country`,
          studentParams
        );

        // Map student codes to IDs
        studentResult.rows.forEach(row => {
          const key = `${row.student_code}:${row.country || ''}`;
          studentIdMap[key] = row.id;
        });

        skippedDuplicates = students.length - studentResult.rows.length;
        console.log(`✓ Batch inserted ${studentResult.rows.length} students in 1 query`);
        if (skippedDuplicates > 0) {
          console.log(`⚠️  Skipped ${skippedDuplicates} duplicate students`);
        }
      } catch (error) {
        // If batch insert fails, we need to rollback and restart the transaction
        console.warn('Batch student insert failed, rolling back transaction and falling back to individual inserts');
        console.error('Batch error:', error.message);

        await client.query('ROLLBACK');
        await client.query('BEGIN');

        // Re-insert assessment since we rolled back (using correct column names)
        const reinsertAssessment = await client.query(
          `INSERT INTO assessments (name, assessment_year, country, country_id, uploaded_by, student_count, item_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [assessmentName, assessmentYear, country, countryId, req.user.id, students.length, items.length]
        );
        assessmentId = reinsertAssessment.rows[0].id;

        // Re-insert items since we rolled back
        const itemResult = await client.query(
          `INSERT INTO items (assessment_id, item_code, correct_answer, max_points, item_type)
           VALUES ${itemValues.join(', ')}
           RETURNING id, item_code`,
          itemParams
        );
        itemResult.rows.forEach(row => {
          itemIds[row.item_code] = row.id;
        });

        // Now do individual student inserts
        for (const student of studentsWithScores) {
          try {
            const result = await client.query(
              `INSERT INTO students (assessment_id, student_code, gender, country, total_score, school, school_type, district)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (assessment_id, student_code, country) DO NOTHING
               RETURNING id, student_code, country`,
              [assessmentId, student.studentId, student.gender, student.country, student.totalScore, student.school || null, student.schoolType || null, student.district || null]
            );
            if (result.rows.length > 0) {
              const key = `${student.studentId}:${student.country || ''}`;
              studentIdMap[key] = result.rows[0].id;
            } else {
              skippedDuplicates++;
            }
          } catch (dupError) {
            if (dupError.code === '23505') {
              skippedDuplicates++;
            } else {
              throw dupError;
            }
          }
        }
      }
    }

    // =========================================================================
    // OPTIMIZED: Batch insert responses (reduces N*M queries to 1 query)
    // =========================================================================
    if (Object.keys(studentIdMap).length > 0 && items.length > 0) {
      const allResponseData = [];
      let responseCount = 0;
      const processedStudents = new Set(); // Track which students we've already processed responses for

      for (const student of students) {
        const studentKey = `${student.studentId}:${student.country || ''}`;
        const studentDbId = studentIdMap[studentKey];

        if (!studentDbId) continue; // Skip if student was not inserted (duplicate)

        // Skip if we've already processed responses for this student
        // (handles case where Excel has duplicate rows for same student)
        if (processedStudents.has(studentDbId)) continue;
        processedStudents.add(studentDbId);

        for (const itemCode of items) {
          const responseValue = student.responses[itemCode] || '';
          const correctAnswer = answerKey[itemCode];
          const metadata = itemsMetadata[itemCode];
          const { isCorrect, pointsEarned } = scoreResponse(responseValue, correctAnswer, metadata);

          allResponseData.push([studentDbId, itemIds[itemCode], responseValue, isCorrect, pointsEarned]);
          responseCount++;
        }
      }

      if (allResponseData.length > 0) {
        // Insert in chunks of 10000 to avoid parameter limit
        const chunkSize = 10000;
        let insertedCount = 0;

        for (let i = 0; i < allResponseData.length; i += chunkSize) {
          const chunkData = allResponseData.slice(i, i + chunkSize);

          // Build VALUES placeholders and params for this chunk only
          const chunkValues = [];
          const chunkParams = [];
          let paramIndex = 1;

          for (const data of chunkData) {
            chunkValues.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4})`);
            chunkParams.push(...data);
            paramIndex += 5;
          }

          await client.query(
            `INSERT INTO responses (student_id, item_id, response_value, is_correct, points_earned)
             VALUES ${chunkValues.join(', ')}`,
            chunkParams
          );
          insertedCount += chunkData.length;

          if (allResponseData.length > chunkSize) {
            console.log(`  Processed ${insertedCount}/${allResponseData.length} responses...`);
          }
        }

        console.log(`✓ Batch inserted ${responseCount} responses in ${Math.ceil(allResponseData.length / chunkSize)} ${allResponseData.length > chunkSize ? 'queries' : 'query'}`);
      }
    }

    await client.query('COMMIT');

    // ✅ FIX: Release client IMMEDIATELY after COMMIT to prevent pool exhaustion
    // This allows calculateStatistics() to use pool connections without deadlocking
    client.release();

    // Calculate statistics for the regional/main assessment
    // Now safe to make additional queries without holding transaction client
    await calculateStatistics(assessmentId);

    // Calculate DIF statistics (Gender and Percentile pre-calculated)
    await calculateDIFStatistics(assessmentId);

    // Check if this is a regional assessment (but don't split automatically)
    const { isRegional, countries } = await detectRegionalAssessment(assessmentId);

    if (isRegional) {
      console.log(`\n🌍 Regional assessment detected with ${countries.length} countries`);
      console.log('   Countries found:');
      countries.forEach(c => console.log(`     - ${c.name}: ${c.studentCount || 'N/A'} students`));
      console.log('   User will be prompted to split into country assessments\n');
    }

    res.status(201).json({
      message: 'Assessment uploaded successfully',
      assessmentId,
      isRegional,
      countries: countries.map(c => ({
        memberStateId: c.memberStateId,
        name: c.name,
        code: c.code
      }))
    });

  } catch (error) {
    // Only rollback and release if we still have the client
    if (client) {
      await client.query('ROLLBACK');
      client.release();
    }
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload assessment: ' + error.message });
  }
});

/**
 * DELETE /api/assessments/:id
 * Delete an assessment
 */
router.delete('/:id', canModify, enforceCountryAccess, async (req, res) => {
  try {
    const { id } = req.params;

    // Get assessment info before deletion for audit log
    const assessmentInfo = await query(
      'SELECT name FROM assessments WHERE id = $1',
      [id]
    );

    if (assessmentInfo.rows.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const result = await query(
      'DELETE FROM assessments WHERE id = $1 RETURNING id',
      [id]
    );

    // Log the deletion
    await req.audit.logAssessment({
      actionType: 'delete',
      assessmentId: id,
      assessmentName: assessmentInfo.rows[0].name
    });

    res.json({ message: 'Assessment deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    await req.audit.logFailure({
      actionType: 'delete',
      resourceType: 'assessment',
      description: `Failed to delete assessment ID ${req.params.id}`,
      errorMessage: error.message
    });
    res.status(500).json({ error: 'Failed to delete assessment' });
  }
});

/**
 * POST /api/assessments/:id/split
 * Split a regional assessment into country-specific assessments
 */
router.post('/:id/split', canModify, enforceCountryAccess, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify assessment exists
    const assessmentResult = await query(
      'SELECT assessment_year, uploaded_by, upload_date, item_count, name FROM assessments WHERE id = $1',
      [id]
    );

    if (assessmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const assessmentInfo = assessmentResult.rows[0];

    // Check if it's regional
    const { isRegional, countries } = await detectRegionalAssessment(id);

    if (!isRegional) {
      return res.status(400).json({ error: 'This assessment is not regional (contains only one country)' });
    }

    console.log(`\n🌍 Splitting regional assessment ID ${id} into ${countries.length} country assessments...`);

    // Split into country assessments
    const countryAssessments = await splitRegionalAssessment(id, assessmentInfo);

    console.log(`   ✅ Split complete! Created ${countryAssessments.length} country-specific assessments\n`);

    res.json({
      message: 'Regional assessment split successfully',
      countryAssessments: countryAssessments.map(ca => ({
        id: ca.id,
        name: ca.name,
        memberStateId: ca.memberStateId,
        studentCount: ca.studentCount
      }))
    });

  } catch (error) {
    console.error('Split error:', error);
    res.status(500).json({ error: 'Failed to split assessment: ' + error.message });
  }
});

/**
 * Calculate and store statistics for an assessment
 */
async function calculateStatistics(assessmentId) {
  try {
    // Get all students with responses (including points_earned for weighted scoring)
    const studentsResult = await query(
      `SELECT s.*,
              json_agg(json_build_object(
                'item_id', r.item_id,
                'response_value', r.response_value,
                'is_correct', r.is_correct,
                'points_earned', r.points_earned
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
    
    // Calculate item score matrix for Cronbach's alpha (including max_points for weighted scoring)
    const itemsResult = await query(
      'SELECT id, item_code, max_points, item_type FROM items WHERE assessment_id = $1 ORDER BY item_code',
      [assessmentId]
    );
    const items = itemsResult.rows;

    // Build item score matrix using points_earned (works for both MC and CR items)
    const itemScoresMatrix = students.map(student => {
      return items.map(item => {
        const response = student.responses.find(r => r.item_id === item.id);
        return response && response.points_earned !== null ? parseFloat(response.points_earned) : 0;
      });
    });
    
    const cronbachAlpha = stats.calculateCronbachAlpha(itemScoresMatrix);
    const sem = stats.calculateSEM(descriptive.stdev, cronbachAlpha);
    const splitHalf = stats.calculateSplitHalfReliability(itemScoresMatrix);

    // Store test-level statistics
    const testStats = {
      'mean': descriptive.mean,
      'median': descriptive.median,
      'mode': descriptive.mode,
      'stdev': descriptive.stdev,
      'variance': descriptive.variance,
      'skewness': descriptive.skewness,
      'kurtosis': descriptive.kurtosis,
      'min': descriptive.min,
      'max': descriptive.max,
      'cronbach_alpha': cronbachAlpha,
      'split_half_reliability': splitHalf,
      'sem': sem,
      'n': descriptive.n
    };

    // Collect all statistics for batch insert
    const allStats = [];

    // Add test-level statistics
    for (const [statType, value] of Object.entries(testStats)) {
      if (value !== null) {
        allStats.push({ assessmentId, itemId: null, statType, value });
      }
    }

    // Calculate and add performance levels
    // For weighted assessments: sum of all max_points. For unweighted: items.length
    const maxScore = items.reduce((sum, item) => sum + (parseInt(item.max_points) || 1), 0);
    const performanceLevels = stats.calculatePerformanceLevels(totalScores, maxScore);

    if (performanceLevels) {
      allStats.push({ assessmentId, itemId: null, statType: 'sdg_mpl_percentage', value: performanceLevels.sdg_indicator.mpl_percentage });
      allStats.push({ assessmentId, itemId: null, statType: 'perf_below_minimum', value: performanceLevels.levels.below_minimum.count });
      allStats.push({ assessmentId, itemId: null, statType: 'perf_minimum', value: performanceLevels.levels.minimum.count });
      allStats.push({ assessmentId, itemId: null, statType: 'perf_moderate', value: performanceLevels.levels.moderate.count });
      allStats.push({ assessmentId, itemId: null, statType: 'perf_high', value: performanceLevels.levels.high.count });
      allStats.push({ assessmentId, itemId: null, statType: 'perf_advanced', value: performanceLevels.levels.advanced.count });
    }

    // Calculate item-level statistics
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemColumn = itemScoresMatrix.map(row => row[i]);
      const itemMaxPoints = parseInt(item.max_points) || 1;

      const difficulty = stats.calculateDifficulty(students, item.id, itemMaxPoints);
      const discrimination = stats.calculateDiscrimination(students, item.id, itemMaxPoints);
      const pointBiserial = stats.calculatePointBiserial(itemColumn, totalScores);

      // Add item statistics to batch
      if (difficulty !== null) allStats.push({ assessmentId, itemId: item.id, statType: 'difficulty', value: difficulty });
      if (discrimination !== null) allStats.push({ assessmentId, itemId: item.id, statType: 'discrimination', value: discrimination });
      if (pointBiserial !== null) allStats.push({ assessmentId, itemId: item.id, statType: 'point_biserial', value: pointBiserial });
    }

    // Batch insert all statistics in one query
    if (allStats.length > 0) {
      const values = [];
      const params = [];
      let paramIndex = 1;

      for (const stat of allStats) {
        values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3})`);
        params.push(stat.assessmentId, stat.itemId, stat.statType, stat.value);
        paramIndex += 4;
      }

      await query(
        `INSERT INTO statistics (assessment_id, item_id, stat_type, stat_value)
         VALUES ${values.join(', ')}`,
        params
      );

      console.log(`✓ Statistics calculated and inserted (${allStats.length} stats) for assessment ${assessmentId}`);
    }
  } catch (error) {
    console.error('Error calculating statistics:', error);
    throw error;
  }
}

/**
 * Calculate and store DIF statistics for an assessment
 * Pre-calculates Gender DIF and Percentile DIF
 * Country DIF and Country-Gender DIF are calculated on-demand
 */
async function calculateDIFStatistics(assessmentId) {
  try {
    const { calculateGenderDIF, calculatePercentileDIF } = await import('../utils/dif.js');

    // Get students with responses
    const studentsResult = await query(
      `SELECT s.*,
              json_agg(json_build_object(
                'item_id', r.item_id,
                'response_value', r.response_value,
                'is_correct', r.is_correct,
                'points_earned', r.points_earned
              )) as responses
       FROM students s
       LEFT JOIN responses r ON r.student_id = s.id
       WHERE s.assessment_id = $1
       GROUP BY s.id`,
      [assessmentId]
    );

    const students = studentsResult.rows;

    // Get items
    const itemsResult = await query(
      'SELECT * FROM items WHERE assessment_id = $1 ORDER BY item_code',
      [assessmentId]
    );

    const items = itemsResult.rows;

    // Calculate DIF types (pre-calculated)
    const genderDIF = calculateGenderDIF(students, items);
    const percentileDIF = calculatePercentileDIF(students, items);
    const allDIF = [...genderDIF, ...percentileDIF];

    // Batch insert DIF statistics
    if (allDIF.length > 0) {
      const values = [];
      const params = [];
      let paramIndex = 1;

      for (const dif of allDIF) {
        values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10})`);
        params.push(
          dif.assessmentId,
          dif.itemId,
          dif.difType,
          dif.groupA,
          dif.groupB,
          dif.difficultyA,
          dif.difficultyB,
          dif.difScore,
          dif.classification,
          dif.sampleSizeA,
          dif.sampleSizeB
        );
        paramIndex += 11;
      }

      await query(
        `INSERT INTO dif_statistics
         (assessment_id, item_id, dif_type, group_a, group_b, difficulty_a, difficulty_b, dif_score, dif_classification, sample_size_a, sample_size_b)
         VALUES ${values.join(', ')}`,
        params
      );

      console.log(`✓ DIF statistics calculated (${allDIF.length} records) for assessment ${assessmentId}`);
    } else {
      console.log(`⚠ No DIF statistics calculated for assessment ${assessmentId} (insufficient data)`);
    }
  } catch (error) {
    console.error('Error calculating DIF statistics:', error);
    // Non-blocking: don't throw, just log error
  }
}

export default router;
