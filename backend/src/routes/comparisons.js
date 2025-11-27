import express from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/comparisons/year-over-year
 * Compare same country across different years
 * Query params: countryId, years (comma-separated)
 */
router.get('/year-over-year', async (req, res) => {
  try {
    const { countryId, years } = req.query;

    if (!countryId) {
      return res.status(400).json({ error: 'countryId is required' });
    }

    // Parse years if provided, otherwise get all available years
    let yearsList = [];
    if (years) {
      yearsList = years.split(',').map(y => parseInt(y));
    } else {
      // Get all available years for this country
      const yearsResult = await query(
        `SELECT DISTINCT assessment_year
         FROM assessments
         WHERE country_id = $1
         ORDER BY assessment_year DESC`,
        [countryId]
      );
      yearsList = yearsResult.rows.map(r => r.assessment_year);
    }

    // Get assessments for each year
    const comparisons = [];
    for (const year of yearsList) {
      const assessmentResult = await query(
        `SELECT a.id, a.name, a.assessment_year, a.student_count, a.item_count,
                ms.state_name, ms.state_code
         FROM assessments a
         JOIN member_states ms ON a.country_id = ms.id
         WHERE a.country_id = $1 AND a.assessment_year = $2
         ORDER BY a.upload_date DESC
         LIMIT 1`,
        [countryId, year]
      );

      if (assessmentResult.rows.length > 0) {
        const assessment = assessmentResult.rows[0];

        // Get statistics for this assessment
        const statsResult = await query(
          `SELECT stat_type, stat_value
           FROM statistics
           WHERE assessment_id = $1 AND item_id IS NULL`,
          [assessment.id]
        );

        const stats = {};
        statsResult.rows.forEach(row => {
          stats[row.stat_type] = parseFloat(row.stat_value);
        });

        comparisons.push({
          year,
          assessmentId: assessment.id,
          assessmentName: assessment.name,
          studentCount: assessment.student_count,
          itemCount: assessment.item_count,
          statistics: {
            mean: stats.mean || null,
            median: stats.median || null,
            stdev: stats.stdev || null,
            cronbachAlpha: stats.cronbach_alpha || null,
            sdgMplPercentage: stats.sdg_mpl_percentage || null,
          },
        });
      }
    }

    // Calculate year-over-year changes
    const trends = [];
    for (let i = 1; i < comparisons.length; i++) {
      const current = comparisons[i - 1];
      const previous = comparisons[i];

      if (current.statistics.mean !== null && previous.statistics.mean !== null) {
        trends.push({
          fromYear: previous.year,
          toYear: current.year,
          meanChange: current.statistics.mean - previous.statistics.mean,
          meanChangePercent: ((current.statistics.mean - previous.statistics.mean) / previous.statistics.mean) * 100,
          sdgChange: current.statistics.sdgMplPercentage - previous.statistics.sdgMplPercentage,
        });
      }
    }

    res.json({
      countryId: parseInt(countryId),
      countryName: comparisons.length > 0 ? comparisons[0].assessmentName.split('-')[0].trim() : null,
      comparisons,
      trends,
    });
  } catch (error) {
    console.error('Year-over-year comparison error:', error);
    res.status(500).json({ error: 'Failed to generate comparison' });
  }
});

/**
 * GET /api/comparisons/cross-country
 * Compare different countries for the same year
 * Query params: year, countryIds (comma-separated, optional - defaults to all)
 */
router.get('/cross-country', async (req, res) => {
  try {
    const { year, countryIds } = req.query;

    if (!year) {
      return res.status(400).json({ error: 'year is required' });
    }

    // Parse country IDs if provided
    let countryFilter = '';
    let params = [parseInt(year)];

    if (countryIds) {
      const ids = countryIds.split(',').map(id => parseInt(id));
      countryFilter = `AND a.country_id = ANY($2)`;
      params.push(ids);
    }

    // Get latest assessment for each country in the specified year
    const assessmentsResult = await query(
      `SELECT DISTINCT ON (a.country_id)
              a.id, a.name, a.assessment_year, a.student_count, a.item_count, a.country_id,
              ms.state_name, ms.state_code
       FROM assessments a
       JOIN member_states ms ON a.country_id = ms.id
       WHERE a.assessment_year = $1 ${countryFilter}
       ORDER BY a.country_id, a.upload_date DESC`,
      params
    );

    const comparisons = [];
    for (const assessment of assessmentsResult.rows) {
      // Get statistics
      const statsResult = await query(
        `SELECT stat_type, stat_value
         FROM statistics
         WHERE assessment_id = $1 AND item_id IS NULL`,
        [assessment.id]
      );

      const stats = {};
      statsResult.rows.forEach(row => {
        stats[row.stat_type] = parseFloat(row.stat_value);
      });

      comparisons.push({
        countryId: assessment.country_id,
        countryName: assessment.state_name,
        countryCode: assessment.state_code,
        assessmentId: assessment.id,
        assessmentName: assessment.name,
        studentCount: assessment.student_count,
        itemCount: assessment.item_count,
        statistics: {
          mean: stats.mean || null,
          median: stats.median || null,
          stdev: stats.stdev || null,
          cronbachAlpha: stats.cronbach_alpha || null,
          sdgMplPercentage: stats.sdg_mpl_percentage || null,
        },
      });
    }

    // Calculate regional average (OECS benchmark)
    const validMeans = comparisons.filter(c => c.statistics.mean !== null).map(c => c.statistics.mean);
    const validSdg = comparisons.filter(c => c.statistics.sdgMplPercentage !== null).map(c => c.statistics.sdgMplPercentage);

    const regionalAverage = {
      mean: validMeans.length > 0 ? validMeans.reduce((a, b) => a + b, 0) / validMeans.length : null,
      sdgMplPercentage: validSdg.length > 0 ? validSdg.reduce((a, b) => a + b, 0) / validSdg.length : null,
      countriesIncluded: comparisons.length,
    };

    // Rank countries by performance
    const ranked = [...comparisons].sort((a, b) => (b.statistics.mean || 0) - (a.statistics.mean || 0));

    res.json({
      year: parseInt(year),
      comparisons,
      regionalAverage,
      rankings: ranked.map((c, index) => ({
        rank: index + 1,
        countryId: c.countryId,
        countryName: c.countryName,
        mean: c.statistics.mean,
        sdgMplPercentage: c.statistics.sdgMplPercentage,
      })),
    });
  } catch (error) {
    console.error('Cross-country comparison error:', error);
    res.status(500).json({ error: 'Failed to generate comparison' });
  }
});

