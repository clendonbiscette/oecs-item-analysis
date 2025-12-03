/**
 * Backfill DIF statistics for existing assessments in production
 * This calculates Gender and Percentile DIF for assessments that were uploaded
 * before the DIF feature was implemented
 */
import pg from 'pg';
import { calculateGenderDIF, calculatePercentileDIF } from './src/utils/dif.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres.kiwftkxmhrunhztbidjb:OecsAnalysis2025!SecurePass@aws-0-us-west-2.pooler.supabase.com:5432/postgres',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

async function backfillDIF() {
  const client = await pool.connect();

  try {
    console.log('🔄 Backfilling DIF statistics for existing assessments...\n');

    // Get all assessments
    const assessmentsResult = await client.query(`
      SELECT id, name, assessment_year, country
      FROM assessments
      ORDER BY id
    `);

    const assessments = assessmentsResult.rows;
    console.log(`Found ${assessments.length} assessment(s) in production\n`);

    for (const assessment of assessments) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📊 Processing: ${assessment.name} (${assessment.assessment_year})`);
      console.log(`   ID: ${assessment.id}, Country: ${assessment.country}`);
      console.log(`${'='.repeat(60)}\n`);

      // Check if DIF already exists for this assessment
      const existingDIFResult = await client.query(
        'SELECT COUNT(*) FROM dif_statistics WHERE assessment_id = $1',
        [assessment.id]
      );

      const existingCount = parseInt(existingDIFResult.rows[0].count);
      if (existingCount > 0) {
        console.log(`   ⏭️  Skipping - already has ${existingCount} DIF statistics`);
        continue;
      }

      // Get students with responses
      const studentsResult = await client.query(
        `SELECT s.*,
                json_agg(json_build_object(
                  'item_id', r.item_id,
                  'points_earned', r.points_earned
                )) as responses
         FROM students s
         LEFT JOIN responses r ON r.student_id = s.id
         WHERE s.assessment_id = $1
         GROUP BY s.id`,
        [assessment.id]
      );

      const students = studentsResult.rows;
      console.log(`   👥 Students: ${students.length}`);

      if (students.length === 0) {
        console.log(`   ⏭️  Skipping - no students found`);
        continue;
      }

      // Get items
      const itemsResult = await client.query(
        'SELECT * FROM items WHERE assessment_id = $1 ORDER BY item_code',
        [assessment.id]
      );

      const items = itemsResult.rows;
      console.log(`   📝 Items: ${items.length}\n`);

      // Calculate Gender DIF
      console.log('   🔢 Calculating Gender DIF...');
      const genderDIF = calculateGenderDIF(students, items);
      console.log(`   ✓ Generated ${genderDIF.length} gender DIF records`);

      // Calculate Percentile DIF
      console.log('   🔢 Calculating Percentile DIF...');
      const percentileDIF = calculatePercentileDIF(students, items);
      console.log(`   ✓ Generated ${percentileDIF.length} percentile DIF records`);

      // Combine all DIF results
      const allDIF = [...genderDIF, ...percentileDIF];
      console.log(`\n   💾 Inserting ${allDIF.length} total DIF records...`);

      if (allDIF.length === 0) {
        console.log('   ⚠️  No DIF data to insert (insufficient sample sizes)');
        continue;
      }

      // Batch insert DIF statistics
      const insertValues = allDIF.map((dif, index) => {
        const offset = index * 11;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`;
      }).join(',');

      const insertParams = allDIF.flatMap(dif => [
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
      ]);

      const insertQuery = `
        INSERT INTO dif_statistics (
          assessment_id, item_id, dif_type, group_a, group_b,
          difficulty_a, difficulty_b, dif_score, dif_classification,
          sample_size_a, sample_size_b
        ) VALUES ${insertValues}
        ON CONFLICT (assessment_id, item_id, dif_type, group_a, group_b) DO NOTHING
      `;

      await client.query(insertQuery, insertParams);
      console.log(`   ✅ Successfully inserted DIF statistics for assessment ${assessment.id}`);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ Backfill complete!');
    console.log(`${'='.repeat(60)}\n`);

    // Final verification
    const finalCountResult = await client.query('SELECT COUNT(*) FROM dif_statistics');
    console.log(`📊 Total DIF records in database: ${finalCountResult.rows[0].count}\n`);

  } catch (error) {
    console.error('❌ Backfill failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

backfillDIF().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
