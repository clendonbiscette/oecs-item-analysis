import * as ss from 'simple-statistics';

/**
 * Calculate descriptive statistics for test scores
 */
export function calculateDescriptiveStats(scores) {
  if (!scores || scores.length === 0) {
    return null;
  }
  
  const sorted = [...scores].sort((a, b) => a - b);
  
  return {
    n: scores.length,
    min: ss.min(scores),
    max: ss.max(scores),
    mean: ss.mean(scores),
    median: ss.median(scores),
    mode: ss.mode(scores),
    stdev: ss.standardDeviation(scores),
    variance: ss.variance(scores),
    skewness: ss.sampleSkewness(scores),
    kurtosis: ss.sampleKurtosis(scores),
  };
}

/**
 * Calculate item difficulty (p-value)
 * IMPORTANT: Uses upper/lower 27% groups ONLY to match Excel formula
 * Excel formula: (upperCorrect + lowerCorrect) / (groupSize * 2)
 */
export function calculateDifficulty(students, itemId) {
  if (!students || students.length < 10) return null;

  // Sort students by total score (descending)
  const sorted = [...students].sort((a, b) => b.total_score - a.total_score);

  // Get upper and lower 27%
  const groupSize = Math.floor(sorted.length * 0.27);
  const upperGroup = sorted.slice(0, groupSize);
  const lowerGroup = sorted.slice(-groupSize);

  // Count correct responses in each group
  const upperCorrect = upperGroup.filter(s => {
    const response = s.responses?.find(r => r.item_id === itemId);
    return response && response.is_correct;
  }).length;

  const lowerCorrect = lowerGroup.filter(s => {
    const response = s.responses?.find(r => r.item_id === itemId);
    return response && response.is_correct;
  }).length;

  // Excel formula: (upperCorrect + lowerCorrect) / (groupSize * 2)
  return (upperCorrect + lowerCorrect) / (groupSize * 2);
}

/**
 * Interpret difficulty level
 */
export function interpretDifficulty(p) {
  if (p < 0.30) return 'difficult';
  if (p < 0.70) return 'moderate';
  if (p < 0.95) return 'easy';
  return 'very easy';
}

/**
 * Calculate discrimination index using upper/lower 27% method
 * Excel formula: (upperCorrect - lowerCorrect) / (groupSize * 2)
 */
export function calculateDiscrimination(students, itemId) {
  if (!students || students.length < 10) return null;

  // Sort students by total score (descending)
  const sorted = [...students].sort((a, b) => b.total_score - a.total_score);

  // Get upper and lower 27%
  const groupSize = Math.floor(sorted.length * 0.27);
  const upperGroup = sorted.slice(0, groupSize);
  const lowerGroup = sorted.slice(-groupSize);

  // Count correct responses in each group
  const upperCorrect = upperGroup.filter(s => {
    const response = s.responses?.find(r => r.item_id === itemId);
    return response && response.is_correct;
  }).length;

  const lowerCorrect = lowerGroup.filter(s => {
    const response = s.responses?.find(r => r.item_id === itemId);
    return response && response.is_correct;
  }).length;

  // Excel formula: (upperCorrect - lowerCorrect) / (groupSize * 2)
  return (upperCorrect - lowerCorrect) / (groupSize * 2);
}

/**
 * Interpret discrimination index
 */
export function interpretDiscrimination(d) {
  if (d >= 0.40) return 'excellent';
  if (d >= 0.30) return 'good';
  if (d >= 0.20) return 'fair';
  return 'poor';
}

/**
 * Calculate point-biserial correlation
 * Correlation between item score (0/1) and total test score
 */
export function calculatePointBiserial(itemScores, totalScores) {
  if (!itemScores || !totalScores || itemScores.length !== totalScores.length) {
    return null;
  }
  
  if (itemScores.length < 3) return null;
  
  try {
    // Check if there's variance in item scores (need both 0s and 1s)
    const uniqueScores = [...new Set(itemScores)];
    if (uniqueScores.length < 2) return null;
    
    return ss.sampleCorrelation(itemScores, totalScores);
  } catch (error) {
    console.error('Error calculating point-biserial:', error);
    return null;
  }
}

/**
 * Interpret point-biserial correlation
 */
export function interpretPointBiserial(rpbis) {
  if (rpbis === null) return 'insufficient data';
  if (rpbis >= 0.30) return 'good';
  if (rpbis >= 0.20) return 'acceptable';
  return 'poor';
}

/**
 * Calculate Cronbach's Alpha reliability coefficient
 */
