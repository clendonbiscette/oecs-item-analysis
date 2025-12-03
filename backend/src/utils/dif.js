/**
 * Differential Item Functioning (DIF) Analysis Utilities
 *
 * Provides functions to analyze item performance differences across demographic groups:
 * - Gender DIF: Male vs Female
 * - Percentile DIF: Performance levels (P1-P5) vs OECS average
 * - Country DIF: Country vs OECS average
 * - Country-Gender DIF: Gender within each country
 */

/**
 * Classify DIF magnitude based on difficulty difference
 *
 * @param {number} difScore - Difference in difficulty between two groups
 * @returns {string} - Classification: 'Negligible', 'Slight to Moderate', or 'Moderate to Large'
 */
export function classifyDIF(difScore) {
  const absDif = Math.abs(difScore);

  if (absDif < 0.05) {
    return 'Negligible';
  } else if (absDif < 0.10) {
    return 'Slight to Moderate';
  } else {
    return 'Moderate to Large';
  }
}

/**
 * Calculate difficulty for a specific group of students on a specific item
 * Uses the upper/lower 27% method (same as existing difficulty calculation)
 *
 * @param {Array} students - Array of student objects with responses
 * @param {number} itemId - Item ID to analyze
 * @param {number} maxPoints - Maximum points for the item
 * @returns {Object|null} - { difficulty, sampleSize, upperAvg, lowerAvg } or null if insufficient data
 */
export function calculateGroupDifficulty(students, itemId, maxPoints = 1) {
  if (!students || students.length < 10) return null;

  // Sort students by total score (descending)
  const sorted = [...students].sort((a, b) => b.total_score - a.total_score);

  // Get upper and lower 27%
  const groupSize = Math.floor(sorted.length * 0.27);
  const upperGroup = sorted.slice(0, groupSize);
  const lowerGroup = sorted.slice(-groupSize);

  // Calculate average points earned in each group
  let upperSum = 0;
  let upperCount = 0;
  let lowerSum = 0;
  let lowerCount = 0;

  upperGroup.forEach(s => {
    const response = s.responses?.find(r => r.item_id === itemId);
    if (response && response.points_earned !== null && response.points_earned !== undefined) {
      upperSum += parseFloat(response.points_earned);
      upperCount++;
    }
  });

  lowerGroup.forEach(s => {
    const response = s.responses?.find(r => r.item_id === itemId);
    if (response && response.points_earned !== null && response.points_earned !== undefined) {
      lowerSum += parseFloat(response.points_earned);
      lowerCount++;
    }
  });

  if (upperCount === 0 && lowerCount === 0) return null;

  const upperAvg = upperCount > 0 ? upperSum / upperCount : 0;
  const lowerAvg = lowerCount > 0 ? lowerSum / lowerCount : 0;

  // Difficulty = average of upper and lower group performance, normalized by max points
  const avgPoints = (upperAvg + lowerAvg) / 2;
  const difficulty = avgPoints / maxPoints;

  return {
    difficulty,
    sampleSize: students.length,
    upperAvg,
    lowerAvg
  };
}

/**
 * Calculate Gender DIF Analysis
 * Compares male vs female performance on each item
 *
 * @param {Array} students - Array of student objects with gender and responses
 * @param {Array} items - Array of item objects
 * @returns {Array} - Array of DIF results for each item
 */
export function calculateGenderDIF(students, items) {
  const results = [];

  // Filter students by gender
  const maleStudents = students.filter(s => s.gender === 'M');
  const femaleStudents = students.filter(s => s.gender === 'F');

  if (maleStudents.length < 10 || femaleStudents.length < 10) {
    console.warn(`Insufficient sample size for gender DIF: M=${maleStudents.length}, F=${femaleStudents.length}`);
    return results;
  }

  console.log(`Calculating Gender DIF for ${items.length} items (M=${maleStudents.length}, F=${femaleStudents.length})`);

  for (const item of items) {
    const maxPoints = parseInt(item.max_points) || 1;
    const maleStats = calculateGroupDifficulty(maleStudents, item.id, maxPoints);
    const femaleStats = calculateGroupDifficulty(femaleStudents, item.id, maxPoints);

    if (!maleStats || !femaleStats) continue;

    const difScore = maleStats.difficulty - femaleStats.difficulty;
    const classification = classifyDIF(difScore);

    results.push({
      assessmentId: item.assessment_id,
      itemId: item.id,
      itemCode: item.item_code,
      difType: 'gender',
      groupA: 'M',
      groupB: 'F',
      difficultyA: maleStats.difficulty,
      difficultyB: femaleStats.difficulty,
      difScore,
      classification,
      sampleSizeA: maleStats.sampleSize,
      sampleSizeB: femaleStats.sampleSize
    });
  }

  console.log(`✓ Gender DIF calculated for ${results.length} items`);
  return results;
}

/**
 * Calculate Percentile DIF Analysis
 * Divides students into quintiles (P1-P5) and compares each to OECS average
 *
 * @param {Array} students - Array of student objects with total_score and responses
 * @param {Array} items - Array of item objects
 * @returns {Array} - Array of DIF results for each item × percentile combination
 */
