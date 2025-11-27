import PDFDocument from 'pdfkit';
import { query } from '../db.js';

/**
 * Generate PDF Test Summary Report
 */
export async function generatePDFReport(assessmentId) {
  try {
    // Get assessment details
    const assessmentResult = await query(
      'SELECT * FROM assessments WHERE id = $1',
      [assessmentId]
    );
    const assessment = assessmentResult.rows[0];

    if (!assessment) {
      throw new Error('Assessment not found');
    }

    // Get test-level statistics
    const statsResult = await query(
      `SELECT stat_type, stat_value
       FROM statistics
       WHERE assessment_id = $1 AND item_id IS NULL
       ORDER BY stat_type`,
      [assessmentId]
    );

    const stats = {};
    statsResult.rows.forEach(row => {
      stats[row.stat_type] = parseFloat(row.stat_value);
    });

    // Get item statistics
    const itemsResult = await query(
      `SELECT
         i.item_code,
         i.correct_answer,
         MAX(CASE WHEN s.stat_type = 'difficulty' THEN s.stat_value END) as difficulty,
         MAX(CASE WHEN s.stat_type = 'discrimination' THEN s.stat_value END) as discrimination,
         MAX(CASE WHEN s.stat_type = 'point_biserial' THEN s.stat_value END) as point_biserial
       FROM items i
       LEFT JOIN statistics s ON s.item_id = i.id
       WHERE i.assessment_id = $1
       GROUP BY i.id, i.item_code, i.correct_answer
       ORDER BY i.item_code`,
      [assessmentId]
    );

    // Get score distribution
    const scoresResult = await query(
      `SELECT total_score, COUNT(*) as count
       FROM students
       WHERE assessment_id = $1
       GROUP BY total_score
       ORDER BY total_score`,
      [assessmentId]
    );

    const scoreDistribution = {};
    scoresResult.rows.forEach(row => {
      scoreDistribution[row.total_score] = parseInt(row.count);
    });

    // Create PDF document
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    // Generate content
    generateCoverPage(doc, assessment);
    doc.addPage();
    generateTestStatistics(doc, assessment, stats);
    doc.addPage();
    generateScoreDistribution(doc, scoreDistribution, assessment.item_count);
    doc.addPage();
    generateItemStatistics(doc, itemsResult.rows);

    doc.end();

    return doc;
  } catch (error) {
    console.error('Error generating PDF report:', error);
    throw error;
  }
}

/**
 * Generate cover page
 */
function generateCoverPage(doc, assessment) {
  // Title
  doc.fontSize(28)
     .font('Helvetica-Bold')
     .text('Item Analysis Report', { align: 'center' });

  doc.moveDown(2);

  // OECS Logo placeholder
  doc.fontSize(16)
     .font('Helvetica')
     .text('Organisation of Eastern Caribbean States', { align: 'center' });

  doc.moveDown(3);

  // Assessment details
  doc.fontSize(14).font('Helvetica-Bold').text('Assessment Information', { align: 'left' });
  doc.moveDown(0.5);

  const details = [
    ['Assessment Name:', assessment.name],
    ['Year:', assessment.assessment_year],
    ['Country/Territory:', assessment.country],
    ['Number of Students:', assessment.student_count],
    ['Number of Items:', assessment.item_count],
    ['Upload Date:', new Date(assessment.upload_date).toLocaleDateString()]
  ];

  doc.fontSize(12).font('Helvetica');
  details.forEach(([label, value]) => {
    doc.text(`${label} `, { continued: true })
       .font('Helvetica-Bold')
       .text(value);
    doc.font('Helvetica');
    doc.moveDown(0.3);
  });

  // Footer
  doc.fontSize(10)
     .fillColor('#666')
     .text(
       `Generated on ${new Date().toLocaleString()}`,
       50,
       doc.page.height - 100,
       { align: 'center' }
     );
}

/**
 * Generate test statistics page
 */
function generateTestStatistics(doc, assessment, stats) {
  doc.fontSize(20)
     .font('Helvetica-Bold')
     .fillColor('#000')
     .text('Test-Level Statistics', { underline: true });

  doc.moveDown(1);

  // Descriptive statistics table
  doc.fontSize(14).font('Helvetica-Bold').text('Descriptive Statistics');
  doc.moveDown(0.5);

  const descriptiveStats = [
    ['Statistic', 'Value'],
    ['Number of Students', (stats.n || assessment.student_count).toString()],
    ['Number of Items', assessment.item_count.toString()],
    ['Mean Score', stats.mean?.toFixed(2) || 'N/A'],
    ['Median Score', stats.median?.toFixed(2) || 'N/A'],
    ['Standard Deviation', stats.stdev?.toFixed(2) || 'N/A'],
    ['Minimum Score', stats.min?.toString() || 'N/A'],
    ['Maximum Score', stats.max?.toString() || 'N/A']
  ];

  drawTable(doc, descriptiveStats, [200, 200]);
  doc.moveDown(2);

  // Reliability statistics
  doc.fontSize(14).font('Helvetica-Bold').text('Reliability Statistics');
  doc.moveDown(0.5);

  const reliabilityStats = [
    ['Statistic', 'Value', 'Interpretation'],
    [
      'Cronbach\'s Alpha',
      stats.cronbach_alpha?.toFixed(4) || 'N/A',
      interpretAlpha(stats.cronbach_alpha)
    ],
    [
      'Standard Error of Measurement (SEM)',
      stats.sem?.toFixed(2) || 'N/A',
      'Lower is better'
    ]
  ];

  drawTable(doc, reliabilityStats, [150, 100, 200]);
}

