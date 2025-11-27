import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Compare as CompareIcon,
  Timeline as TimelineIcon,
  Public as PublicIcon,
} from '@mui/icons-material';
import {
  getMemberStates,
  getYearOverYearComparison,
  getCrossCountryComparison,
  getTrends,
  getAvailableYears,
} from '../services/api';

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function Comparisons() {
  const [currentTab, setCurrentTab] = useState(0);
  const [memberStates, setMemberStates] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Year-over-Year state
  const [yoyCountry, setYoyCountry] = useState('');
  const [yoyYears, setYoyYears] = useState([]);
  const [yoyData, setYoyData] = useState(null);

  // Cross-Country state
  const [ccYear, setCcYear] = useState('');
  const [ccCountries, setCcCountries] = useState([]);
  const [ccData, setCcData] = useState(null);

  // Trends state
  const [trendsCountry, setTrendsCountry] = useState('');
  const [trendsStartYear, setTrendsStartYear] = useState('');
  const [trendsEndYear, setTrendsEndYear] = useState('');
  const [trendsData, setTrendsData] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [statesRes, yearsRes] = await Promise.all([
        getMemberStates(),
        getAvailableYears(),
      ]);
      setMemberStates(statesRes.data);
      setAvailableYears(yearsRes.data.years || []);
    } catch (err) {
      setError('Failed to load initial data');
      console.error(err);
    }
  };

  const handleYoySubmit = async () => {
    if (!yoyCountry) {
      setError('Please select a country');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await getYearOverYearComparison(
        yoyCountry,
        yoyYears.length > 0 ? yoyYears.join(',') : undefined
      );
      setYoyData(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load comparison data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCrossCountrySubmit = async () => {
    if (!ccYear) {
      setError('Please select a year');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await getCrossCountryComparison(
        ccYear,
        ccCountries.length > 0 ? ccCountries.join(',') : undefined
      );
      setCcData(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load comparison data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTrendsSubmit = async () => {
    if (!trendsCountry) {
      setError('Please select a country');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await getTrends(trendsCountry, trendsStartYear, trendsEndYear);
      setTrendsData(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load trends data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return 'N/A';
    return typeof num === 'number' ? num.toFixed(2) : num;
  };

  const formatPercent = (num) => {
    if (num === null || num === undefined) return 'N/A';
    return typeof num === 'number' ? `${num.toFixed(2)}%` : num;
  };

  const getTrendColor = (value) => {
    if (value > 0) return 'success';
    if (value < 0) return 'error';
    return 'default';
  };

  const getTrendIcon = (value) => {
    if (value > 0) return <TrendingUpIcon fontSize="small" />;
    if (value < 0) return <TrendingDownIcon fontSize="small" />;
    return null;
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Comparative Analysis
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Compare assessment performance across years and countries
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={(e, newValue) => setCurrentTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            icon={<TimelineIcon />}
            iconPosition="start"
            label="Year-over-Year"
            sx={{ textTransform: 'none', minHeight: 64 }}
          />
          <Tab
            icon={<PublicIcon />}
            iconPosition="start"
            label="Cross-Country"
            sx={{ textTransform: 'none', minHeight: 64 }}
          />
          <Tab
            icon={<CompareIcon />}
            iconPosition="start"
            label="Trends Analysis"
            sx={{ textTransform: 'none', minHeight: 64 }}
          />
        </Tabs>

        {/* Year-over-Year Tab */}
        <TabPanel value={currentTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Country</InputLabel>
                <Select
                  value={yoyCountry}
                  label="Country"
                  onChange={(e) => setYoyCountry(e.target.value)}
                >
                  {memberStates.map((state) => (
                    <MenuItem key={state.id} value={state.id}>
                      {state.state_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Years (Optional)</InputLabel>
                <Select
                  multiple
                  value={yoyYears}
                  label="Years (Optional)"
                  onChange={(e) => setYoyYears(e.target.value)}
                  renderValue={(selected) => selected.join(', ')}
                >
                  {availableYears.map((yearObj) => (
                    <MenuItem key={yearObj.year} value={yearObj.year}>
                      {yearObj.year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4} display="flex" alignItems="center">
              <Button
                variant="contained"
                fullWidth
                onClick={handleYoySubmit}
                disabled={loading}
                sx={{ height: 56 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Compare'}
              </Button>
            </Grid>
          </Grid>

          {yoyData && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                {yoyData.countryName} - Year-over-Year Comparison
              </Typography>

              {yoyData.trends && yoyData.trends.length > 0 && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {yoyData.trends.map((trend, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Card>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            {trend.fromYear} → {trend.toYear}
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1}>
                            {getTrendIcon(trend.meanChange)}
                            <Typography variant="h6">
                              {formatNumber(trend.meanChange)}
                            </Typography>
                            <Chip
                              label={formatPercent(trend.meanChangePercent)}
                              color={getTrendColor(trend.meanChange)}
                              size="small"
                            />
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            Mean Score Change
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Year</TableCell>
                      <TableCell>Assessment</TableCell>
                      <TableCell align="right">Students</TableCell>
                      <TableCell align="right">Items</TableCell>
                      <TableCell align="right">Mean</TableCell>
                      <TableCell align="right">Median</TableCell>
                      <TableCell align="right">Std Dev</TableCell>
                      <TableCell align="right">Cronbach α</TableCell>
                      <TableCell align="right">SDG MPL %</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {yoyData.comparisons.map((comp) => (
                      <TableRow key={comp.year} hover>
                        <TableCell>
                          <Chip label={comp.year} color="primary" size="small" />
                        </TableCell>
                        <TableCell>{comp.assessmentName}</TableCell>
                        <TableCell align="right">{comp.studentCount}</TableCell>
                        <TableCell align="right">{comp.itemCount}</TableCell>
                        <TableCell align="right">{formatNumber(comp.statistics.mean)}</TableCell>
                        <TableCell align="right">{formatNumber(comp.statistics.median)}</TableCell>
                        <TableCell align="right">{formatNumber(comp.statistics.stdev)}</TableCell>
                        <TableCell align="right">
                          {formatNumber(comp.statistics.cronbachAlpha)}
                        </TableCell>
                        <TableCell align="right">
                          {formatPercent(comp.statistics.sdgMplPercentage)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </TabPanel>

        {/* Cross-Country Tab */}
        <TabPanel value={currentTab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Year</InputLabel>
                <Select value={ccYear} label="Year" onChange={(e) => setCcYear(e.target.value)}>
                  {availableYears.map((yearObj) => (
                    <MenuItem key={yearObj.year} value={yearObj.year}>
                      {yearObj.year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Countries (Optional - All by default)</InputLabel>
                <Select
                  multiple
                  value={ccCountries}
                  label="Countries (Optional - All by default)"
                  onChange={(e) => setCcCountries(e.target.value)}
                  renderValue={(selected) =>
                    selected
                      .map((id) => memberStates.find((s) => s.id === id)?.state_code)
                      .join(', ')
                  }
                >
                  {memberStates.map((state) => (
                    <MenuItem key={state.id} value={state.id}>
                      {state.state_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4} display="flex" alignItems="center">
              <Button
                variant="contained"
                fullWidth
                onClick={handleCrossCountrySubmit}
                disabled={loading}
                sx={{ height: 56 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Compare'}
              </Button>
            </Grid>
          </Grid>

          {ccData && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                Cross-Country Comparison - {ccData.year}
              </Typography>

              {ccData.regionalAverage && (
                <Card sx={{ mb: 3, bgcolor: 'primary.lighter' }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      OECS Regional Average
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="body2" color="text.secondary">
                          Mean Score
                        </Typography>
                        <Typography variant="h5">
                          {formatNumber(ccData.regionalAverage.mean)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="body2" color="text.secondary">
                          SDG MPL %
                        </Typography>
                        <Typography variant="h5">
                          {formatPercent(ccData.regionalAverage.sdgMplPercentage)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="body2" color="text.secondary">
                          Countries
                        </Typography>
                        <Typography variant="h5">
                          {ccData.regionalAverage.countriesIncluded}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              )}

              <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mt: 3 }}>
                Country Rankings
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Rank</TableCell>
                      <TableCell>Country</TableCell>
                      <TableCell align="right">Mean Score</TableCell>
                      <TableCell align="right">SDG MPL %</TableCell>
                      <TableCell align="right">vs Regional Avg</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ccData.rankings.map((ranking) => (
                      <TableRow key={ranking.countryId} hover>
                        <TableCell>
                          <Chip
                            label={`#${ranking.rank}`}
                            color={ranking.rank <= 3 ? 'primary' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{ranking.countryName}</TableCell>
                        <TableCell align="right">{formatNumber(ranking.mean)}</TableCell>
                        <TableCell align="right">
                          {formatPercent(ranking.sdgMplPercentage)}
                        </TableCell>
                        <TableCell align="right">
                          {ccData.regionalAverage && ranking.mean !== null ? (
                            <Chip
                              label={formatNumber(ranking.mean - ccData.regionalAverage.mean)}
                              color={getTrendColor(ranking.mean - ccData.regionalAverage.mean)}
                              size="small"
                              icon={getTrendIcon(ranking.mean - ccData.regionalAverage.mean)}
                            />
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </TabPanel>

        {/* Trends Analysis Tab */}
        <TabPanel value={currentTab} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Country</InputLabel>
                <Select
                  value={trendsCountry}
                  label="Country"
                  onChange={(e) => setTrendsCountry(e.target.value)}
                >
                  {memberStates.map((state) => (
                    <MenuItem key={state.id} value={state.id}>
                      {state.state_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Start Year (Optional)</InputLabel>
                <Select
                  value={trendsStartYear}
                  label="Start Year (Optional)"
                  onChange={(e) => setTrendsStartYear(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  {availableYears.map((yearObj) => (
                    <MenuItem key={yearObj.year} value={yearObj.year}>
                      {yearObj.year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>End Year (Optional)</InputLabel>
                <Select
                  value={trendsEndYear}
                  label="End Year (Optional)"
                  onChange={(e) => setTrendsEndYear(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  {availableYears.map((yearObj) => (
                    <MenuItem key={yearObj.year} value={yearObj.year}>
                      {yearObj.year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3} display="flex" alignItems="center">
              <Button
                variant="contained"
                fullWidth
                onClick={handleTrendsSubmit}
                disabled={loading}
                sx={{ height: 56 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Analyze'}
              </Button>
            </Grid>
          </Grid>

          {trendsData && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                {trendsData.countryName} - Trends Analysis
              </Typography>

              {trendsData.trend && (
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Overall Trend
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="body2" color="text.secondary">
                          Direction
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                          {getTrendIcon(trendsData.trend.slope)}
                          <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                            {trendsData.trend.direction}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="body2" color="text.secondary">
                          Avg Change/Year
                        </Typography>
                        <Typography variant="h6">
                          {formatNumber(trendsData.trend.averageChangePerYear)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="body2" color="text.secondary">
                          Years Analyzed
                        </Typography>
                        <Typography variant="h6">{trendsData.yearsAnalyzed}</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              )}

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Year</TableCell>
                      <TableCell align="right">Mean</TableCell>
                      <TableCell align="right">Median</TableCell>
                      <TableCell align="right">Std Dev</TableCell>
                      <TableCell align="right">Cronbach α</TableCell>
                      <TableCell align="right">SDG MPL %</TableCell>
                      <TableCell align="right">Students</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {trendsData.dataPoints.map((point) => (
                      <TableRow key={point.year} hover>
                        <TableCell>
                          <Chip label={point.year} color="primary" size="small" />
                        </TableCell>
                        <TableCell align="right">{formatNumber(point.mean)}</TableCell>
                        <TableCell align="right">{formatNumber(point.median)}</TableCell>
                        <TableCell align="right">{formatNumber(point.stdev)}</TableCell>
                        <TableCell align="right">{formatNumber(point.cronbachAlpha)}</TableCell>
                        <TableCell align="right">
                          {formatPercent(point.sdgMplPercentage)}
                        </TableCell>
                        <TableCell align="right">{point.studentCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </TabPanel>
      </Paper>
    </Container>
  );
}
