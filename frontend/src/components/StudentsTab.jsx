import { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  TableSortLabel,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardContent,
  LinearProgress,
} from '@mui/material';
import { Search as SearchIcon, Info as InfoIcon } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { getStudents, getStudentContentDomains } from '../services/api';

export default function StudentsTab({ assessmentId }) {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderBy, setOrderBy] = useState('rank');
  const [order, setOrder] = useState('asc');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [domainData, setDomainData] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingDomains, setLoadingDomains] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [assessmentId]);

  useEffect(() => {
    filterStudents();
  }, [searchTerm, students]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await getStudents(assessmentId);
      setStudents(response.data);
      setFilteredStudents(response.data);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    if (!searchTerm) {
      setFilteredStudents(students);
      return;
    }

    const filtered = students.filter((student) =>
      student.student_code.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredStudents(filtered);
    setPage(0);
  };

  const handleViewDomains = async (student) => {
    setSelectedStudent(student);
    setLoadingDomains(true);
    setDialogOpen(true);

    try {
      const response = await getStudentContentDomains(assessmentId, student.id);
      setDomainData(response.data);
    } catch (err) {
      console.error('Failed to load student content domain analysis:', err);
    } finally {
      setLoadingDomains(false);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedStudent(null);
    setDomainData(null);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Sorting logic
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

    if (orderBy === 'student_code') {
      aVal = a.student_code?.toLowerCase() || '';
      bVal = b.student_code?.toLowerCase() || '';
    } else if (orderBy === 'gender') {
      aVal = a.gender?.toLowerCase() || '';
      bVal = b.gender?.toLowerCase() || '';
    } else if (orderBy === 'total_score') {
      aVal = parseFloat(a.total_score) || 0;
      bVal = parseFloat(b.total_score) || 0;
    } else if (orderBy === 'rank') {
      aVal = a.rank || 0;
      bVal = b.rank || 0;
    } else if (orderBy === 'percentile') {
      aVal = a.percentile || 0;
      bVal = b.percentile || 0;
    } else {
      return 0;
    }

    if (typeof aVal === 'string') {
      return bVal.localeCompare(aVal);
    } else {
      if (bVal < aVal) return -1;
      if (bVal > aVal) return 1;
      return 0;
    }
  };

  // Apply sorting to filtered students
  const sortedStudents = [...filteredStudents].sort(getComparator(order, orderBy));

  const paginatedStudents = sortedStudents.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Student List ({filteredStudents.length} students)
        </Typography>
        <TextField
          size="small"
          placeholder="Search by Student ID"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: 300 }}
        />
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'student_code'}
                  direction={orderBy === 'student_code' ? order : 'asc'}
                  onClick={() => handleRequestSort('student_code')}
                >
                  <strong>Student ID</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'gender'}
                  direction={orderBy === 'gender' ? order : 'asc'}
                  onClick={() => handleRequestSort('gender')}
                >
                  <strong>Gender</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'total_score'}
                  direction={orderBy === 'total_score' ? order : 'asc'}
                  onClick={() => handleRequestSort('total_score')}
                >
                  <strong>Total Score</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'rank'}
                  direction={orderBy === 'rank' ? order : 'asc'}
                  onClick={() => handleRequestSort('rank')}
                >
                  <strong>Rank</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'percentile'}
                  direction={orderBy === 'percentile' ? order : 'asc'}
                  onClick={() => handleRequestSort('percentile')}
                >
                  <strong>Percentile</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : paginatedStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No students found
                </TableCell>
              </TableRow>
            ) : (
              paginatedStudents.map((student) => (
                <TableRow key={student.id} hover>
                  <TableCell>{student.student_code}</TableCell>
                  <TableCell>{student.gender || '-'}</TableCell>
                  <TableCell align="right">
                    <strong>{student.total_score !== null ? student.total_score : '-'}</strong>
                  </TableCell>
                  <TableCell align="right">
                    {student.rank || '-'}
                  </TableCell>
                  <TableCell align="right">
                    {student.percentile !== undefined ? `${student.percentile}%` : '-'}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleViewDomains(student)}
                      title="View Content Domain Analysis"
                    >
                      <InfoIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={filteredStudents.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />

      {/* Student Content Domain Analysis Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Content Domain Analysis - {selectedStudent?.student_code}
          <Typography variant="caption" display="block" color="text.secondary">
            Total Score: {selectedStudent?.total_score} | Rank: {selectedStudent?.rank} | Percentile: {selectedStudent?.percentile}%
          </Typography>
        </DialogTitle>
        <DialogContent>
          {loadingDomains ? (
            <Box textAlign="center" py={4}>
              <Typography>Loading...</Typography>
            </Box>
          ) : domainData && domainData.domains && domainData.domains.length > 0 ? (
            <>
              {/* Performance Summary Cards */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {domainData.domains.map((domain) => (
                  <Grid item xs={12} sm={6} key={domain.domain}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {domain.domain}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {domain.correctCount} / {domain.totalItems} items correct
                        </Typography>
                        <Box sx={{ mt: 2 }}>
                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="caption">Student Performance</Typography>
                            <Typography variant="caption"><strong>{domain.studentPercentage}%</strong></Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={domain.studentPercentage}
                            sx={{
                              height: 8,
                              borderRadius: 1,
                              backgroundColor: '#e0e0e0',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: domain.studentPercentage >= domain.classAverage ? '#10b981' : '#f59e0b'
                              }
                            }}
                          />
                          <Box display="flex" justifyContent="space-between" mt={1}>
                            <Typography variant="caption" color="text.secondary">
                              Class Avg: {domain.classAverage}%
                            </Typography>
                            <Typography variant="caption" color={domain.studentPercentage >= domain.classAverage ? 'success.main' : 'warning.main'}>
                              {domain.studentPercentage >= domain.classAverage ? 'Above' : 'Below'} Average
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* Comparison Chart */}
              <Card sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Performance vs Class Average
                  </Typography>
                  <Box sx={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <BarChart
                        data={domainData.domains}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="domain"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis domain={[0, 100]} label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="studentPercentage" fill="#2563eb" name="Student" />
                        <Bar dataKey="classAverage" fill="#64748b" name="Class Average" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </>
          ) : (
            <Typography>No content domain data available for this student.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
