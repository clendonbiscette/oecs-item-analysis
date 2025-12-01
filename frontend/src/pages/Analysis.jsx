import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  Button,
} from '@mui/material';
import { Download as DownloadIcon, PictureAsPdf as PdfIcon } from '@mui/icons-material';
import { getStatistics, getAssessment, exportToExcel, generatePDFReport } from '../services/api';
import OverviewTab from '../components/OverviewTab';
import ItemsTab from '../components/ItemsTab';
import StudentsTab from '../components/StudentsTab';
import DistractorsTab from '../components/DistractorsTab';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} style={{ paddingTop: 24 }}>
      {value === index && children}
    </div>
  );
}

export default function Analysis() {
  const { id } = useParams();
  const [tab, setTab] = useState(0);
  const [assessment, setAssessment] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assessmentRes, statsRes] = await Promise.all([
        getAssessment(id),
        getStatistics(id),
      ]);
      setAssessment(assessmentRes.data);
      setStatistics(statsRes.data);
    } catch (err) {
      setError('Failed to load analysis data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportToExcel = async () => {
    try {
      const response = await exportToExcel(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = `${assessment.name}_${assessment.assessment_year}_Item_Analysis.xlsx`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export to Excel');
    }
  };

  const handleGeneratePDF = async () => {
    try {
      const response = await generatePDFReport(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = `${assessment.name}_${assessment.assessment_year}_Test_Summary.pdf`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('PDF generation error:', err);
      setError('Failed to generate PDF report');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" gutterBottom>
          {assessment?.name}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<PdfIcon />}
            onClick={handleGeneratePDF}
          >
            Generate PDF
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExportToExcel}
          >
            Export to Excel
          </Button>
        </Box>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item>
            <Typography variant="body2" color="text.secondary">
              Year: <strong>{assessment?.assessment_year}</strong>
            </Typography>
          </Grid>
          <Grid item>
            <Typography variant="body2" color="text.secondary">
              Country: <strong>{assessment?.country}</strong>
            </Typography>
          </Grid>
          <Grid item>
            <Typography variant="body2" color="text.secondary">
              Students: <strong>{assessment?.student_count}</strong>
            </Typography>
          </Grid>
          <Grid item>
            <Typography variant="body2" color="text.secondary">
              Items: <strong>{assessment?.item_count}</strong>
            </Typography>
          </Grid>
        </Grid>
      </Box>

      <Paper>
        <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)}>
          <Tab label="Overview" />
          <Tab label="Items" />
          <Tab label="Distractors" />
          <Tab label="Students" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <OverviewTab
            assessmentId={id}
            statistics={statistics}
            items={statistics?.itemStatistics || []}
            assessmentMetadata={statistics?.assessmentMetadata || {}}
          />
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <ItemsTab assessmentId={id} items={statistics?.itemStatistics || []} />
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <DistractorsTab assessmentId={id} />
        </TabPanel>

        <TabPanel value={tab} index={3}>
          <StudentsTab assessmentId={id} />
        </TabPanel>
      </Paper>
    </Container>
  );
}
