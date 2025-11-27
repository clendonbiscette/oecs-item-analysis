import { query } from './src/db.js';

/**
 * Split Regional Assessment into Country-Specific Assessments
 * This script processes regional uploads and creates individual country assessments
 */

// Country code mapping (from student data codes to member state codes)
const COUNTRY_CODE_MAP = {
  'ANB': { memberStateId: 1, code: 'ANB', name: 'Antigua and Barbuda' },
  'ANG': { memberStateId: 1, code: 'ANB', name: 'Antigua and Barbuda' }, // Alternative code
  'BVI': { memberStateId: 2, code: 'BVI', name: 'British Virgin Islands' },
  'DOM': { memberStateId: 3, code: 'DMA', name: 'Dominica' },
  'DMA': { memberStateId: 3, code: 'DMA', name: 'Dominica' },
  'GRN': { memberStateId: 4, code: 'GRN', name: 'Grenada' },
  'MSR': { memberStateId: 5, code: 'MSR', name: 'Montserrat' },
  'SKN': { memberStateId: 6, code: 'SKN', name: 'Saint Kitts and Nevis' },
  'SLU': { memberStateId: 7, code: 'LCA', name: 'Saint Lucia' },
  'LCA': { memberStateId: 7, code: 'LCA', name: 'Saint Lucia' },
  'SVG': { memberStateId: 8, code: 'VCT', name: 'Saint Vincent and the Grenadines' },
  'VCT': { memberStateId: 8, code: 'VCT', name: 'Saint Vincent and the Grenadines' },
};

async function splitRegionalAssessment(regionalAssessmentId) {
  console.log(`\nProcessing regional assessment ID: ${regionalAssessmentId}`);

  try {
    // Get the regional assessment details
    const assessmentResult = await query(
      'SELECT * FROM assessments WHERE id = $1',
      [regionalAssessmentId]
    );

    if (assessmentResult.rows.length === 0) {
      throw new Error(`Assessment ${regionalAssessmentId} not found`);
    }

    const regionalAssessment = assessmentResult.rows[0];
    console.log(`Regional Assessment: ${regionalAssessment.name}`);

    // Get unique countries from student data
    const countriesResult = await query(
      `SELECT DISTINCT country, COUNT(*) as student_count
       FROM students
       WHERE assessment_id = $1
       GROUP BY country
       ORDER BY country`,
      [regionalAssessmentId]
    );

    console.log(`\nFound ${countriesResult.rows.length} countries in data:`);
    countriesResult.rows.forEach(row => {
      const mapping = COUNTRY_CODE_MAP[row.country];
      console.log(`  ${row.country} → ${mapping?.name || 'UNMAPPED'} (${row.student_count} students)`);
    });

    // Process each country
    for (const countryRow of countriesResult.rows) {
      const studentCountryCode = countryRow.country;
      const mapping = COUNTRY_CODE_MAP[studentCountryCode];

      if (!mapping) {
        console.warn(`⚠️  Skipping unmapped country code: ${studentCountryCode}`);
        continue;
      }

      console.log(`\n📍 Processing ${mapping.name}...`);

      // Check if country assessment already exists
      const existingResult = await query(
        `SELECT id FROM assessments
         WHERE country_id = $1 AND assessment_year = $2 AND name LIKE $3`,
        [mapping.memberStateId, regionalAssessment.assessment_year, `%${mapping.name}%`]
      );

      let countryAssessmentId;

      if (existingResult.rows.length > 0) {
        countryAssessmentId = existingResult.rows[0].id;
        console.log(`   Using existing assessment ID: ${countryAssessmentId}`);
      } else {
        // Create new country-specific assessment
        const newAssessmentResult = await query(
          `INSERT INTO assessments (name, country_id, assessment_year, uploaded_by, upload_date, student_count, item_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [
            `${regionalAssessment.assessment_year} OERA - ${mapping.name}`,
            mapping.memberStateId,
            regionalAssessment.assessment_year,
            regionalAssessment.uploaded_by,
            regionalAssessment.upload_date,
            countryRow.student_count,
            regionalAssessment.item_count
          ]
        );

        countryAssessmentId = newAssessmentResult.rows[0].id;
        console.log(`   ✅ Created new assessment ID: ${countryAssessmentId}`);

        // Get all students for this country
        const studentsResult = await query(
          `SELECT id FROM students
           WHERE assessment_id = $1 AND country = $2`,
          [regionalAssessmentId, studentCountryCode]
        );

        const studentIds = studentsResult.rows.map(r => r.id);
        console.log(`   Found ${studentIds.length} students`);

        // Copy students to new assessment
        await query(
          `INSERT INTO students (assessment_id, student_code, gender, total_score, country)
           SELECT $1, student_code, gender, total_score, country
           FROM students
           WHERE assessment_id = $2 AND country = $3`,
          [countryAssessmentId, regionalAssessmentId, studentCountryCode]
        );

        // Copy responses for these students
        await query(
          `INSERT INTO responses (student_id, item_id, response_value, is_correct)
           SELECT s_new.id, r.item_id, r.response_value, r.is_correct
           FROM responses r
           JOIN students s_old ON r.student_id = s_old.id
           JOIN students s_new ON s_new.student_code = s_old.student_code
             AND s_new.assessment_id = $1
           WHERE s_old.assessment_id = $2 AND s_old.country = $3`,
          [countryAssessmentId, regionalAssessmentId, studentCountryCode]
        );

        console.log(`   ✅ Copied student data and responses`);

        // Copy items
        await query(
          `INSERT INTO items (assessment_id, item_code, content_domain, cognitive_level, correct_answer)
           SELECT $1, item_code, content_domain, cognitive_level, correct_answer
           FROM items
           WHERE assessment_id = $2
           ON CONFLICT (assessment_id, item_code) DO NOTHING`,
          [countryAssessmentId, regionalAssessmentId]
        );

        console.log(`   ✅ Copied items`);
      }
    }

    console.log(`\n✅ Regional assessment split complete!`);
    console.log(`   Original regional assessment (ID: ${regionalAssessmentId}) preserved`);
    console.log(`   Created ${countriesResult.rows.length} country-specific assessments`);
    console.log(`\n⚠️  NEXT STEP: Run statistics recalculation for new assessments:`);
    console.log(`   node recalculate_statistics.cjs`);

  } catch (error) {
    console.error('❌ Error splitting assessment:', error);
    throw error;
  }
}

// Run the script
const regionalAssessmentId = process.argv[2] || 1;

splitRegionalAssessment(regionalAssessmentId)
  .then(() => {
    console.log('\n🎉 Migration complete!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  });
