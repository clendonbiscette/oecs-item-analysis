import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  Alert,
  CircularProgress,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  UploadFile as UploadIcon,
  Download as DownloadIcon,
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as PendingIcon,
} from '@mui/icons-material';
import { validateFile, uploadAssessment, downloadTemplate, getMemberStates, splitRegionalAssessment } from '../services/api';

const steps = ['Upload File', 'Validation', 'Confirm Details', 'Processing'];

const PROGRESS_STAGES = [
  { key: 'upload', label: 'Uploading file to server' },
  { key: 'parse', label: 'Parsing assessment data' },
  { key: 'students', label: 'Inserting student records' },
  { key: 'statistics', label: 'Calculating test statistics' },
  { key: 'items', label: 'Calculating item statistics' },
  { key: 'finalize', label: 'Finalizing assessment' },
];

export default function Upload() {
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState(null);
  const [validation, setValidation] = useState(null);
  const [assessmentName, setAssessmentName] = useState('');
  const [assessmentYear, setAssessmentYear] = useState(new Date().getFullYear());
  const [country, setCountry] = useState('');
  const [memberStates, setMemberStates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [regionalDialogOpen, setRegionalDialogOpen] = useState(false);
  const [regionalData, setRegionalData] = useState(null);
  const navigate = useNavigate();

  // Fetch member states on mount
  useEffect(() => {
    const fetchMemberStates = async () => {
      try {
        const response = await getMemberStates();
        setMemberStates(response.data);
      } catch (err) {
        console.error('Failed to fetch member states:', err);
        setError('Failed to load member states');
      }
    };
    fetchMemberStates();
  }, []);

  const handleFileSelect = async (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError('');
    setLoading(true);

    try {
      const response = await validateFile(selectedFile);
      setValidation(response.data.validation);
      
      if (response.data.validation.valid) {
        setActiveStep(1);
      } else {
        setError('File validation failed. Please fix the errors and try again.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to validate file');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (activeStep === 1 && validation?.valid) {
      setActiveStep(2);
    } else if (activeStep === 2) {
      handleUpload();
    }
  };

  // Simulate progress through stages
  useEffect(() => {
    if (activeStep === 3 && loading) {
      const studentCount = validation?.summary?.studentCount || 1000;
      // Estimate total time based on student count (roughly 30ms per student for processing)
      const estimatedTime = Math.max(3000, studentCount * 30);
      const stageTime = estimatedTime / PROGRESS_STAGES.length;

      let stage = 0;
      const interval = setInterval(() => {
        stage++;
        if (stage < PROGRESS_STAGES.length) {
          setCurrentStage(stage);
          setUploadProgress((stage / PROGRESS_STAGES.length) * 100);
        } else {
          clearInterval(interval);
        }
      }, stageTime);

      return () => clearInterval(interval);
    }
  }, [activeStep, loading, validation]);

  const handleUpload = async () => {
    if (!assessmentName || !country) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setActiveStep(3);
    setError('');
    setCurrentStage(0);
    setUploadProgress(0);

    try {
      console.log('Starting upload...', { assessmentName, assessmentYear, country });
      const response = await uploadAssessment(file, assessmentName, assessmentYear, country);
      console.log('Upload response:', response.data);

      const assessmentId = response.data.assessmentId;
      const isRegional = response.data.isRegional;
      const countries = response.data.countries || [];

      if (!assessmentId) {
        throw new Error('No assessment ID returned from server');
      }

      // Set to completed
      setCurrentStage(PROGRESS_STAGES.length);
      setUploadProgress(100);

      // Check if regional and show dialog
      if (isRegional && countries.length > 0) {
        console.log(`Regional assessment detected with ${countries.length} countries`);

        // Store regional data for dialog
        setRegionalData({
          assessmentId,
          countries
        });

        // Show dialog
        setLoading(false);
        setRegionalDialogOpen(true);
      } else {
        // Not regional, navigate to dashboard where user can view the assessment
        setLoading(false);
        setActiveStep(2);
        setCurrentStage(PROGRESS_STAGES.length); // Mark all stages complete

        // Navigate to dashboard after brief delay to show completion
        setTimeout(() => {
          console.log('Upload complete, navigating to dashboard');
          navigate('/', { state: { uploadSuccess: true, assessmentId } });
        }, 1500);
      }

    } catch (err) {
      console.error('Upload error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to upload assessment';
      setError(errorMessage);
      setActiveStep(2);
      setLoading(false);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setFile(null);
    setValidation(null);
    setAssessmentName('');
    setError('');
  };

  const handleKeepRegional = () => {
    setRegionalDialogOpen(false);
    navigate('/', { state: { uploadSuccess: true, assessmentId: regionalData.assessmentId } });
  };

  const handleSplitIntoCountries = async () => {
    try {
      setRegionalDialogOpen(false);
      setLoading(true);
      setError('');

      console.log('Splitting regional assessment:', regionalData.assessmentId);
      const response = await splitRegionalAssessment(regionalData.assessmentId);
      console.log('Split response:', response.data);

      // Navigate to dashboard (user can see the split countries in the assessments list)
      setTimeout(() => {
        navigate('/', { state: { uploadSuccess: true, splitSuccess: true } });
      }, 1000);

    } catch (err) {
      console.error('Split error:', err);
      setError(err.response?.data?.error || 'Failed to split assessment');
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await downloadTemplate();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'OERA_Upload_Template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Template download error:', err);
      setError('Failed to download template');
    }
  };

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
          Upload Assessment
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1rem' }}>
          Upload and process assessment data with automatic validation
        </Typography>
      </Box>

      <Paper sx={{ p: { xs: 3, sm: 5 }, overflow: 'hidden' }}>
        <Stepper
          activeStep={activeStep}
          sx={{
            mb: 5,
            '& .MuiStepLabel-label': {
              fontSize: '0.9375rem',
              fontWeight: 500,
            },
            '& .MuiStepLabel-label.Mui-active': {
              fontWeight: 600,
            },
            '& .MuiStepConnector-line': {
              borderTopWidth: 2,
            },
          }}
        >
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 4 }}
            onClose={() => setError('')}
          >
            {error}
          </Alert>
        )}

        {/* Step 0: Upload File */}
        {activeStep === 0 && (
          <Box>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>
                Select Assessment File
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
                Upload a CSV or Excel file containing student responses. Ensure the first row
                contains StudentID="KEY" with the answer key.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadTemplate}
                sx={{
                  borderRadius: 2.5,
                  px: 3,
                }}
              >
                Download CSV Template
              </Button>
            </Box>

            <Box
              sx={{
                border: '3px dashed',
                borderColor: file ? 'success.main' : 'primary.main',
                borderRadius: 4,
                p: 6,
                textAlign: 'center',
                backgroundColor: file ? 'rgba(16, 185, 129, 0.04)' : 'rgba(99, 102, 241, 0.04)',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  backgroundColor: file ? 'rgba(16, 185, 129, 0.08)' : 'rgba(99, 102, 241, 0.08)',
                  borderColor: file ? 'success.dark' : 'primary.dark',
                  transform: 'translateY(-2px)',
                },
              }}
              component="label"
            >
              <input
                type="file"
                accept=".csv,.xlsx"
                hidden
                onChange={handleFileSelect}
                disabled={loading}
              />
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  backgroundColor: file ? 'success.main' : 'primary.main',
                  color: 'white',
                  mb: 3,
                }}
              >
                <UploadIcon sx={{ fontSize: 40 }} />
              </Box>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                {file ? file.name : 'Click to select or drag file here'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                CSV or Excel files accepted • Maximum 10MB
              </Typography>
            </Box>

            {loading && (
              <Box display="flex" flexDirection="column" alignItems="center" mt={4}>
                <CircularProgress size={40} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Validating file...
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Step 1: Validation Results */}
        {activeStep === 1 && validation && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Validation Results
            </Typography>

            {validation.valid ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                File validated successfully!
              </Alert>
            ) : (
              <Alert severity="error" sx={{ mb: 2 }}>
                Validation failed. Please fix the errors below.
              </Alert>
            )}

            {validation.errors && validation.errors.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="error" gutterBottom>
                  Errors:
                </Typography>
                {validation.errors.map((err, idx) => (
                  <Alert key={idx} severity="error" sx={{ mb: 1 }}>
                    {err}
                  </Alert>
                ))}
              </Box>
            )}

            {validation.warnings && validation.warnings.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="warning.main" gutterBottom>
                  Warnings:
                </Typography>
                {validation.warnings.map((warn, idx) => (
                  <Alert key={idx} severity="warning" sx={{ mb: 1 }}>
                    {warn}
                  </Alert>
                ))}
              </Box>
            )}

            {validation.summary && (
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Summary:
                </Typography>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell>Number of Students:</TableCell>
                      <TableCell><strong>{validation.summary.studentCount}</strong></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Number of Items:</TableCell>
                      <TableCell><strong>{validation.summary.itemCount}</strong></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Answer Key Found:</TableCell>
                      <TableCell>
                        <Chip
                          label={validation.summary.hasAnswerKey ? 'Yes' : 'No'}
                          color={validation.summary.hasAnswerKey ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                    {validation.summary.missingResponses > 0 && (
                      <TableRow>
                        <TableCell>Missing Responses:</TableCell>
                        <TableCell><strong>{validation.summary.missingResponses}</strong></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Paper>
            )}

            <Box display="flex" gap={2} mt={4} justifyContent="center">
              <Button
                variant="outlined"
                onClick={handleReset}
                sx={{ px: 4 }}
              >
                Start Over
              </Button>
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!validation.valid}
                sx={{ px: 4 }}
              >
                Continue
              </Button>
            </Box>
          </Box>
        )}

        {/* Step 2: Confirm Details */}
        {activeStep === 2 && (
          <Box>
            <Box sx={{ textAlign: 'center', mb: 5 }}>
              <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>
                Assessment Details
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Provide information about this assessment
              </Typography>
            </Box>

            <Box sx={{ maxWidth: 600, mx: 'auto' }}>
              <TextField
                fullWidth
                label="Assessment Name"
                value={assessmentName}
                onChange={(e) => setAssessmentName(e.target.value)}
                required
                sx={{ mb: 3 }}
                placeholder="e.g., 2025 OERA - Regional or 2025 OERA - Grenada"
              />

              <TextField
                fullWidth
                label="Assessment Year"
                type="number"
                value={assessmentYear}
                onChange={(e) => setAssessmentYear(e.target.value)}
                required
                sx={{ mb: 3 }}
              />

              <FormControl fullWidth required sx={{ mb: 3 }}>
                <InputLabel>Member State / Region</InputLabel>
                <Select
                  value={country}
                  label="Member State / Region"
                  onChange={(e) => setCountry(e.target.value)}
                >
                  <MenuItem value="Regional">
                    <strong>Regional (Multiple Countries)</strong>
                  </MenuItem>
                  {memberStates.map((state) => (
                    <MenuItem key={state.id} value={state.state_name}>
                      {state.state_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {country === 'Regional' && (
                <Alert severity="info" sx={{ mb: 4 }}>
                  <Typography variant="body2">
                    <strong>Regional Upload:</strong> The system will automatically detect countries
                    in your data and create separate assessments for each member state, while preserving
                    the regional assessment for overall analysis.
                  </Typography>
                </Alert>
              )}

              <Box display="flex" gap={2} mt={4}>
                <Button
                  variant="outlined"
                  onClick={() => setActiveStep(1)}
                  sx={{ flex: 1, py: 1.25 }}
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={!assessmentName || !country}
                  sx={{ flex: 1, py: 1.25 }}
                >
                  Upload Assessment
                </Button>
              </Box>
            </Box>
          </Box>
        )}

        {/* Step 3: Processing */}
        {activeStep === 3 && (
          <Box py={6}>
            <Box sx={{ textAlign: 'center', mb: 5 }}>
              <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>
                Processing Assessment
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Processing {validation?.summary?.studentCount || 0} students and {validation?.summary?.itemCount || 0} items
              </Typography>
            </Box>

            {/* Progress Bar */}
            <Box sx={{ maxWidth: 600, mx: 'auto', mb: 5 }}>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Overall Progress
                </Typography>
                <Typography variant="body2" color="primary.main" fontWeight={700}>
                  {Math.round(uploadProgress)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={uploadProgress}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: 'grey.100',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 5,
                    background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
                  },
                }}
              />
            </Box>

            {/* Stage List */}
            <Box sx={{ maxWidth: 600, mx: 'auto' }}>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                <List>
                  {PROGRESS_STAGES.map((stage, index) => {
                    const isCompleted = index < currentStage;
                    const isCurrent = index === currentStage;
                    const isPending = index > currentStage;

                    return (
                      <ListItem
                        key={stage.key}
                        sx={{
                          py: 1.5,
                          px: 0,
                          borderRadius: 2,
                          transition: 'all 0.2s ease-in-out',
                          backgroundColor: isCurrent ? 'rgba(99, 102, 241, 0.04)' : 'transparent',
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          {isCompleted && <CheckIcon sx={{ color: 'success.main', fontSize: 28 }} />}
                          {isCurrent && <CircularProgress size={24} />}
                          {isPending && <PendingIcon sx={{ color: 'grey.300', fontSize: 28 }} />}
                        </ListItemIcon>
                        <ListItemText
                          primary={stage.label}
                          primaryTypographyProps={{
                            color: isCompleted ? 'success.main' : isCurrent ? 'primary.main' : 'text.secondary',
                            fontWeight: isCurrent ? 600 : 500,
                            fontSize: '0.9375rem',
                          }}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              </Paper>

              <Alert
                severity="info"
                sx={{
                  mt: 4,
                  borderRadius: 2.5,
                  backgroundColor: 'rgba(59, 130, 246, 0.04)',
                }}
              >
                <Typography variant="body2">
                  <strong>Please wait:</strong> Large files may take 2-3 minutes. Do not close this window.
                </Typography>
              </Alert>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Regional Assessment Split Dialog */}
      <Dialog
        open={regionalDialogOpen}
        onClose={handleKeepRegional}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Typography variant="h5" fontWeight={600}>
            Regional Assessment Detected
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 3 }}>
            We found <strong>{regionalData?.countries.length || 0} countries</strong> in your uploaded data:
          </Typography>

          <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <List dense disablePadding>
              {regionalData?.countries.map((country, index) => (
                <ListItem
                  key={index}
                  sx={{
                    py: 1,
                    borderBottom: index < (regionalData?.countries.length || 0) - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight={600}>
                        {country.name}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {country.studentCount} students
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>

          <Typography variant="body2" color="text.secondary">
            Would you like to create separate assessments for each country? This will allow
            individual country analysis while keeping the regional assessment for overall comparison.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            onClick={handleKeepRegional}
            variant="outlined"
            sx={{ px: 3, py: 1 }}
          >
            Keep Regional Only
          </Button>
          <Button
            onClick={handleSplitIntoCountries}
            variant="contained"
            sx={{ px: 3, py: 1 }}
          >
            Split into Countries
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
