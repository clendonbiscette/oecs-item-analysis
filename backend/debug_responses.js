import { query } from './src/db.js';

const res = await query(`
  SELECT s.id, s.student_code,
         json_agg(json_build_object(
           'item_id', r.item_id,
           'is_correct', r.is_correct
         )) as responses
  FROM students s
  LEFT JOIN responses r ON r.student_id = s.id
  WHERE s.assessment_id = 2
  GROUP BY s.id
  LIMIT 3
`);

console.log('Sample students from country assessment 2:');
res.rows.forEach(student => {
  console.log('\nStudent:', student.student_code);
  console.log('Responses array length:', student.responses.length);
  console.log('First few responses:', JSON.stringify(student.responses.slice(0, 5), null, 2));

  // Check for null entries
  const nullCount = student.responses.filter(r => r.item_id === null).length;
  console.log('Null item_id count:', nullCount);
});

process.exit(0);