/**
 * GET /api/comparisons/trends
 * Get multi-year trends for a country
 * Query params: countryId, startYear, endYear
 */
router.get('/trends', async (req, res) => {
  try {
    const { countryId, startYear, endYear } = req.query;

    if (!countryId) {
      return res.status(400).json({ error: 'countryId is required' });
    }

    // Build year range
    let yearFilter = '';
    const params = [countryId];

    if (startYear && endYear) {
      yearFilter = 'AND a.assessment_year BETWEEN $2 AND $3';
      params.push(parseInt(startYear), parseInt(endYear));
    } else if (startYear) {
      yearFilter = 'AND a.assessment_year >= $2';
      params.push(parseInt(startYear));
    } else if (endYear) {
      yearFilter = 'AND a.assessment_year <= $2';
      params.push(parseInt(endYear));
    }

    // Get all assessments in the range
    const assessmentsResult = await query(
      `SELECT DISTINCT ON (a.assessment_year)
              a.id, a.name, a.assessment_year, a.student_count, a.item_count,
              ms.state_name, ms.state_code
       FROM assessments a
       JOIN member_states ms ON a.country_id = ms.id
       WHERE a.country_id = $1 ${yearFilter}
       ORDER BY a.assessment_year, a.upload_date DESC`,
      params
    );

    const dataPoints = [];
    for (const assessment of assessmentsResult.rows) {
      const statsResult = await query(
        `SELECT stat_type, stat_value
         FROM statistics
         WHERE assessment_id = $1 AND item_id IS NULL`,
        [assessment.id]
      );

      const stats = {};
      statsResult.rows.forEach(row => {
        stats[row.stat_type] = parseFloat(row.stat_value);
      });

      dataPoints.push({
        year: assessment.assessment_year,
        assessmentId: assessment.id,
        mean: stats.mean || null,
        median: stats.median || null,
        stdev: stats.stdev || null,
        cronbachAlpha: stats.cronbach_alpha || null,
        sdgMplPercentage: stats.sdg_mpl_percentage || null,
        studentCount: assessment.student_count,
      });
    }

    // Sort by year
    dataPoints.sort((a, b) => a.year - b.year);

    // Calculate overall trend (linear regression on mean scores)
    let trend = null;
    if (dataPoints.length >= 2) {
      const validPoints = dataPoints.filter(d => d.mean !== null);
      if (validPoints.length >= 2) {
        const n = validPoints.length;
        const sumX = validPoints.reduce((sum, d) => sum + d.year, 0);
        const sumY = validPoints.reduce((sum, d) => sum + d.mean, 0);
        const sumXY = validPoints.reduce((sum, d) => sum + (d.year * d.mean), 0);
        const sumX2 = validPoints.reduce((sum, d) => sum + (d.year * d.year), 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        trend = {
          slope,
          direction: slope > 0 ? 'improving' : slope < 0 ? 'declining' : 'stable',
          averageChangePerYear: slope,
        };
      }
    }

    res.json({
      countryId: parseInt(countryId),
      countryName: dataPoints.length > 0 ? assessmentsResult.rows[0].state_name : null,
      dataPoints,
      trend,
      yearsAnalyzed: dataPoints.length,
    });
  } catch (error) {
    console.error('Trends analysis error:', error);
    res.status(500).json({ error: 'Failed to generate trends' });
  }
});

/**
 * GET /api/comparisons/available-years
 * Get list of years with available data
 * Query params: countryId (optional)
 */
router.get('/available-years', async (req, res) => {
  console.log('📊 Available years endpoint hit');
  try {
    const { countryId } = req.query;
    console.log('Query params:', { countryId });

    let queryText = `
      SELECT DISTINCT a.assessment_year as year,
             COUNT(DISTINCT a.country_id) as country_count
      FROM assessments a
    `;
    const params = [];

    if (countryId) {
      queryText += ' WHERE a.country_id = $1';
      params.push(parseInt(countryId));
    }

    queryText += ' GROUP BY a.assessment_year ORDER BY a.assessment_year DESC';

    const result = await query(queryText, params);

    res.json({
      years: result.rows,
    });
  } catch (error) {
    console.error('Available years error:', error);
    res.status(500).json({ error: 'Failed to fetch available years' });
  }
});

export default router;
