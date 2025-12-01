import express from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import * as stats from '../utils/statistics.js';

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/statistics/:assessmentId
 * Get all statistics for an assessment
 */
router.get('/:assessmentId', async (req, res) => {
  try {
    const { assessmentId } = req.params;
    
    // Get test-level statistics
    const testStatsResult = await query(
      `SELECT stat_type, stat_value 
       FROM statistics 
       WHERE assessment_id = $1 AND item_id IS NULL`,
      [assessmentId]
    );
    
    const testStats = {};
    testStatsResult.rows.forEach(row => {
      testStats[row.stat_type] = parseFloat(row.stat_value);
    });

    // Add interpretations
    if (testStats.cronbach_alpha) {
      testStats.cronbach_alpha_interpretation = stats.interpretAlpha(testStats.cronbach_alpha);
    }
    if (testStats.skewness !== undefined) {
      testStats.skewness_interpretation = stats.interpretSkewness(testStats.skewness);
    }
    if (testStats.kurtosis !== undefined) {
      testStats.kurtosis_interpretation = stats.interpretKurtosis(testStats.kurtosis);
    }
    
    // Get item-level statistics (including max_points and item_type for weighted scoring)
    const itemStatsResult = await query(
      `SELECT i.id, i.item_code, i.correct_answer, i.max_points, i.item_type,
              s.stat_type, s.stat_value
       FROM items i
       LEFT JOIN statistics s ON s.item_id = i.id
       WHERE i.assessment_id = $1
       ORDER BY i.item_code, s.stat_type`,
      [assessmentId]
    );

    // Group by item
    const itemsMap = {};
    itemStatsResult.rows.forEach(row => {
      if (!itemsMap[row.item_code]) {
        itemsMap[row.item_code] = {
          id: row.id,
          item_code: row.item_code,
          correct_answer: row.correct_answer,
          max_points: parseInt(row.max_points) || 1,
          item_type: row.item_type || 'MC',
          statistics: {}
        };
      }
      if (row.stat_type) {
        itemsMap[row.item_code].statistics[row.stat_type] = parseFloat(row.stat_value);
      }
    });
    
    // Add interpretations and status for each item
    const items = Object.values(itemsMap).map(item => {
      const difficulty = item.statistics.difficulty;
      const discrimination = item.statistics.discrimination;
      const pointBiserial = item.statistics.point_biserial;
      
      return {
        ...item,
        difficulty_interpretation: difficulty !== undefined ? 
          stats.interpretDifficulty(difficulty) : null,
        discrimination_interpretation: discrimination !== undefined ? 
          stats.interpretDiscrimination(discrimination) : null,
        point_biserial_interpretation: pointBiserial !== undefined ? 
          stats.interpretPointBiserial(pointBiserial) : null,
        status: stats.calculateItemStatus(difficulty, discrimination, pointBiserial)
      };
    });
    
    // Calculate assessment metadata (total points, item counts)
    const totalMaxPoints = items.reduce((sum, item) => sum + item.max_points, 0);
    const mcCount = items.filter(item => item.item_type === 'MC').length;
    const crCount = items.filter(item => item.item_type === 'CR').length;
    const isWeighted = crCount > 0 || items.some(item => item.max_points > 1);

    res.json({
      testStatistics: testStats,
      itemStatistics: items,
      assessmentMetadata: {
        totalItems: items.length,
        totalMaxPoints,
        mcCount,
        crCount,
        isWeighted
      }
    });
    
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * GET /api/statistics/:assessmentId/distractors
 * Get distractor analysis for all items in an assessment
 */
router.get('/:assessmentId/distractors', async (req, res) => {
  try {
    const { assessmentId } = req.params;

    // Get all items
    const itemsResult = await query(
      `SELECT id, item_code, correct_answer
       FROM items
       WHERE assessment_id = $1
       ORDER BY item_code`,
      [assessmentId]
    );

    if (itemsResult.rows.length === 0) {
      return res.json([]);
    }

    // Get all students with responses
    const studentsResult = await query(
      `SELECT s.id, s.total_score,
              json_agg(json_build_object(
                'item_id', r.item_id,
                'response_value', r.response_value,
                'is_correct', r.is_correct
              ) ORDER BY i.item_code) as responses
       FROM students s
       LEFT JOIN responses r ON r.student_id = s.id
       LEFT JOIN items i ON i.id = r.item_id
       WHERE s.assessment_id = $1
       GROUP BY s.id
       ORDER BY s.total_score DESC`,
      [assessmentId]
    );

    const students = studentsResult.rows;

    // Calculate distractor analysis for each item
    const allDistractors = itemsResult.rows.map(item => {
      const distractorAnalysis = stats.analyzeDistractors(item, students);

      return {
        item_id: item.id,
        item_code: item.item_code,
        correct_answer: item.correct_answer,
        distractors: distractorAnalysis
      };
    });

    res.json(allDistractors);

  } catch (error) {
    console.error('Error fetching all distractor analysis:', error);
    res.status(500).json({ error: 'Failed to fetch distractor analysis' });
  }
});

/**
 * GET /api/statistics/:assessmentId/items/:itemId/distractors
 * Get distractor analysis for an item
 */
router.get('/:assessmentId/items/:itemId/distractors', async (req, res) => {
  try {
    const { assessmentId, itemId } = req.params;
    
    // Get item details
    const itemResult = await query(
      'SELECT * FROM items WHERE id = $1 AND assessment_id = $2',
      [itemId, assessmentId]
    );
    
    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    const item = itemResult.rows[0];
    
    // Get all students with responses
    const studentsResult = await query(
      `SELECT s.id, s.total_score,
              json_agg(json_build_object(
                'item_id', r.item_id,
                'response_value', r.response_value,
                'is_correct', r.is_correct
              )) as responses
       FROM students s
       LEFT JOIN responses r ON r.student_id = s.id
       WHERE s.assessment_id = $1
       GROUP BY s.id
       ORDER BY s.total_score DESC`,
      [assessmentId]
    );
    
    const students = studentsResult.rows;
    
    // Calculate distractor analysis
    const distractorAnalysis = stats.analyzeDistractors(item, students);
    
    res.json({
      item: {
        id: item.id,
        item_code: item.item_code,
        correct_answer: item.correct_answer
      },
      distractors: distractorAnalysis
    });
    
  } catch (error) {
    console.error('Error fetching distractor analysis:', error);
    res.status(500).json({ error: 'Failed to fetch distractor analysis' });
  }
});

/**
 * GET /api/statistics/:assessmentId/students
 * Get student list with scores and percentile ranks
 */
router.get('/:assessmentId/students', async (req, res) => {
  try {
    const { assessmentId } = req.params;

    const result = await query(
      `SELECT id, student_code, gender, total_score
       FROM students
       WHERE assessment_id = $1
       ORDER BY total_score DESC`,
      [assessmentId]
    );

    // Calculate percentile ranks
    const students = result.rows;
    const totalStudents = students.length;

    const studentsWithPercentiles = students.map((student, index) => {
      // Count students with scores less than or equal to current student
      const studentsAtOrBelow = students.filter(s =>
        parseFloat(s.total_score) <= parseFloat(student.total_score)
      ).length;

      // Percentile rank formula: (number of scores below + 0.5) / total * 100
      // Or simpler: (studentsAtOrBelow / total) * 100
      const percentile = ((studentsAtOrBelow / totalStudents) * 100).toFixed(1);

      return {
        ...student,
        rank: index + 1,
        percentile: parseFloat(percentile)
      };
    });

    res.json(studentsWithPercentiles);

  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

/**
 * GET /api/statistics/:assessmentId/score-distribution
 * Get score distribution data for histogram with normal distribution overlay
 * Query params: country (optional) - filter by country code
 *
 * Matches Excel workbook format: bins at 5% intervals (0%, 5%, 10%, ..., 100%)
 */
router.get('/:assessmentId/score-distribution', async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const { country } = req.query;

    // Get max score (item count)
    const maxScoreResult = await query(
      'SELECT item_count FROM assessments WHERE id = $1',
      [assessmentId]
    );
    const maxScore = maxScoreResult.rows[0]?.item_count || 100;

    // Build WHERE clause based on country filter
    let whereClause = 'WHERE assessment_id = $1';
    const queryParams = [assessmentId];

    if (country && country !== 'all') {
      whereClause += ' AND country = $2';
      queryParams.push(country);
    }

    // Get all scores to bin them
    const scoresResult = await query(
      `SELECT total_score FROM students ${whereClause}`,
      queryParams
    );

    const scores = scoresResult.rows.map(row => parseFloat(row.total_score));
    const totalStudents = scores.length;

    // Convert scores to decimal fractions (0 to 1)
    const scoresAsFractions = scores.map(score => score / maxScore);

    // Create bins at 5% intervals: 0, 0.05, 0.10, 0.15, ..., 0.95, 1.00
    const bins = [];
    for (let i = 0; i <= 20; i++) {
      bins.push(i * 0.05);
    }

    // Count frequency for each bin (matching Excel's FREQUENCY function)
    // Each bin label represents the START of a 5% range:
    // 0% = [0%, 5%), 5% = [5%, 10%), ..., 95% = [95%, 100%), 100% = [100%]
    const distribution = bins.map((binValue, index) => {
      let count = 0;

      if (index === bins.length - 1) {
        // Last bin (100%): count scores >= 0.95 (95% to 100%)
        count = scoresAsFractions.filter(score => score >= 0.95).length;
      } else {
        // All other bins: count scores >= binValue AND < nextBin
        const nextBin = bins[index + 1];
        count = scoresAsFractions.filter(score => score >= binValue && score < nextBin).length;
      }

      return {
        bin: binValue,
        binPercent: parseFloat((binValue * 100).toFixed(0)), // 0, 5, 10, 15, ..., 100
        count: count
      };
    });

    // Calculate statistics using percentage scores (matching Excel)
    const scoresAsPercent = scoresAsFractions.map(score => score * 100);
    const descriptiveStats = totalStudents > 0 ? stats.calculateDescriptiveStats(scoresAsPercent) : null;

    const mean = descriptiveStats?.mean;
    const stdev = descriptiveStats?.stdev;
    const skewness = descriptiveStats?.skewness;
    const kurtosis = descriptiveStats?.kurtosis;

    // Calculate normal distribution overlay for each bin
    // Using the PDF (probability density function) scaled by total count and bin width
    const normalOverlay = distribution.map(item => {
      if (!mean || !stdev || totalStudents === 0) {
        return 0;
      }

      // Calculate normal distribution PDF at bin center
      const x = item.binPercent;
      const exponent = -0.5 * Math.pow((x - mean) / stdev, 2);
      const pdf = (1 / (stdev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);

      // Scale by total students and bin width (5% = 0.05 * 100 = 5 percentage points)
      const expected = pdf * totalStudents * 5;

      return expected;
    });

    // Merge actual and expected counts
    const enrichedDistribution = distribution.map((item, index) => ({
      bin: item.bin,
      binPercent: item.binPercent,
      actual: item.count,
      expected: normalOverlay[index] || 0
    }));

    res.json({
      distribution: enrichedDistribution,
      maxScore,
      statistics: {
        mean,
        stdev,
        skewness,
        kurtosis,
        totalStudents,
        skewnessInterpretation: stats.interpretSkewness(skewness),
        kurtosisInterpretation: stats.interpretKurtosis(kurtosis)
      }
    });

  } catch (error) {
    console.error('Error fetching score distribution:', error);
    res.status(500).json({ error: 'Failed to fetch score distribution' });
  }
});

/**
 * GET /api/statistics/:assessmentId/gender-analysis
 * Get performance statistics disaggregated by gender
 */
router.get('/:assessmentId/gender-analysis', async (req, res) => {
  try {
    const { assessmentId } = req.params;

    // Get total max points for weighted scoring (sum of all item max_points)
    const maxScoreResult = await query(
      `SELECT COALESCE(SUM(max_points), COUNT(*)) as total_max_points
       FROM items
       WHERE assessment_id = $1`,
      [assessmentId]
    );
    const maxScore = parseFloat(maxScoreResult.rows[0]?.total_max_points) || 100;

    // Get performance by gender
    const result = await query(
      `SELECT
        gender,
        COUNT(*) as count,
        AVG(total_score) as mean_score,
        MIN(total_score) as min_score,
        MAX(total_score) as max_score,
        STDDEV(total_score) as std_dev,
        SUM(CASE WHEN (total_score / $1 * 100) >= 25 THEN 1 ELSE 0 END) as above_mpl
       FROM students
       WHERE assessment_id = $2 AND gender IS NOT NULL
       GROUP BY gender
       ORDER BY gender`,
      [maxScore, assessmentId]
    );

    const genderStats = result.rows.map(row => ({
      gender: row.gender,
      count: parseInt(row.count),
      meanScore: parseFloat(row.mean_score),
      meanPercentage: ((parseFloat(row.mean_score) / maxScore) * 100).toFixed(1),
      minScore: parseFloat(row.min_score),
      maxScore: parseFloat(row.max_score),
      totalMaxScore: maxScore,
      stdDev: parseFloat(row.std_dev) || 0,
      aboveMPL: parseInt(row.above_mpl),
      mplPercentage: ((parseInt(row.above_mpl) / parseInt(row.count)) * 100).toFixed(1)
    }));

    res.json(genderStats);

  } catch (error) {
    console.error('Error fetching gender analysis:', error);
    res.status(500).json({ error: 'Failed to fetch gender analysis' });
  }
});

/**
 * GET /api/statistics/:assessmentId/content-domain-analysis
 * Get overall performance by content domain (curriculum outcomes)
 * Updated to handle weighted scoring using points_earned
 */
router.get('/:assessmentId/content-domain-analysis', async (req, res) => {
  try {
    const { assessmentId } = req.params;

    // Get items grouped by content domain with max points for weighted scoring
    const itemsResult = await query(
      `SELECT content_domain,
              COUNT(*) as item_count,
              SUM(max_points) as total_max_points
       FROM items
       WHERE assessment_id = $1 AND content_domain IS NOT NULL AND content_domain != ''
       GROUP BY content_domain
       ORDER BY content_domain`,
      [assessmentId]
    );

    if (itemsResult.rows.length === 0) {
      return res.json([]);
    }

    // For each content domain, calculate average performance using points_earned
    const domainAnalysis = await Promise.all(
      itemsResult.rows.map(async (domain) => {
        // Get performance using points_earned for weighted scoring
        const performanceResult = await query(
          `SELECT
            COUNT(DISTINCT s.id) as student_count,
            AVG(r.points_earned) as avg_points,
            AVG(r.points_earned / i.max_points) as avg_performance,
            SUM(r.points_earned) as total_points_earned,
            SUM(i.max_points) as total_possible_points
           FROM items i
           JOIN responses r ON r.item_id = i.id
           JOIN students s ON s.id = r.student_id
           WHERE i.assessment_id = $1 AND i.content_domain = $2`,
          [assessmentId, domain.content_domain]
        );

        const result = performanceResult.rows[0];
        const totalMaxPoints = parseFloat(domain.total_max_points) || 1;
        const avgPerformance = parseFloat(result.avg_performance) || 0;
        const avgPoints = parseFloat(result.avg_points) || 0;

        // Calculate overall domain score
        const totalEarned = parseFloat(result.total_points_earned) || 0;
        const totalPossible = parseFloat(result.total_possible_points) || 1;
        const overallPercentage = (totalEarned / totalPossible) * 100;

        return {
          domain: domain.content_domain,
          itemCount: parseInt(domain.item_count),
          totalMaxPoints: parseFloat(totalMaxPoints),
          averagePoints: parseFloat(avgPoints.toFixed(2)),
          averagePerformance: parseFloat((avgPerformance * 100).toFixed(1)),
          overallPercentage: parseFloat(overallPercentage.toFixed(1)),
          studentCount: parseInt(result.student_count),
          // Interpretation based on performance
          performanceLevel: avgPerformance >= 0.7 ? 'strong' :
                           avgPerformance >= 0.5 ? 'moderate' : 'weak'
        };
      })
    );

    // Sort by performance (weakest first to highlight areas needing attention)
    domainAnalysis.sort((a, b) => a.averagePerformance - b.averagePerformance);

    res.json(domainAnalysis);

  } catch (error) {
    console.error('Error fetching content domain analysis:', error);
    res.status(500).json({ error: 'Failed to fetch content domain analysis' });
  }
});

/**
 * GET /api/statistics/:assessmentId/school-analysis
 * Get performance statistics disaggregated by school
 */
router.get('/:assessmentId/school-analysis', async (req, res) => {
  try {
    const { assessmentId } = req.params;

    // Get total max points for weighted scoring
    const maxScoreResult = await query(
      `SELECT COALESCE(SUM(max_points), COUNT(*)) as total_max_points
       FROM items
       WHERE assessment_id = $1`,
      [assessmentId]
    );
    const maxScore = parseFloat(maxScoreResult.rows[0]?.total_max_points) || 100;

    // Get performance by school
    const result = await query(
      `SELECT
        school,
        COUNT(*) as count,
        AVG(total_score) as mean_score,
        MIN(total_score) as min_score,
        MAX(total_score) as max_score,
        STDDEV(total_score) as std_dev
       FROM students
       WHERE assessment_id = $1 AND school IS NOT NULL AND school != ''
       GROUP BY school
       ORDER BY school`,
      [assessmentId]
    );

    const schoolStats = result.rows.map(row => ({
      school: row.school,
      count: parseInt(row.count),
      meanScore: parseFloat(row.mean_score),
      meanPercentage: ((parseFloat(row.mean_score) / maxScore) * 100).toFixed(1),
      minScore: parseFloat(row.min_score),
      maxScore: parseFloat(row.max_score),
      totalMaxScore: maxScore,
      stdDev: parseFloat(row.std_dev) || 0
    }));

    res.json(schoolStats);

  } catch (error) {
    console.error('Error fetching school analysis:', error);
    res.status(500).json({ error: 'Failed to fetch school analysis' });
  }
});

/**
 * GET /api/statistics/:assessmentId/district-analysis
 * Get performance statistics disaggregated by district
 */
router.get('/:assessmentId/district-analysis', async (req, res) => {
  try {
    const { assessmentId } = req.params;

    // Get total max points for weighted scoring
    const maxScoreResult = await query(
      `SELECT COALESCE(SUM(max_points), COUNT(*)) as total_max_points
       FROM items
       WHERE assessment_id = $1`,
      [assessmentId]
    );
    const maxScore = parseFloat(maxScoreResult.rows[0]?.total_max_points) || 100;

    // Get performance by district
    const result = await query(
      `SELECT
        district,
        COUNT(*) as count,
        AVG(total_score) as mean_score,
        MIN(total_score) as min_score,
        MAX(total_score) as max_score,
        STDDEV(total_score) as std_dev
       FROM students
       WHERE assessment_id = $1 AND district IS NOT NULL AND district != ''
       GROUP BY district
       ORDER BY district`,
      [assessmentId]
    );

    const districtStats = result.rows.map(row => ({
      district: row.district,
      count: parseInt(row.count),
      meanScore: parseFloat(row.mean_score),
      meanPercentage: ((parseFloat(row.mean_score) / maxScore) * 100).toFixed(1),
      minScore: parseFloat(row.min_score),
      maxScore: parseFloat(row.max_score),
      totalMaxScore: maxScore,
      stdDev: parseFloat(row.std_dev) || 0
    }));

    res.json(districtStats);

  } catch (error) {
    console.error('Error fetching district analysis:', error);
    res.status(500).json({ error: 'Failed to fetch district analysis' });
  }
});

/**
 * GET /api/statistics/:assessmentId/school-type-analysis
 * Get performance statistics disaggregated by school type
 */
router.get('/:assessmentId/school-type-analysis', async (req, res) => {
  try {
    const { assessmentId } = req.params;

    // Get total max points for weighted scoring
    const maxScoreResult = await query(
      `SELECT COALESCE(SUM(max_points), COUNT(*)) as total_max_points
       FROM items
       WHERE assessment_id = $1`,
      [assessmentId]
    );
    const maxScore = parseFloat(maxScoreResult.rows[0]?.total_max_points) || 100;

    // Get performance by school type
    const result = await query(
      `SELECT
        school_type,
        COUNT(*) as count,
        AVG(total_score) as mean_score,
        MIN(total_score) as min_score,
        MAX(total_score) as max_score,
        STDDEV(total_score) as std_dev
       FROM students
       WHERE assessment_id = $1 AND school_type IS NOT NULL AND school_type != ''
       GROUP BY school_type
       ORDER BY school_type`,
      [assessmentId]
    );

    const schoolTypeStats = result.rows.map(row => ({
      schoolType: row.school_type,
      count: parseInt(row.count),
      meanScore: parseFloat(row.mean_score),
      meanPercentage: ((parseFloat(row.mean_score) / maxScore) * 100).toFixed(1),
      minScore: parseFloat(row.min_score),
      maxScore: parseFloat(row.max_score),
      totalMaxScore: maxScore,
      stdDev: parseFloat(row.std_dev) || 0
    }));

    res.json(schoolTypeStats);

  } catch (error) {
    console.error('Error fetching school type analysis:', error);
    res.status(500).json({ error: 'Failed to fetch school type analysis' });
  }
});

/**
 * GET /api/statistics/:assessmentId/countries
 * Get list of unique countries in an assessment
 */
router.get('/:assessmentId/countries', async (req, res) => {
  try {
    const { assessmentId } = req.params;

    const result = await query(
      `SELECT DISTINCT country
       FROM students
       WHERE assessment_id = $1 AND country IS NOT NULL
       ORDER BY country`,
      [assessmentId]
    );

    const countries = result.rows.map(row => row.country);
    res.json(countries);

  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
});

/**
 * GET /api/statistics/:assessmentId/percentile-analysis
 * Get item performance across percentile groups (top 25%, middle 50%, bottom 25%)
 * This shows how items perform for students of different ability levels
 */
router.get('/:assessmentId/percentile-analysis', async (req, res) => {
  try {
    const { assessmentId } = req.params;

    // Get all students with their scores
    const studentsResult = await query(
      `SELECT id, student_code, total_score
       FROM students
       WHERE assessment_id = $1
       ORDER BY total_score DESC`,
      [assessmentId]
    );

    const students = studentsResult.rows;
    const totalStudents = students.length;

    if (totalStudents === 0) {
      return res.json({ groups: [], items: [] });
    }

    // Calculate percentile cutoffs
    const top25Index = Math.floor(totalStudents * 0.25);
    const bottom75Index = Math.floor(totalStudents * 0.75);

    // Divide students into groups
    const topGroup = students.slice(0, top25Index); // Top 25%
    const middleGroup = students.slice(top25Index, bottom75Index); // Middle 50%
    const bottomGroup = students.slice(bottom75Index); // Bottom 25%

    // Get all items with max_points for weighted scoring
    const itemsResult = await query(
      `SELECT id, item_code, correct_answer, max_points, item_type, content_domain
       FROM items
       WHERE assessment_id = $1
       ORDER BY item_code`,
      [assessmentId]
    );

    const items = itemsResult.rows;

    // Get all responses
    const responsesResult = await query(
      `SELECT student_id, item_id, response_value, is_correct, points_earned
       FROM responses r
       WHERE EXISTS (
         SELECT 1 FROM students s
         WHERE s.id = r.student_id AND s.assessment_id = $1
       )`,
      [assessmentId]
    );

    const responses = responsesResult.rows;

    // Calculate performance for each item across percentile groups
    const itemAnalysis = items.map(item => {
      const itemResponses = responses.filter(r => r.item_id === item.id);
      const maxPoints = parseFloat(item.max_points) || 1;

      // Calculate for each group
      const calculateGroupStats = (groupStudents) => {
        const groupResponses = itemResponses.filter(r =>
          groupStudents.some(s => s.id === r.student_id)
        );

        if (groupResponses.length === 0) {
          return {
            count: 0,
            avgPoints: 0,
            difficulty: 0,
            percentCorrect: 0
          };
        }

        const totalPoints = groupResponses.reduce((sum, r) =>
          sum + (parseFloat(r.points_earned) || 0), 0
        );
        const avgPoints = totalPoints / groupResponses.length;
        const difficulty = avgPoints / maxPoints;
        const correctCount = groupResponses.filter(r => r.is_correct).length;
        const percentCorrect = (correctCount / groupResponses.length) * 100;

        return {
          count: groupResponses.length,
          avgPoints: parseFloat(avgPoints.toFixed(2)),
          difficulty: parseFloat(difficulty.toFixed(3)),
          percentCorrect: parseFloat(percentCorrect.toFixed(1))
        };
      };

      const topStats = calculateGroupStats(topGroup);
      const middleStats = calculateGroupStats(middleGroup);
      const bottomStats = calculateGroupStats(bottomGroup);

      // Calculate discrimination between top and bottom groups
      const discrimination = topStats.difficulty - bottomStats.difficulty;

      return {
        itemId: item.id,
        itemCode: item.item_code,
        itemType: item.item_type,
        maxPoints: parseFloat(item.max_points),
        contentDomain: item.content_domain,
        topGroup: topStats,
        middleGroup: middleStats,
        bottomGroup: bottomStats,
        discrimination: parseFloat(discrimination.toFixed(3)),
        discriminationStatus: discrimination >= 0.3 ? 'good' : discrimination >= 0.2 ? 'fair' : 'poor'
      };
    });

    // Calculate group summaries
    const groupSummary = {
      topGroup: {
        label: 'Top 25%',
        count: topGroup.length,
        minScore: topGroup.length > 0 ? parseFloat(topGroup[topGroup.length - 1].total_score) : 0,
        maxScore: topGroup.length > 0 ? parseFloat(topGroup[0].total_score) : 0,
        avgScore: topGroup.length > 0 ?
          topGroup.reduce((sum, s) => sum + parseFloat(s.total_score), 0) / topGroup.length : 0
      },
      middleGroup: {
        label: 'Middle 50%',
        count: middleGroup.length,
        minScore: middleGroup.length > 0 ? parseFloat(middleGroup[middleGroup.length - 1].total_score) : 0,
        maxScore: middleGroup.length > 0 ? parseFloat(middleGroup[0].total_score) : 0,
        avgScore: middleGroup.length > 0 ?
          middleGroup.reduce((sum, s) => sum + parseFloat(s.total_score), 0) / middleGroup.length : 0
      },
      bottomGroup: {
        label: 'Bottom 25%',
        count: bottomGroup.length,
        minScore: bottomGroup.length > 0 ? parseFloat(bottomGroup[bottomGroup.length - 1].total_score) : 0,
        maxScore: bottomGroup.length > 0 ? parseFloat(bottomGroup[0].total_score) : 0,
        avgScore: bottomGroup.length > 0 ?
          bottomGroup.reduce((sum, s) => sum + parseFloat(s.total_score), 0) / bottomGroup.length : 0
      }
    };

    res.json({
      groups: groupSummary,
      items: itemAnalysis,
      totalStudents
    });

  } catch (error) {
    console.error('Error fetching percentile analysis:', error);
    res.status(500).json({ error: 'Failed to fetch percentile analysis' });
  }
});

/**
 * GET /api/statistics/:assessmentId/students/:studentId/content-domains
 * Get individual student's performance by content domain
 */
router.get('/:assessmentId/students/:studentId/content-domains', async (req, res) => {
  try {
    const { assessmentId, studentId } = req.params;

    // Get student details
    const studentResult = await query(
      'SELECT id, student_code, total_score FROM students WHERE id = $1 AND assessment_id = $2',
      [studentId, assessmentId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = studentResult.rows[0];

    // Get items grouped by content domain
    const itemsResult = await query(
      `SELECT content_domain, COUNT(*) as item_count
       FROM items
       WHERE assessment_id = $1 AND content_domain IS NOT NULL
       GROUP BY content_domain
       ORDER BY content_domain`,
      [assessmentId]
    );

    if (itemsResult.rows.length === 0) {
      return res.json({
        student: {
          id: student.id,
          student_code: student.student_code,
          total_score: parseFloat(student.total_score)
        },
        domains: []
      });
    }

    // For each content domain, calculate student's performance and class average
    const domainPerformance = await Promise.all(
      itemsResult.rows.map(async (domain) => {
        // Get student's performance in this domain
        const studentPerformanceResult = await query(
          `SELECT
            COUNT(*) as total_items,
            SUM(CASE WHEN r.is_correct THEN 1 ELSE 0 END) as correct_count
           FROM items i
           JOIN responses r ON r.item_id = i.id
           WHERE i.assessment_id = $1 AND i.content_domain = $2 AND r.student_id = $3`,
          [assessmentId, domain.content_domain, studentId]
        );

        // Get class average for this domain
        const classAvgResult = await query(
          `SELECT
            AVG(CASE WHEN r.is_correct THEN 1.0 ELSE 0.0 END) as avg_performance
           FROM items i
           JOIN responses r ON r.item_id = i.id
           WHERE i.assessment_id = $1 AND i.content_domain = $2`,
          [assessmentId, domain.content_domain]
        );

        const totalItems = parseInt(studentPerformanceResult.rows[0].total_items);
        const correctCount = parseInt(studentPerformanceResult.rows[0].correct_count);
        const studentPercentage = totalItems > 0 ? (correctCount / totalItems) * 100 : 0;
        const classAverage = parseFloat(classAvgResult.rows[0].avg_performance) * 100;

        return {
          domain: domain.content_domain,
          totalItems,
          correctCount,
          studentPercentage: parseFloat(studentPercentage.toFixed(1)),
          classAverage: parseFloat(classAverage.toFixed(1))
        };
      })
    );

    res.json({
      student: {
        id: student.id,
        student_code: student.student_code,
        total_score: parseFloat(student.total_score)
      },
      domains: domainPerformance
    });

  } catch (error) {
    console.error('Error fetching student content domain analysis:', error);
    res.status(500).json({ error: 'Failed to fetch student content domain analysis' });
  }
});

export default router;
