import { query } from './src/db.js';
import * as stats from './src/utils/statistics.js';

/**
 * Calculate and store statistics for an assessment
 */
async function calculateStatistics(assessmentId) {
  try {
    console.log(`\nCalculating statistics for assessment ${assessmentId}...`);

    // Delete existing statistics
    await query('DELETE FROM statistics WHERE assessment_id = $1', [assessmentId]);

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

    console.log(`  Found ${students.length} students`);

    // Calculate test-level statistics
    const descriptive = stats.calculateDescriptiveStats(totalScores);

    // Calculate item score matrix for Cronbach's alpha (including max_points for weighted scoring)
    const itemsResult = await query(
      'SELECT id, item_code, max_points, item_type FROM items WHERE assessment_id = $1 ORDER BY item_code',
      [assessmentId]
    );
    const items = itemsResult.rows;

    console.log(`  Found ${items.length} items`);

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
    // For weighted assessments: sum of all max_points. For unweighted: items.length
    const maxScore = items.reduce((sum, item) => sum + (parseInt(item.max_points) || 1), 0);
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

    console.log(`  ✅ Statistics calculated successfully`);
    console.log(`     Mean: ${descriptive.mean.toFixed(2)}, SD: ${descriptive.stdev.toFixed(2)}`);
    console.log(`     Cronbach's α: ${cronbachAlpha !== null ? cronbachAlpha.toFixed(3) : 'N/A'}`);

  } catch (error) {
    console.error(`  ❌ Error calculating statistics for assessment ${assessmentId}:`, error);
    throw error;
  }
}

async function main() {
  console.log('Calculating statistics for country-specific assessments...\n');

  // Get all assessments that need statistics (IDs 4-10)
  const assessmentsResult = await query(
    'SELECT id, name FROM assessments WHERE id >= 4 ORDER BY id'
  );

  console.log(`Found ${assessmentsResult.rows.length} assessments to process:`);
  assessmentsResult.rows.forEach(a => {
    console.log(`  - ID ${a.id}: ${a.name}`);
  });

  for (const assessment of assessmentsResult.rows) {
    await calculateStatistics(assessment.id);
  }

  console.log('\n✅ All statistics calculated successfully!');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Failed to calculate statistics:', err);
  process.exit(1);
});
