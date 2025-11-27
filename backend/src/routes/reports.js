import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { generatePDFReport } from '../services/pdfReport.js';
import { query } from '../db.js';

const router = express.Router();

// Apply auth middleware
router.use(authMiddleware);

/**
 * POST /api/reports/generate
 * Generate a PDF report for an assessment
 */
router.post('/generate', async (req, res) => {
  try {
    const { assessmentId, reportType } = req.body;

    if (!assessmentId) {
      return res.status(400).json({ error: 'Assessment ID is required' });
    }

    // Verify assessment exists
    const assessmentResult = await query(
      'SELECT id, name, assessment_year FROM assessments WHERE id = $1',
      [assessmentId]
    );

    if (assessmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const assessment = assessmentResult.rows[0];
    const filename = `${assessment.name}_${assessment.assessment_year}_Test_Summary.pdf`;

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Generate and stream PDF
    const pdfDoc = await generatePDFReport(assessmentId);
    pdfDoc.pipe(res);

  } catch (error) {
    console.error('PDF generation error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF report: ' + error.message });
    }
  }
});

export default router;
