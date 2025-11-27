/**
 * Regional Assessment Splitter
 * Automatically splits regional assessments into country-specific assessments
 */

import { query, getClient } from '../db.js';
import { getUniqueMemberStates, getMemberStateFromCode } from './countryMapping.js';
import * as stats from './statistics.js';

/**
 * Check if an assessment is regional (contains multiple countries)
 * @param {number} assessmentId - Assessment ID to check
 * @returns {Promise<{isRegional: boolean, countries: Array}>}
 */
export async function detectRegionalAssessment(assessmentId) {
  const result = await query(
    `SELECT country, COUNT(*) as student_count
     FROM students
     WHERE assessment_id = $1 AND country IS NOT NULL
     GROUP BY country`,
    [assessmentId]
  );

  const countryCodes = result.rows.map(r => r.country);
  const uniqueMemberStates = getUniqueMemberStates(countryCodes);

  // Add student counts to member states
  const countriesWithCounts = uniqueMemberStates.map(memberState => {
    // Get all country codes that map to this member state
    const relevantCodes = countryCodes.filter(code => {
      const mapping = getMemberStateFromCode(code);
      return mapping && mapping.memberStateId === memberState.memberStateId;
    });

    // Sum up student counts for all codes mapping to this member state
    const totalStudents = result.rows
      .filter(row => relevantCodes.includes(row.country))
      .reduce((sum, row) => sum + parseInt(row.student_count), 0);

    return {
      ...memberState,
      studentCount: totalStudents
    };
  });

  return {
    isRegional: uniqueMemberStates.length > 1,
    countries: countriesWithCounts,
    countryCodes: countryCodes
  };
}

/**
 * Split a regional assessment into country-specific assessments
 * @param {number} regionalAssessmentId - ID of the regional assessment
 * @param {object} regionalAssessmentInfo - Info about the regional assessment
 * @returns {Promise<Array>} - Array of created country assessment IDs
 */