export function calculatePercentileDIF(students, items) {
  const results = [];

  if (students.length < 50) {
    console.warn(`Insufficient sample size for percentile DIF: ${students.length} students`);
    return results;
  }

  // Sort students by total score
  const sorted = [...students].sort((a, b) => b.total_score - a.total_score);

  // Divide into 5 quintiles
  const quintileSize = Math.floor(sorted.length / 5);
  const percentileGroups = {
    'P1': sorted.slice(4 * quintileSize), // Bottom 20% (0-20th percentile)
    'P2': sorted.slice(3 * quintileSize, 4 * quintileSize), // 21-40th
    'P3': sorted.slice(2 * quintileSize, 3 * quintileSize), // 41-60th
    'P4': sorted.slice(quintileSize, 2 * quintileSize), // 61-80th
    'P5': sorted.slice(0, quintileSize) // Top 20% (81-100th)
  };

  console.log(`Calculating Percentile DIF for ${items.length} items across 5 percentile groups`);

  for (const item of items) {
    const maxPoints = parseInt(item.max_points) || 1;

    // Calculate OECS average (all students)
    const oecsStats = calculateGroupDifficulty(students, item.id, maxPoints);
    if (!oecsStats) continue;

    // Calculate for each percentile group
    for (const [groupName, groupStudents] of Object.entries(percentileGroups)) {
      if (groupStudents.length < 5) continue; // Skip if too few students

      const groupStats = calculateGroupDifficulty(groupStudents, item.id, maxPoints);
      if (!groupStats) continue;

      const difScore = groupStats.difficulty - oecsStats.difficulty;
      const classification = classifyDIF(difScore);

      results.push({
        assessmentId: item.assessment_id,
        itemId: item.id,
        itemCode: item.item_code,
        difType: 'percentile',
        groupA: groupName,
        groupB: 'OECS',
        difficultyA: groupStats.difficulty,
        difficultyB: oecsStats.difficulty,
        difScore,
        classification,
        sampleSizeA: groupStats.sampleSize,
        sampleSizeB: oecsStats.sampleSize
      });
    }
  }

  console.log(`✓ Percentile DIF calculated for ${results.length} item-percentile combinations`);
  return results;
}

/**
 * Calculate Country DIF Analysis (on-demand)
 * Compares each country's performance to OECS average
 *
 * @param {Array} students - Array of student objects with country and responses
 * @param {Array} items - Array of item objects
 * @returns {Array} - Array of DIF results for each item × country combination
 */
export function calculateCountryDIF(students, items) {
  const results = [];

  // Group students by country
  const countriesMap = {};
  students.forEach(s => {
    const country = s.country || 'UNKNOWN';
    if (!countriesMap[country]) {
      countriesMap[country] = [];
    }
    countriesMap[country].push(s);
  });

  const countries = Object.keys(countriesMap).filter(c => c !== 'UNKNOWN');

  if (countries.length < 2) {
    console.warn('Country DIF requires at least 2 countries');
    return results;
  }

  console.log(`Calculating Country DIF for ${items.length} items across ${countries.length} countries`);

  for (const item of items) {
    const maxPoints = parseInt(item.max_points) || 1;

    // Calculate OECS average (all students)
    const oecsStats = calculateGroupDifficulty(students, item.id, maxPoints);
    if (!oecsStats) continue;

    // Calculate for each country
    for (const country of countries) {
      const countryStudents = countriesMap[country];
      if (countryStudents.length < 10) continue; // Skip if too few students

      const countryStats = calculateGroupDifficulty(countryStudents, item.id, maxPoints);
      if (!countryStats) continue;

      const difScore = countryStats.difficulty - oecsStats.difficulty;
      const classification = classifyDIF(difScore);

      results.push({
        assessmentId: item.assessment_id,
        itemId: item.id,
        itemCode: item.item_code,
        difType: 'country',
        groupA: country,
        groupB: 'OECS',
        difficultyA: countryStats.difficulty,
        difficultyB: oecsStats.difficulty,
        difScore,
        classification,
        sampleSizeA: countryStats.sampleSize,
        sampleSizeB: oecsStats.sampleSize
      });
    }
  }

  console.log(`✓ Country DIF calculated for ${results.length} item-country combinations`);
  return results;
}

/**
 * Calculate Country-Gender DIF Analysis (on-demand)
 * Within each country, compares male vs female performance
 *
 * @param {Array} students - Array of student objects with country, gender, and responses
 * @param {Array} items - Array of item objects
 * @returns {Array} - Array of DIF results for each item × country combination
 */
export function calculateCountryGenderDIF(students, items) {
  const results = [];

  // Group students by country
  const countriesMap = {};
  students.forEach(s => {
    const country = s.country || 'UNKNOWN';
    if (!countriesMap[country]) {
      countriesMap[country] = [];
    }
    countriesMap[country].push(s);
  });

  const countries = Object.keys(countriesMap).filter(c => c !== 'UNKNOWN');

  console.log(`Calculating Country-Gender DIF for ${items.length} items across ${countries.length} countries`);

  for (const item of items) {
    const maxPoints = parseInt(item.max_points) || 1;

    // Calculate for each country
    for (const country of countries) {
      const countryStudents = countriesMap[country];
      const maleStudents = countryStudents.filter(s => s.gender === 'M');
      const femaleStudents = countryStudents.filter(s => s.gender === 'F');

      if (maleStudents.length < 5 || femaleStudents.length < 5) continue; // Skip if too few students

      const maleStats = calculateGroupDifficulty(maleStudents, item.id, maxPoints);
      const femaleStats = calculateGroupDifficulty(femaleStudents, item.id, maxPoints);

      if (!maleStats || !femaleStats) continue;

      const difScore = maleStats.difficulty - femaleStats.difficulty;
      const classification = classifyDIF(difScore);

      results.push({
        assessmentId: item.assessment_id,
        itemId: item.id,
        itemCode: item.item_code,
        country,
        difType: 'country_gender',
        groupA: 'M',
        groupB: 'F',
        difficultyA: maleStats.difficulty,
        difficultyB: femaleStats.difficulty,
        difScore,
        classification,
        sampleSizeA: maleStats.sampleSize,
        sampleSizeB: femaleStats.sampleSize
      });
    }
  }

  console.log(`✓ Country-Gender DIF calculated for ${results.length} item-country combinations`);
  return results;
}
