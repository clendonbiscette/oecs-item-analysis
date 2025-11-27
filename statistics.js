import ss from 'simple-statistics';

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
  };
}

/**
 * Calculate item difficulty (p-value)
 * p = number of correct responses / total responses
 */
export function calculateDifficulty(responses) {
  if (!responses || responses.length === 0) return null;
  
  const correctCount = responses.filter(r => r.is_correct).length;
  return correctCount / responses.length;
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
  
  return (upperCorrect - lowerCorrect) / groupSize;
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
  calculateItemStatus
};