export function calculateCronbachAlpha(itemScoresMatrix) {
  if (!itemScoresMatrix || itemScoresMatrix.length < 2) return null;
  
  const K = itemScoresMatrix[0].length; // Number of items
  if (K < 2) return null;
  
  try {
    // Calculate total scores for each student
    const totalScores = itemScoresMatrix.map(row => 
      row.reduce((sum, score) => sum + (score || 0), 0)
    );
    
    // Calculate variance for each item
    const itemVariances = [];
    for (let i = 0; i < K; i++) {
      const itemColumn = itemScoresMatrix.map(row => row[i] || 0);
      itemVariances.push(ss.variance(itemColumn));
    }
    
    const sumItemVariances = itemVariances.reduce((a, b) => a + b, 0);
    const totalVariance = ss.variance(totalScores);
    
    if (totalVariance === 0) return null;
    
    const alpha = (K / (K - 1)) * (1 - (sumItemVariances / totalVariance));
    return alpha;
  } catch (error) {
    console.error('Error calculating Cronbach\'s alpha:', error);
    return null;
  }
}

/**
 * Interpret Cronbach's Alpha
 */
export function interpretAlpha(alpha) {
  if (alpha === null) return 'insufficient data';
  if (alpha >= 0.90) return 'excellent';
  if (alpha >= 0.80) return 'good';
  if (alpha >= 0.70) return 'acceptable';
  return 'poor';
}

/**
 * Calculate Standard Error of Measurement
 */
export function calculateSEM(stdev, reliability) {
  if (!stdev || !reliability) return null;
  return stdev * Math.sqrt(1 - reliability);
}

/**
 * Analyze distractors for a multiple-choice item
 */
export function analyzeDistractors(item, students) {
  if (!students || students.length < 10) return null;
  
  // Sort students by total score
  const sorted = [...students].sort((a, b) => b.total_score - a.total_score);
  const groupSize = Math.floor(sorted.length * 0.27);
  const upperGroup = sorted.slice(0, groupSize);
  const lowerGroup = sorted.slice(-groupSize);
  
  const options = ['A', 'B', 'C', 'D'];
  const analysis = [];
  
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
    
    analysis.push({
      option,
      upperCount,
      lowerCount,
      discrimination: Math.round(discrimination * 10000) / 10000,
      isCorrect,
      status: isCorrect 
        ? (discrimination > 0 ? 'functioning' : 'poor discrimination')
        : (discrimination < 0 ? 'functioning' : 'non-functioning')
    });
  }
  
  return analysis;
}

/**
 * Calculate overall item status based on all metrics
 */
export function calculateItemStatus(difficulty, discrimination, pointBiserial) {
  if (difficulty === null || discrimination === null) {
    return 'insufficient data';
  }

  // Poor items that should be flagged for review/removal
  if (discrimination < 0.20) return 'poor';

  // Items needing review
  if (discrimination < 0.30 || (pointBiserial !== null && pointBiserial < 0.20)) {
    return 'review';
  }

  // Good items
  return 'good';
}

/**
 * Calculate split-half reliability
 * Splits test into two halves (odd/even items), calculates correlation, applies Spearman-Brown
 */
export function calculateSplitHalfReliability(itemScoresMatrix) {
  if (!itemScoresMatrix || itemScoresMatrix.length < 2) return null;

  const K = itemScoresMatrix[0].length; // Number of items
  if (K < 4) return null; // Need at least 4 items for meaningful split-half

  try {
    // Split items into odd and even numbered items
    const oddScores = [];
    const evenScores = [];

    for (const studentResponses of itemScoresMatrix) {
      let oddSum = 0;
      let evenSum = 0;

      for (let i = 0; i < studentResponses.length; i++) {
        if (i % 2 === 0) {
          evenSum += studentResponses[i] || 0;
        } else {
          oddSum += studentResponses[i] || 0;
        }
      }

      oddScores.push(oddSum);
      evenScores.push(evenSum);
    }

    // Calculate correlation between two halves
    const correlation = ss.sampleCorrelation(oddScores, evenScores);

    // Apply Spearman-Brown prophecy formula to estimate full-test reliability
    const splitHalf = (2 * correlation) / (1 + correlation);

    return splitHalf;
  } catch (error) {
    console.error('Error calculating split-half reliability:', error);
    return null;
  }
}

/**
 * Calculate performance levels based on score ranges
 * Aligned with SDG 4.1.1a framework
 */
