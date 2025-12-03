import { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Collapse,
  IconButton,
} from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import { getDistractorAnalysis } from '../services/api';
import { sortItems } from '../utils/itemSorting';

function ItemRow({ itemData }) {
  const [open, setOpen] = useState(false);

  const getStatusColor = (status) => {
    if (status === 'functioning') return 'success';
    if (status.includes('poor') || status.includes('non-functioning')) return 'error';
    return 'default';
  };

  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          <strong>{itemData.item_code}</strong>
        </TableCell>
        <TableCell align="center">
          <Chip label={itemData.correct_answer} color="primary" size="small" />
        </TableCell>
        <TableCell align="center">
          {itemData.distractors?.length || 4}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="subtitle2" gutterBottom component="div">
                Distractor Analysis for {itemData.item_code}
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Option</strong></TableCell>
                    <TableCell align="center"><strong>Upper 27% Count</strong></TableCell>
                    <TableCell align="center"><strong>Lower 27% Count</strong></TableCell>
                    <TableCell align="center"><strong>Discrimination</strong></TableCell>
                    <TableCell align="center"><strong>Status</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {itemData.distractors?.map((distractor) => (
                    <TableRow
                      key={distractor.option}
                      sx={{
                        backgroundColor: distractor.isCorrect ? '#e3f2fd' : 'inherit'
                      }}
                    >
                      <TableCell>
                        {distractor.option}
                        {distractor.isCorrect && ' ✓'}
                      </TableCell>
                      <TableCell align="center">{distractor.upperCount}</TableCell>
                      <TableCell align="center">{distractor.lowerCount}</TableCell>
                      <TableCell align="center">
                        {distractor.discrimination?.toFixed(4) || 'N/A'}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={distractor.status}
                          color={getStatusColor(distractor.status)}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function DistractorsTab({ assessmentId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDistractorData();
  }, [assessmentId]);

  const fetchDistractorData = async () => {
    try {
      setLoading(true);
      const response = await getDistractorAnalysis(assessmentId);
      console.log('Distractor analysis response:', response);
      console.log('Distractor data:', response.data);
      setData(response.data);
    } catch (err) {
      console.error('Failed to load distractor analysis:', err);
      console.error('Error response:', err.response);
      console.error('Error message:', err.message);
      setError(`Failed to load distractor analysis: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (data.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">No distractor analysis data available</Alert>
      </Box>
    );
  }

  // Sort data: MC items first, then CR items, each in natural order (Q1, Q1a, Q1b, Q2, etc.)
  const sortedData = sortItems(data);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Distractor Analysis
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Analysis of response options showing selection patterns by high and low performers.
        Click the arrow to expand each item's detailed analysis.
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell><strong>Item</strong></TableCell>
              <TableCell align="center"><strong>Correct Answer</strong></TableCell>
              <TableCell align="center"><strong>Options</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedData.map((itemData) => (
              <ItemRow key={itemData.item_code} itemData={itemData} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 3 }}>
        <Typography variant="caption" color="text.secondary">
          <strong>Note:</strong> Upper 27% and Lower 27% refer to students with highest and lowest total scores.
          Functioning distractors should attract more low performers than high performers (negative discrimination for incorrect options).
        </Typography>
      </Box>
    </Box>
  );
}