export async function splitRegionalAssessment(regionalAssessmentId, regionalAssessmentInfo) {
  console.log(`\n🌍 Splitting regional assessment ID ${regionalAssessmentId}...`);

  const { isRegional, countries, countryCodes } = await detectRegionalAssessment(regionalAssessmentId);

  if (!isRegional) {
    console.log('   Not a regional assessment (single country)');
    return [];
  }

  console.log(`   Found ${countries.length} countries:`);
  countries.forEach(c => console.log(`     - ${c.name}`));

  const createdAssessments = [];

  for (const memberState of countries) {
    try {
      console.log(`\n   📍 Processing ${memberState.name}...`);

      // Get student country codes that map to this member state
      const relevantCodes = countryCodes.filter(code => {
        const mapping = getMemberStateFromCode(code);
        return mapping && mapping.memberStateId === memberState.memberStateId;
      });

      // Count students for this country
      const countResult = await query(
        `SELECT COUNT(*) as count
         FROM students
         WHERE assessment_id = $1 AND country = ANY($2::text[])`,
        [regionalAssessmentId, relevantCodes]
      );

      const studentCount = parseInt(countResult.rows[0].count);
      console.log(`      Found ${studentCount} students`);

      // Check if country assessment already exists
      const existingResult = await query(
        `SELECT id FROM assessments
         WHERE country_id = $1 AND assessment_year = $2 AND name LIKE $3`,
        [memberState.memberStateId, regionalAssessmentInfo.assessment_year, `%${memberState.name}%`]
      );

      let countryAssessmentId;

      if (existingResult.rows.length > 0) {
        countryAssessmentId = existingResult.rows[0].id;
        console.log(`      ✓ Using existing assessment ID: ${countryAssessmentId}`);
      } else {
        // Create new country-specific assessment
        const newAssessmentResult = await query(
          `INSERT INTO assessments (name, country_id, assessment_year, uploaded_by, upload_date, student_count, item_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [
            `${regionalAssessmentInfo.assessment_year} OERA - ${memberState.name}`,
            memberState.memberStateId,
            regionalAssessmentInfo.assessment_year,
            regionalAssessmentInfo.uploaded_by,
            regionalAssessmentInfo.upload_date,
            studentCount,
            regionalAssessmentInfo.item_count
          ]
        );

        countryAssessmentId = newAssessmentResult.rows[0].id;
        console.log(`      ✓ Created new assessment ID: ${countryAssessmentId}`);

        // Copy items FIRST (before responses, since responses need to join with items)
        await query(
          `INSERT INTO items (assessment_id, item_code, content_domain, cognitive_level, correct_answer)
           SELECT $1, item_code, content_domain, cognitive_level, correct_answer
           FROM items
           WHERE assessment_id = $2
           ON CONFLICT (assessment_id, item_code) DO NOTHING`,
          [countryAssessmentId, regionalAssessmentId]
        );

        console.log(`      ✓ Copied items`);

        // Copy students to new assessment
        await query(
          `INSERT INTO students (assessment_id, student_code, gender, total_score, country)
           SELECT $1, student_code, gender, total_score, country
           FROM students
           WHERE assessment_id = $2 AND country = ANY($3::text[])`,
          [countryAssessmentId, regionalAssessmentId, relevantCodes]
        );

        console.log(`      ✓ Copied students`);

        // Copy responses for these students (map item_id by item_code)
        await query(
          `INSERT INTO responses (student_id, item_id, response_value, is_correct)
           SELECT s_new.id, i_new.id, r.response_value, r.is_correct
           FROM responses r
           JOIN students s_old ON r.student_id = s_old.id
           JOIN students s_new ON s_new.student_code = s_old.student_code
             AND s_new.assessment_id = $1
           JOIN items i_old ON r.item_id = i_old.id
           JOIN items i_new ON i_new.item_code = i_old.item_code
             AND i_new.assessment_id = $1
           WHERE s_old.assessment_id = $2 AND s_old.country = ANY($3::text[])
           ON CONFLICT (student_id, item_id) DO NOTHING`,
          [countryAssessmentId, regionalAssessmentId, relevantCodes]
        );

        console.log(`      ✓ Copied responses`);

        // Calculate statistics for the country assessment
        console.log(`      📊 Calculating statistics...`);
        await calculateCountryStatistics(countryAssessmentId);
        console.log(`      ✓ Statistics calculated`);

        createdAssessments.push({
          id: countryAssessmentId,
          name: memberState.name,
          memberStateId: memberState.memberStateId,
          studentCount
        });
      }
    } catch (error) {
      console.error(`   ❌ Error processing ${memberState.name}:`, error.message);
      // Continue with other countries even if one fails
    }
  }

  console.log(`\n✅ Regional assessment split complete!`);
  console.log(`   Created ${createdAssessments.length} country-specific assessments`);

  return createdAssessments;
}

/**
 * Calculate statistics for a country assessment
 * (Simplified version for use during splitting)
 */
async function calculateCountryStatistics(assessmentId) {
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

  // Get items
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

  for (const [statType, value] of Object.entries(testStats)) {
    if (value !== null && value !== undefined) {
      await query(
        `INSERT INTO statistics (assessment_id, stat_type, stat_value)
         VALUES ($1, $2, $3)`,
        [assessmentId, statType, value]
      );
    }
  }

  // Calculate and store performance levels
  const maxScore = items.length;
  const performanceLevels = stats.calculatePerformanceLevels(totalScores, maxScore);

  if (performanceLevels) {
    await query(
      `INSERT INTO statistics (assessment_id, stat_type, stat_value)
       VALUES ($1, $2, $3)`,
      [assessmentId, 'sdg_mpl_percentage', performanceLevels.sdg_indicator.mpl_percentage]
    );

    await query(
      `INSERT INTO statistics (assessment_id, stat_type, stat_value)
       VALUES ($1, $2, $3)`,
      [assessmentId, 'perf_below_minimum', performanceLevels.levels.below_minimum.count]
    );
    await query(
      `INSERT INTO statistics (assessment_id, stat_type, stat_value)
       VALUES ($1, $2, $3)`,
      [assessmentId, 'perf_minimum', performanceLevels.levels.minimum.count]
    );
    await query(
      `INSERT INTO statistics (assessment_id, stat_type, stat_value)
       VALUES ($1, $2, $3)`,
      [assessmentId, 'perf_moderate', performanceLevels.levels.moderate.count]
    );
    await query(
      `INSERT INTO statistics (assessment_id, stat_type, stat_value)
       VALUES ($1, $2, $3)`,
      [assessmentId, 'perf_advanced', performanceLevels.levels.advanced.count]
    );
  }

  // Calculate item-level statistics
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemColumn = itemScoresMatrix.map(row => row[i]);

    const difficulty = stats.calculateDifficulty(students, item.id);
    const discrimination = stats.calculateDiscrimination(students, item.id);
    const pointBiserial = stats.calculatePointBiserial(itemColumn, totalScores);

    // Store item statistics
    const itemStats = {
      'difficulty': difficulty,
      'discrimination': discrimination,
      'point_biserial': pointBiserial
    };

    for (const [statType, value] of Object.entries(itemStats)) {
      if (value !== null && value !== undefined) {
        await query(
          `INSERT INTO statistics (assessment_id, item_id, stat_type, stat_value)
           VALUES ($1, $2, $3, $4)`,
          [assessmentId, item.id, statType, value]
        );
      }
    }
  }
}