export function calculatePerformanceLevels(scores, maxScore) {
  if (!scores || scores.length === 0 || !maxScore) {
    return null;
  }

  // Define performance level thresholds (as percentage of max score)
  // These align with common educational assessment frameworks
  const thresholds = {
    below_minimum: 0,      // < 25% - Below Minimum Proficiency Level (MPL)
    minimum: 0.25,         // 25-49% - Minimum Proficiency Level (MPL)
    moderate: 0.50,        // 50-74% - Moderate Proficiency
    high: 0.75,            // 75-89% - High Proficiency
    advanced: 0.90         // >= 90% - Advanced
  };

  const levels = {
    below_minimum: { count: 0, percentage: 0, label: 'Below Minimum', range: '0-24%' },
    minimum: { count: 0, percentage: 0, label: 'Minimum Proficiency (MPL)', range: '25-49%' },
    moderate: { count: 0, percentage: 0, label: 'Moderate Proficiency', range: '50-74%' },
    high: { count: 0, percentage: 0, label: 'High Proficiency', range: '75-89%' },
    advanced: { count: 0, percentage: 0, label: 'Advanced', range: '90-100%' }
  };

  // Classify each student
  for (const score of scores) {
    const percentage = score / maxScore;

    if (percentage < thresholds.minimum) {
      levels.below_minimum.count++;
    } else if (percentage < thresholds.moderate) {
      levels.minimum.count++;
    } else if (percentage < thresholds.high) {
      levels.moderate.count++;
    } else if (percentage < thresholds.advanced) {
      levels.high.count++;
    } else {
      levels.advanced.count++;
    }
  }

  // Calculate percentages
  const total = scores.length;
  for (const level in levels) {
    levels[level].percentage = Math.round((levels[level].count / total) * 10000) / 100;
  }

  // Calculate SDG 4.1.1a indicator (% at or above Minimum Proficiency Level)
  const mplPercentage = ((total - levels.below_minimum.count) / total) * 100;

  return {
    levels,
    sdg_indicator: {
      mpl_percentage: Math.round(mplPercentage * 100) / 100,
      label: 'SDG 4.1.1a: % at or above Minimum Proficiency Level'
    }
  };
}

/**
 * Interpret split-half reliability
 */
export function interpretSplitHalf(reliability) {
  if (reliability === null) return 'insufficient data';
  if (reliability >= 0.90) return 'excellent';
  if (reliability >= 0.80) return 'good';
  if (reliability >= 0.70) return 'acceptable';
  return 'poor';
}

/**
 * Calculate normal distribution probability density function (PDF)
 * @param {number} x - Value to calculate probability for
 * @param {number} mean - Mean of distribution
 * @param {number} stdev - Standard deviation of distribution
 * @returns {number} Probability density at x
 */
export function normalPDF(x, mean, stdev) {
  if (stdev === 0) return 0;

  const exponent = -0.5 * Math.pow((x - mean) / stdev, 2);
  const coefficient = 1 / (stdev * Math.sqrt(2 * Math.PI));

  return coefficient * Math.exp(exponent);
}

/**
 * Generate normal distribution overlay data for a score distribution
 * @param {Array} scoreDistribution - Array of {score, count} objects
 * @param {number} mean - Mean score
 * @param {number} stdev - Standard deviation
 * @param {number} totalStudents - Total number of students
 * @param {number} binWidth - Width of each histogram bin (default 1 for integer scores)
 * @returns {Array} Array of {score, expected} objects with expected counts
 */
export function calculateNormalDistributionOverlay(scoreDistribution, mean, stdev, totalStudents, binWidth = 1) {
  if (!scoreDistribution || scoreDistribution.length === 0 || !mean || !stdev || stdev === 0) {
    return [];
  }

  return scoreDistribution.map(({ score }) => {
    // Calculate expected count using normal PDF
    const probability = normalPDF(score, mean, stdev);
    const expectedCount = probability * totalStudents * binWidth;

    return {
      score,
      expected: Math.round(expectedCount * 100) / 100 // Round to 2 decimal places
    };
  });
}

/**
 * Interpret skewness value
 * @param {number} skewness - Skewness coefficient
 * @returns {string} Interpretation of skewness
 */
export function interpretSkewness(skewness) {
  if (skewness === null || skewness === undefined) return 'unknown';

  const absSkew = Math.abs(skewness);

  if (absSkew < 0.5) {
    return 'fairly symmetric';
  } else if (absSkew < 1.0) {
    return skewness < 0 ? 'moderately left-skewed' : 'moderately right-skewed';
  } else {
    return skewness < 0 ? 'highly left-skewed' : 'highly right-skewed';
  }
}

/**
 * Interpret kurtosis value
 * @param {number} kurtosis - Kurtosis coefficient (excess kurtosis)
 * @returns {string} Interpretation of kurtosis
 */
export function interpretKurtosis(kurtosis) {
  if (kurtosis === null || kurtosis === undefined) return 'unknown';

  const absKurt = Math.abs(kurtosis);

  if (absKurt < 0.5) {
    return 'normal tails (mesokurtic)';
  } else if (kurtosis < 0) {
    return absKurt < 1.0 ? 'slightly light tails (platykurtic)' : 'light tails (platykurtic)';
  } else {
    return absKurt < 1.0 ? 'slightly heavy tails (leptokurtic)' : 'heavy tails (leptokurtic)';
  }
}

export default {
  calculateDescriptiveStats,
  calculateDifficulty,
  interpretDifficulty,
  calculateDiscrimination,
  interpretDiscrimination,
  calculatePointBiserial,
  interpretPointBiserial,
  calculateCronbachAlpha,
  interpretAlpha,
  calculateSEM,
  analyzeDistractors,
  calculateItemStatus,
  calculateSplitHalfReliability,
  interpretSplitHalf,
  calculatePerformanceLevels,
  normalPDF,
  calculateNormalDistributionOverlay,
  interpretSkewness,
  interpretKurtosis
};
