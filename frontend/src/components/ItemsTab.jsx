import { useState } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  TableSortLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from 'recharts';
import { getItemDistractors } from '../services/api';

export default function ItemsTab({ assessmentId, items }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [distractors, setDistractors] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderBy, setOrderBy] = useState('item_code');
  const [order, setOrder] = useState('asc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');

  const handleViewDistractors = async (item) => {
    setSelectedItem(item);
    setLoading(true);
    setDialogOpen(true);

    try {
      const response = await getItemDistractors(assessmentId, item.id);
      setDistractors(response.data.distractors);
    } catch (err) {
      console.error('Failed to load distractor analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDialogOpen(false);
    setSelectedItem(null);
    setDistractors(null);
  };

  const getStatusColor = (status) => {
    const colors = {
      good: 'success',
      review: 'warning',
      poor: 'error',
    };
    return colors[status] || 'default';
  };

  const getInterpretationColor = (interpretation) => {
    if (!interpretation) return 'default';
    if (interpretation === 'excellent' || interpretation === 'good') return 'success';
    if (interpretation === 'fair' || interpretation === 'acceptable' || interpretation === 'moderate') return 'warning';
    return 'error';
  };

  // Sorting and filtering logic
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const getComparator = (order, orderBy) => {
    return order === 'desc'
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  };

  const descendingComparator = (a, b, orderBy) => {
    let aVal, bVal;

    if (orderBy === 'item_code') {
      aVal = parseInt(a.item_code.replace(/\D/g, '')) || 0;
      bVal = parseInt(b.item_code.replace(/\D/g, '')) || 0;
    } else if (orderBy === 'difficulty') {
      aVal = a.statistics.difficulty || 0;
      bVal = b.statistics.difficulty || 0;
    } else if (orderBy === 'discrimination') {
      aVal = a.statistics.discrimination || 0;
      bVal = b.statistics.discrimination || 0;
    } else if (orderBy === 'point_biserial') {
      aVal = a.statistics.point_biserial || 0;
      bVal = b.statistics.point_biserial || 0;
    } else {
      return 0;
    }

    if (bVal < aVal) return -1;
    if (bVal > aVal) return 1;
    return 0;
  };

  // Apply filters
  const filteredItems = items.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) {
      return false;
    }
    if (difficultyFilter !== 'all' && item.difficulty_interpretation !== difficultyFilter) {
      return false;
    }
    return true;
  });

  // Sort filtered items
  const sortedItems = [...filteredItems].sort(getComparator(order, orderBy));

  // Prepare scatter plot data
  const scatterData = sortedItems
    .filter(item => item.statistics.difficulty !== undefined && item.statistics.discrimination !== undefined)
    .map(item => ({
      difficulty: item.statistics.difficulty,
      discrimination: item.statistics.discrimination,
      item: item.item_code,
      status: item.status
    }));

  // Custom scatter plot tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Paper sx={{ p: 1.5 }}>
          <Typography variant="body2"><strong>{data.item}</strong></Typography>
          <Typography variant="caption" display="block">Difficulty: {data.difficulty.toFixed(3)}</Typography>
          <Typography variant="caption" display="block">Discrimination: {data.discrimination.toFixed(3)}</Typography>
          <Chip label={data.status} size="small" color={getStatusColor(data.status)} sx={{ mt: 0.5 }} />
        </Paper>
      );
    }
    return null;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Item Analysis
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Click the info icon to view distractor analysis for each item
      </Typography>

      {/* Difficulty vs Discrimination Scatter Plot */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Item Difficulty vs. Discrimination
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Items in the upper-right quadrant (moderate difficulty, high discrimination) are ideal. Items with low discrimination should be reviewed.
          </Typography>
          <Box sx={{ width: '100%', height: 400 }}>
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="difficulty"
                  domain={[0, 1]}
                  label={{ value: 'Difficulty (p-value)', position: 'insideBottom', offset: -10 }}
                />
                <YAxis
                  type="number"
                  dataKey="discrimination"
                  domain={[-1, 1]}
                  label={{ value: 'Discrimination Index', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0.3} stroke="#10b981" strokeDasharray="3 3" />
                <ReferenceLine x={0.5} stroke="#64748b" strokeDasharray="3 3" />
                <Scatter data={scatterData} fill="#2563eb" />
              </ScatterChart>
            </ResponsiveContainer>
          </Box>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              <strong>Interpretation:</strong> Horizontal line shows discrimination threshold (0.3). Vertical line shows moderate difficulty (0.5).
              Items below the horizontal line have poor discrimination and should be reviewed.
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Item Statistics Table */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, mt: 3 }}>
        <Typography variant="h6">
          Item Statistics ({sortedItems.length} items)
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Filter by Status</InputLabel>
            <Select
              value={statusFilter}
              label="Filter by Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="good">Good</MenuItem>
              <MenuItem value="review">Review</MenuItem>
              <MenuItem value="poor">Poor</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Filter by Difficulty</InputLabel>
            <Select
              value={difficultyFilter}
              label="Filter by Difficulty"
              onChange={(e) => setDifficultyFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="very easy">Very Easy</MenuItem>
              <MenuItem value="easy">Easy</MenuItem>
              <MenuItem value="moderate">Moderate</MenuItem>
              <MenuItem value="difficult">Difficult</MenuItem>
              <MenuItem value="very difficult">Very Difficult</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'item_code'}
                  direction={orderBy === 'item_code' ? order : 'asc'}
                  onClick={() => handleRequestSort('item_code')}
                >
                  <strong>Item</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell><strong>Type</strong></TableCell>
              <TableCell><strong>Max Points</strong></TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'difficulty'}
                  direction={orderBy === 'difficulty' ? order : 'asc'}
                  onClick={() => handleRequestSort('difficulty')}
                >
                  <strong>Difficulty</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell><strong>Interpretation</strong></TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'discrimination'}
                  direction={orderBy === 'discrimination' ? order : 'asc'}
                  onClick={() => handleRequestSort('discrimination')}
                >
                  <strong>Discrimination</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'point_biserial'}
                  direction={orderBy === 'point_biserial' ? order : 'asc'}
                  onClick={() => handleRequestSort('point_biserial')}
                >
                  <strong>Point-Biserial</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedItems.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>{item.item_code}</TableCell>
                <TableCell>
                  <Chip
                    label={item.item_type || 'MC'}
                    size="small"
                    color={item.item_type === 'CR' ? 'secondary' : 'primary'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>{item.max_points || 1}</TableCell>
                <TableCell>
                  {item.statistics.difficulty?.toFixed(3) || '-'}
                </TableCell>
                <TableCell>
                  {item.difficulty_interpretation && (
                    <Chip
                      label={item.difficulty_interpretation}
                      size="small"
                      color={getInterpretationColor(item.difficulty_interpretation)}
                    />
                  )}
                </TableCell>
                <TableCell>
                  {item.statistics.discrimination?.toFixed(3) || '-'}
                </TableCell>
                <TableCell>
                  {item.statistics.point_biserial?.toFixed(3) || '-'}
                </TableCell>
                <TableCell>
                  <Chip
                    label={item.status}
                    size="small"
                    color={getStatusColor(item.status)}
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleViewDistractors(item)}
                    title="View Distractor Analysis"
                  >
                    <InfoIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Distractor Analysis Dialog */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          Distractor Analysis - {selectedItem?.item_code}
          <Typography variant="caption" display="block" color="text.secondary">
            Correct Answer: {selectedItem?.correct_answer}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {loading ? (
            <Box textAlign="center" py={4}>
              <Typography>Loading...</Typography>
            </Box>
          ) : distractors ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Option</strong></TableCell>
                    <TableCell align="right"><strong>High Performers</strong></TableCell>
                    <TableCell align="right"><strong>Low Performers</strong></TableCell>
                    <TableCell align="right"><strong>Discrimination</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {distractors.map((distractor) => (
                    <TableRow
                      key={distractor.option}
                      sx={{
                        bgcolor: distractor.isCorrect ? 'success.light' : 'inherit',
                        '&:hover': { bgcolor: distractor.isCorrect ? 'success.light' : 'action.hover' }
                      }}
                    >
                      <TableCell>
                        <strong>{distractor.option}</strong>
                        {distractor.isCorrect && ' ✓'}
                      </TableCell>
                      <TableCell align="right">{distractor.upperCount}</TableCell>
                      <TableCell align="right">{distractor.lowerCount}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={distractor.discrimination.toFixed(3)}
                          size="small"
                          color={
                            distractor.isCorrect
                              ? distractor.discrimination > 0 ? 'success' : 'error'
                              : distractor.discrimination < 0 ? 'success' : 'error'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={distractor.status}
                          size="small"
                          color={distractor.status === 'functioning' ? 'success' : 'error'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography>No distractor data available</Typography>
          )}

          <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              <strong>Interpretation:</strong>
              <br />
              • Correct answer should have positive discrimination (more high performers selected it)
              <br />
              • Distractors should have negative discrimination (more low performers selected them)
              <br />
              • Non-functioning distractors have positive discrimination and should be revised
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
