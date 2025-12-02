import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Assessment as AssessmentIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { getAssessments, deleteAssessment } from '../services/api';

export default function Dashboard() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const response = await getAssessments();
      setAssessments(response.data);
    } catch (err) {
      setError('Failed to load assessments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this assessment?')) {
      return;
    }

    try {
      await deleteAssessment(id);
      setAssessments(assessments.filter((a) => a.id !== id));
    } catch (err) {
      setError('Failed to delete assessment');
      console.error(err);
    }
  };

  const handleView = (id) => {
    navigate(`/analysis/${id}`);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header Section */}
      <Box sx={{ mb: 5 }}>
        <Typography
          variant="h3"
          sx={{
            mb: 1,
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1rem' }}>
          Welcome to OECS Assessment Item Analysis
        </Typography>
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 4 }}
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 5 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              border: 'none',
            }}
          >
            <CardContent>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <AssessmentIcon sx={{ fontSize: 40, opacity: 0.9 }} />
                </Box>
                <Typography
                  variant="body2"
                  sx={{ mb: 1, opacity: 0.9, fontWeight: 500, fontSize: '0.875rem' }}
                >
                  Total Assessments
                </Typography>
                <Typography variant="h2" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
                  {assessments.length}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <PeopleIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.2 }} />
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1, fontWeight: 600, fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  This Year (2025)
                </Typography>
                <Typography variant="h2" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: '-0.02em' }}>
                  {assessments.filter((a) => a.assessment_year === 2025).length}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card
            sx={{
              background: 'rgba(99, 102, 241, 0.04)',
              border: '2px dashed',
              borderColor: 'primary.main',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                background: 'rgba(99, 102, 241, 0.08)',
                borderColor: 'primary.dark',
                transform: 'translateY(-4px)',
              },
            }}
            onClick={() => navigate('/upload')}
          >
            <CardContent>
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                sx={{ py: 2 }}
              >
                <IconButton
                  sx={{
                    backgroundColor: 'primary.main',
                    color: 'white',
                    mb: 2,
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                  }}
                >
                  <AddIcon />
                </IconButton>
                <Typography variant="h6" fontWeight={600} color="primary.main">
                  Upload New Assessment
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Assessments Table */}
      <Paper sx={{ p: 0, overflow: 'hidden' }}>
        <Box sx={{ px: 3, py: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h5" fontWeight={600} sx={{ mb: 0.5 }}>
                Recent Assessments
              </Typography>
              <Typography variant="body2" color="text.secondary">
                View and manage all assessment data
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/upload')}
              sx={{
                px: 3,
                py: 1.25,
              }}
            >
              Upload
            </Button>
          </Box>
        </Box>

        {assessments.length === 0 ? (
          <Box textAlign="center" py={8}>
            <AssessmentIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2, opacity: 0.3 }} />
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              No assessments yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Upload your first assessment to get started with analysis
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/upload')}
            >
              Upload Assessment
            </Button>
          </Box>
        ) : (
          <TableContainer sx={{ px: 3, pb: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Year</TableCell>
                  <TableCell>Member State</TableCell>
                  <TableCell>Students</TableCell>
                  <TableCell>Items</TableCell>
                  <TableCell>Upload Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assessments.map((assessment) => (
                  <TableRow
                    key={assessment.id}
                    hover
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="text.primary">
                        {assessment.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {assessment.assessment_year}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {assessment.state_name || assessment.country}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={assessment.student_count}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: 'divider',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={assessment.item_count}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: 'divider',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(assessment.upload_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={assessment.status}
                        color={assessment.status === 'active' ? 'success' : 'default'}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          textTransform: 'capitalize',
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <IconButton
                          size="small"
                          onClick={() => handleView(assessment.id)}
                          title="View Analysis"
                          sx={{
                            color: 'primary.main',
                            '&:hover': {
                              backgroundColor: 'rgba(99, 102, 241, 0.08)',
                            },
                          }}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(assessment.id)}
                          title="Delete"
                          sx={{
                            color: 'error.main',
                            '&:hover': {
                              backgroundColor: 'rgba(239, 68, 68, 0.08)',
                            },
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
