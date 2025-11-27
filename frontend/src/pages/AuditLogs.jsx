import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { getAuditLogs, getAuditLogStats, getAuditLog, exportAuditLogs } from '../services/api';

const ACTION_TYPES = [
  'login',
  'logout',
  'create',
  'update',
  'delete',
  'export',
  'view',
];

const RESOURCE_TYPES = [
  'assessment',
  'user',
  'report',
  'audit_logs',
];

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);

  // Filters
  const [actionTypeFilter, setActionTypeFilter] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Detail modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [page, rowsPerPage]);

  useEffect(() => {
    fetchStats();
  }, [startDate, endDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {
        limit: rowsPerPage,
        offset: page * rowsPerPage,
      };

      if (actionTypeFilter) params.actionType = actionTypeFilter;
      if (resourceTypeFilter) params.resourceType = resourceTypeFilter;
      if (statusFilter) params.status = statusFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await getAuditLogs(params);
      setLogs(response.data.logs);
      setTotal(response.data.pagination.total);
    } catch (err) {
      setError('Failed to load audit logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await getAuditLogStats(startDate, endDate);
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleFilterChange = () => {
    setPage(0);
    fetchData();
  };

  const handleClearFilters = () => {
    setActionTypeFilter('');
    setResourceTypeFilter('');
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
    setPage(0);
  };

  const handleViewDetail = async (logId) => {
    try {
      const response = await getAuditLog(logId);
      setSelectedLog(response.data);
      setDetailOpen(true);
    } catch (err) {
      setError('Failed to load log details');
      console.error(err);
    }
  };

  const handleExport = async () => {
    try {
      const params = {};
      if (actionTypeFilter) params.actionType = actionTypeFilter;
      if (resourceTypeFilter) params.resourceType = resourceTypeFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await exportAuditLogs(params);

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to export audit logs');
      console.error(err);
    }
  };

  const getStatusColor = (status) => {
    return status === 'success' ? 'success' : 'error';
  };

  const getStatusIcon = (status) => {
    return status === 'success' ? <CheckCircleIcon fontSize="small" /> : <ErrorIcon fontSize="small" />;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Audit Logs
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Comprehensive audit trail of all system actions and events
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Total Events
                </Typography>
                <Typography variant="h4">{stats.total.toLocaleString()}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Successful
                </Typography>
                <Typography variant="h4" color="success.main">
                  {stats.byStatus.find(s => s.status === 'success')?.count || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Failed
                </Typography>
                <Typography variant="h4" color="error.main">
                  {stats.byStatus.find(s => s.status === 'failure')?.count || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Top Action
                </Typography>
                <Typography variant="h6">
                  {stats.byActionType[0]?.action_type || 'N/A'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stats.byActionType[0]?.count || 0} times
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <FilterListIcon />
          <Typography variant="h6">Filters</Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Action Type</InputLabel>
              <Select
                value={actionTypeFilter}
                label="Action Type"
                onChange={(e) => setActionTypeFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {ACTION_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Resource Type</InputLabel>
              <Select
                value={resourceTypeFilter}
                label="Resource Type"
                onChange={(e) => setResourceTypeFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {RESOURCE_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="success">Success</MenuItem>
                <MenuItem value="failure">Failure</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2} display="flex" gap={1}>
            <Button variant="contained" onClick={handleFilterChange} fullWidth>
              Apply
            </Button>
            <Button variant="outlined" onClick={handleClearFilters}>
              Clear
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Export Button */}
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExport}
        >
          Export to CSV
        </Button>
      </Box>

      {/* Logs Table */}
      <Paper>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Resource</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>IP Address</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>{formatDate(log.created_at)}</TableCell>
                      <TableCell>
                        {log.user_name || 'System'}
                        {log.user_email && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {log.user_email}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip label={log.action_type} size="small" />
                      </TableCell>
                      <TableCell>
                        {log.resource_type ? (
                          <>
                            {log.resource_type}
                            {log.resource_id && (
                              <Typography variant="caption" display="block" color="text.secondary">
                                ID: {log.resource_id}
                              </Typography>
                            )}
                          </>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 300 }}>
                        <Typography variant="body2" noWrap>
                          {log.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{log.ip_address || '-'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.status}
                          color={getStatusColor(log.status)}
                          size="small"
                          icon={getStatusIcon(log.status)}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetail(log.id)}
                          title="View Details"
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </>
        )}
      </Paper>

      {/* Detail Dialog */}
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Audit Log Details</DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Timestamp
                  </Typography>
                  <Typography variant="body1">{formatDate(selectedLog.created_at)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={selectedLog.status}
                    color={getStatusColor(selectedLog.status)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    User
                  </Typography>
                  <Typography variant="body1">{selectedLog.user_name || 'System'}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedLog.user_email}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    User Role
                  </Typography>
                  <Typography variant="body1">{selectedLog.user_role || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Action Type
                  </Typography>
                  <Typography variant="body1">{selectedLog.action_type}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Resource
                  </Typography>
                  <Typography variant="body1">
                    {selectedLog.resource_type || '-'}
                    {selectedLog.resource_id && ` (ID: ${selectedLog.resource_id})`}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Description
                  </Typography>
                  <Typography variant="body1">{selectedLog.description}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    IP Address
                  </Typography>
                  <Typography variant="body1">{selectedLog.ip_address || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    User Agent
                  </Typography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                    {selectedLog.user_agent || '-'}
                  </Typography>
                </Grid>
                {selectedLog.error_message && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="error">
                      Error Message
                    </Typography>
                    <Typography variant="body2" color="error">
                      {selectedLog.error_message}
                    </Typography>
                  </Grid>
                )}
                {selectedLog.changes && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Changes
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'grey.50' }}>
                      <pre style={{ margin: 0, fontSize: '0.875rem', overflow: 'auto' }}>
                        {JSON.stringify(selectedLog.changes, null, 2)}
                      </pre>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