/**
 * Generate score distribution visualization
 */
function generateScoreDistribution(doc, scoreDistribution, maxScore) {
  doc.fontSize(20)
     .font('Helvetica-Bold')
     .text('Score Distribution', { underline: true });

  doc.moveDown(1);

  // Chart parameters
  const chartX = 80;
  const chartY = doc.y + 20;
  const chartWidth = 450;
  const chartHeight = 250;
  const maxCount = Math.max(...Object.values(scoreDistribution));

  // Draw axes
  doc.strokeColor('#000')
     .lineWidth(1)
     .moveTo(chartX, chartY)
     .lineTo(chartX, chartY + chartHeight)
     .lineTo(chartX + chartWidth, chartY + chartHeight)
     .stroke();

  // Draw bars
  const barWidth = chartWidth / (maxScore + 1);
  const maxBarHeight = chartHeight - 20;

  for (let score = 0; score <= maxScore; score++) {
    const count = scoreDistribution[score] || 0;
    const barHeight = (count / maxCount) * maxBarHeight;
    const x = chartX + (score * barWidth) + 2;
    const y = chartY + chartHeight - barHeight;

    // Bar
    doc.rect(x, y, barWidth - 4, barHeight)
       .fillAndStroke('#4CAF50', '#2E7D32');

    // Score label
    if (score % 2 === 0 || maxScore <= 25) {
      doc.fontSize(8)
         .fillColor('#000')
         .text(score.toString(), x, chartY + chartHeight + 5, {
           width: barWidth - 4,
           align: 'center'
         });
    }
  }

  // Axis labels
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text('Score', chartX + chartWidth / 2 - 20, chartY + chartHeight + 25);

  doc.save()
     .translate(chartX - 30, chartY + chartHeight / 2)
     .rotate(-90)
     .text('Frequency', 0, 0)
     .restore();
}

/**
 * Generate item statistics table
 */
function generateItemStatistics(doc, items) {
  doc.fontSize(20)
     .font('Helvetica-Bold')
     .text('Item-Level Statistics', { underline: true });

  doc.moveDown(1);

  // Table header
  const tableData = [
    ['Item', 'Answer', 'Difficulty', 'Discrimination', 'Point-Biserial', 'Status']
  ];

  // Add items
  items.forEach(item => {
    const difficulty = parseFloat(item.difficulty);
    const discrimination = parseFloat(item.discrimination);
    const pointBiserial = parseFloat(item.point_biserial);

    let status = 'Good';
    if (discrimination < 0.20) {
      status = 'Review';
    } else if (discrimination < 0.30 || (pointBiserial && pointBiserial < 0.20)) {
      status = 'Check';
    }

    tableData.push([
      item.item_code,
      item.correct_answer || 'N/A',
      difficulty?.toFixed(3) || 'N/A',
      discrimination?.toFixed(3) || 'N/A',
      pointBiserial?.toFixed(3) || 'N/A',
      status
    ]);
  });

  drawTable(doc, tableData, [60, 60, 80, 100, 100, 80], true);
}

/**
 * Draw a table in the PDF
 */
function drawTable(doc, data, columnWidths, allowPageBreak = false) {
  const startX = doc.x;
  let currentY = doc.y;
  const rowHeight = 20;
  const headerHeight = 25;

  data.forEach((row, rowIndex) => {
    const isHeader = rowIndex === 0;
    const height = isHeader ? headerHeight : rowHeight;

    // Check if we need a new page
    if (allowPageBreak && currentY + height > doc.page.height - 100) {
      doc.addPage();
      currentY = 50;
    }

    let currentX = startX;

    row.forEach((cell, colIndex) => {
      const width = columnWidths[colIndex];

      // Draw cell background for header
      if (isHeader) {
        doc.rect(currentX, currentY, width, height)
           .fillAndStroke('#E3F2FD', '#1976D2');
      }

      // Draw cell border
      doc.strokeColor('#BDBDBD')
         .lineWidth(0.5)
         .rect(currentX, currentY, width, height)
         .stroke();

      // Draw text
      const fontSize = isHeader ? 10 : 9;
      const font = isHeader ? 'Helvetica-Bold' : 'Helvetica';

      doc.fontSize(fontSize)
         .font(font)
         .fillColor('#000')
         .text(
           cell,
           currentX + 5,
           currentY + (height / 2) - (fontSize / 2),
           { width: width - 10, align: 'left' }
         );

      currentX += width;
    });

    currentY += height;
  });

  doc.y = currentY + 10;
}

/**
 * Interpret Cronbach's Alpha
 */
function interpretAlpha(alpha) {
  if (!alpha) return 'N/A';
  if (alpha >= 0.90) return 'Excellent';
  if (alpha >= 0.80) return 'Good';
  if (alpha >= 0.70) return 'Acceptable';
  return 'Poor';
}
