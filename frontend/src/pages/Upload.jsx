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
  CloudUpload as UploadIcon,
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
        // Not regional, navigate directly to analysis
        setTimeout(() => {
          console.log('Navigating to analysis page:', assessmentId);
          navigate(`/analysis/${assessmentId}`);
        }, 500);
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
    navigate(`/analysis/${regionalData.assessmentId}`);
  };

  const handleSplitIntoCountries = async () => {
    try {
      setRegionalDialogOpen(false);
      setLoading(true);
      setError('');

      console.log('Splitting regional assessment:', regionalData.assessmentId);
      const response = await splitRegionalAssessment(regionalData.assessmentId);
      console.log('Split response:', response.data);

      // Navigate to the regional assessment (user can see individual countries from assessments list)
      setTimeout(() => {
        navigate(`/analysis/${regionalData.assessmentId}`);
      }, 500);

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
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom>
        Upload Assessment
      </Typography>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Step 0: Upload File */}
        {activeStep === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select Assessment File
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Upload a CSV or Excel file containing student responses. Make sure the first row
              contains StudentID="KEY" with the answer key.
            </Typography>

            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadTemplate}
              sx={{ mb: 3 }}
            >
              Download CSV Template
            </Button>

            <Box
              sx={{
                border: '2px dashed',
                borderColor: 'primary.main',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                backgroundColor: 'background.default',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'action.hover',
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
              <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6">
                {file ? file.name : 'Click to select file'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                CSV or Excel files accepted (Max 10MB)
              </Typography>
            </Box>

            {loading && (
              <Box display="flex" justifyContent="center" mt={3}>
                <CircularProgress />
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

            <Box display="flex" gap={2} mt={3}>
              <Button onClick={handleReset}>Start Over</Button>
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!validation.valid}
              >
                Continue
              </Button>
            </Box>
          </Box>
        )}

        {/* Step 2: Confirm Details */}
        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Assessment Details
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Provide information about this assessment
            </Typography>

            <TextField
              fullWidth
              label="Assessment Name"
              value={assessmentName}
              onChange={(e) => setAssessmentName(e.target.value)}
              required
              sx={{ mb: 2 }}
              placeholder="e.g., 2025 OERA - Regional or 2025 OERA - Grenada"
            />

            <TextField
              fullWidth
              label="Assessment Year"
              type="number"
              value={assessmentYear}
              onChange={(e) => setAssessmentYear(e.target.value)}
              required
              sx={{ mb: 2 }}
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
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>Regional Upload:</strong> The system will automatically detect countries
                  in your data and create separate assessments for each member state, while preserving
                  the regional assessment for overall analysis.
                </Typography>
              </Alert>
            )}

            <Box display="flex" gap={2}>
              <Button onClick={() => setActiveStep(1)}>Back</Button>
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!assessmentName || !country}
              >
                Upload Assessment
              </Button>
            </Box>
          </Box>
        )}

        {/* Step 3: Processing */}
        {activeStep === 3 && (
          <Box py={4}>
            <Typography variant="h6" gutterBottom textAlign="center">
              Processing Assessment
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
              Processing {validation?.summary?.studentCount || 0} students and {validation?.summary?.itemCount || 0} items
            </Typography>

            {/* Progress Bar */}
            <Box sx={{ mb: 4 }}>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="text.secondary">
                  Overall Progress
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {Math.round(uploadProgress)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={uploadProgress}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>

            {/* Stage List */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <List dense>
                {PROGRESS_STAGES.map((stage, index) => {
                  const isCompleted = index < currentStage;
                  const isCurrent = index === currentStage;
                  const isPending = index > currentStage;

                  return (
                    <ListItem key={stage.key}>
                      <ListItemIcon>
                        {isCompleted && <CheckIcon color="success" />}
                        {isCurrent && <CircularProgress size={24} />}
                        {isPending && <PendingIcon color="disabled" />}
                      </ListItemIcon>
                      <ListItemText
                        primary={stage.label}
                        primaryTypographyProps={{
                          color: isCompleted ? 'success.main' : isCurrent ? 'primary' : 'text.secondary',
                          fontWeight: isCurrent ? 'bold' : 'normal',
                        }}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </Paper>

            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>Please wait:</strong> Large files may take 2-3 minutes. Do not close this window.
              </Typography>
            </Alert>
          </Box>
        )}
      </Paper>

      {/* Regional Assessment Split Dialog */}
      <Dialog
        open={regionalDialogOpen}
        onClose={handleKeepRegional}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Regional Assessment Detected</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            We found <strong>{regionalData?.countries.length || 0} countries</strong> in your uploaded data:
          </Typography>

          <List dense sx={{ mt: 2, mb: 2 }}>
            {regionalData?.countries.map((country, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={country.name}
                  secondary={`${country.studentCount} students`}
                />
              </ListItem>
            ))}
          </List>

          <Typography variant="body2" color="text.secondary">
            Would you like to create separate assessments for each country? This will allow
            individual country analysis while keeping the regional assessment for overall comparison.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleKeepRegional} variant="outlined">
            Keep Regional Only
          </Button>
          <Button onClick={handleSplitIntoCountries} variant="contained" color="primary">
            Split into Countries
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
