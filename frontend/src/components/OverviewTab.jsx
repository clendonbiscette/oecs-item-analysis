import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  TableHead,
  Paper,
  Chip,
  Alert,
  AlertTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart } from 'recharts';
import { getScoreDistribution, getGenderAnalysis, getContentDomainAnalysis, getAvailableCountries, getSchoolAnalysis, getDistrictAnalysis, getSchoolTypeAnalysis, getPercentileAnalysis } from '../services/api';

export default function OverviewTab({ assessmentId, statistics, items = [], assessmentMetadata = {} }) {
  const [distribution, setDistribution] = useState([]);
  const [distributionStats, setDistributionStats] = useState(null);
  const [genderData, setGenderData] = useState([]);
  const [domainData, setDomainData] = useState([]);
  const [schoolData, setSchoolData] = useState([]);
  const [districtData, setDistrictData] = useState([]);
  const [schoolTypeData, setSchoolTypeData] = useState([]);
  const [percentileData, setPercentileData] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [availableCountries, setAvailableCountries] = useState([]);
  const [countryDistributions, setCountryDistributions] = useState([]);

  // Extract assessment metadata
  const { totalMaxPoints = 0, isWeighted = false, mcCount = 0, crCount = 0 } = assessmentMetadata;

  useEffect(() => {
    const loadData = async () => {
      await fetchAvailableCountries();
      fetchGenderAnalysis();
      fetchContentDomainAnalysis();
      fetchSchoolAnalysis();
      fetchDistrictAnalysis();
      fetchSchoolTypeAnalysis();
      fetchPercentileAnalysis();
    };
    loadData();
  }, [assessmentId]);

  useEffect(() => {
    if (availableCountries.length > 0) {
      fetchAllCountryDistributions();
    }
  }, [availableCountries]);

  useEffect(() => {
    fetchDistribution();
  }, [assessmentId, selectedCountry]);

  const fetchAvailableCountries = async () => {
    try {
      const response = await getAvailableCountries(assessmentId);
      setAvailableCountries(response.data);
    } catch (err) {
      console.error('Failed to load available countries:', err);
    }
  };

  const fetchDistribution = async () => {
    try {
      const country = selectedCountry === 'all' ? null : selectedCountry;
      const response = await getScoreDistribution(assessmentId, country);
      // New API format returns {distribution, statistics}
      if (response.data.distribution) {
        setDistribution(response.data.distribution);
        setDistributionStats(response.data.statistics);
      } else {
        // Fallback for old API format
        setDistribution(response.data);
      }
    } catch (err) {
      console.error('Failed to load score distribution:', err);
    }
  };

  const fetchAllCountryDistributions = async () => {
    try {
      const distributions = await Promise.all(
        availableCountries.map(async (country) => {
          const response = await getScoreDistribution(assessmentId, country);
          return {
            country,
            distribution: response.data.distribution || response.data,
            statistics: response.data.statistics
          };
        })
      );
      setCountryDistributions(distributions);
    } catch (err) {
      console.error('Failed to load country distributions:', err);
    }
  };

  const fetchGenderAnalysis = async () => {
    try {
      const response = await getGenderAnalysis(assessmentId);
      setGenderData(response.data);
    } catch (err) {
      console.error('Failed to load gender analysis:', err);
    }
  };

  const fetchContentDomainAnalysis = async () => {
    try {
      const response = await getContentDomainAnalysis(assessmentId);
      setDomainData(response.data);
    } catch (err) {
      console.error('Failed to load content domain analysis:', err);
    }
  };

  const fetchSchoolAnalysis = async () => {
    try {
      const response = await getSchoolAnalysis(assessmentId);
      setSchoolData(response.data);
    } catch (err) {
      console.error('Failed to load school analysis:', err);
    }
  };

  const fetchDistrictAnalysis = async () => {
    try {
      const response = await getDistrictAnalysis(assessmentId);
      setDistrictData(response.data);
    } catch (err) {
      console.error('Failed to load district analysis:', err);
    }
  };

  const fetchSchoolTypeAnalysis = async () => {
    try {
      const response = await getSchoolTypeAnalysis(assessmentId);
      setSchoolTypeData(response.data);
    } catch (err) {
      console.error('Failed to load school type analysis:', err);
    }
  };

  const fetchPercentileAnalysis = async () => {
    try {
      const response = await getPercentileAnalysis(assessmentId);
      setPercentileData(response.data);
    } catch (err) {
      console.error('Failed to load percentile analysis:', err);
    }
  };

  const testStats = statistics?.testStatistics || {};

  const getAlphaColor = (interpretation) => {
    const colors = {
      excellent: 'success',
      good: 'success',
      acceptable: 'warning',
      poor: 'error',
    };
    return colors[interpretation] || 'default';
  };

  // Create item difficulty distribution data
  const difficultyDistribution = items.reduce((acc, item) => {
    const difficulty = item.difficulty_interpretation || 'unknown';
    const existing = acc.find(d => d.category === difficulty);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ category: difficulty, count: 1 });
    }
    return acc;
  }, []);

  // Identify flagged items (poor or review status)
  const flaggedItems = items.filter(item => item.status === 'poor' || item.status === 'review');
  const poorItems = items.filter(item => item.status === 'poor');
  const reviewItems = items.filter(item => item.status === 'review');

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Test Statistics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Statistics
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell>Assessment Type</TableCell>
                      <TableCell align="right">
                        <strong>
                          {isWeighted ? (
                            <>Weighted ({mcCount} MC + {crCount} CR = {totalMaxPoints} points)</>
                          ) : (
                            <>Unweighted ({items.length} MC items = {items.length} points)</>
                          )}
                        </strong>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Number of Students</TableCell>
                      <TableCell align="right">
                        <strong>{testStats.n || 0}</strong>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Mean Score</TableCell>
                      <TableCell align="right">
                        <strong>
                          {testStats.mean?.toFixed(2) || '-'}
                          {isWeighted && totalMaxPoints > 0 && testStats.mean && (
                            <> / {totalMaxPoints} ({((testStats.mean / totalMaxPoints) * 100).toFixed(1)}%)</>
                          )}
                        </strong>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Median Score</TableCell>
                      <TableCell align="right">
                        <strong>
                          {testStats.median?.toFixed(2) || '-'}
                          {isWeighted && totalMaxPoints > 0 && testStats.median && (
                            <> / {totalMaxPoints} ({((testStats.median / totalMaxPoints) * 100).toFixed(1)}%)</>
                          )}
                        </strong>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Standard Deviation</TableCell>
                      <TableCell align="right">
                        <strong>{testStats.stdev?.toFixed(2) || '-'} points</strong>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Minimum Score</TableCell>
                      <TableCell align="right">
                        <strong>
                          {testStats.min || '-'}
                          {isWeighted && totalMaxPoints > 0 && testStats.min !== undefined && (
                            <> / {totalMaxPoints} ({((testStats.min / totalMaxPoints) * 100).toFixed(1)}%)</>
                          )}
                        </strong>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Maximum Score</TableCell>
                      <TableCell align="right">
                        <strong>
                          {testStats.max || '-'}
                          {isWeighted && totalMaxPoints > 0 && testStats.max && (
                            <> / {totalMaxPoints} ({((testStats.max / totalMaxPoints) * 100).toFixed(1)}%)</>
                          )}
                        </strong>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Mode</TableCell>
                      <TableCell align="right">
                        <strong>{testStats.mode?.toFixed(2) || '-'}</strong>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Variance</TableCell>
                      <TableCell align="right">
                        <strong>{testStats.variance?.toFixed(2) || '-'}</strong>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Skewness</TableCell>
                      <TableCell align="right">
                        <Box>
                          <strong>{testStats.skewness?.toFixed(3) || '-'}</strong>
                          {testStats.skewness_interpretation && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              ({testStats.skewness_interpretation})
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Kurtosis</TableCell>
                      <TableCell align="right">
                        <Box>
                          <strong>{testStats.kurtosis?.toFixed(3) || '-'}</strong>
                          {testStats.kurtosis_interpretation && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              ({testStats.kurtosis_interpretation})
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Reliability */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Reliability
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Cronbach's Alpha
                </Typography>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Typography variant="h3">
                    {testStats.cronbach_alpha?.toFixed(3) || '-'}
                  </Typography>
                  {testStats.cronbach_alpha_interpretation && (
                    <Chip
                      label={testStats.cronbach_alpha_interpretation}
                      color={getAlphaColor(testStats.cronbach_alpha_interpretation)}
                    />
                  )}
                </Box>

                <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                  Split-Half Reliability
                </Typography>
                <Typography variant="h4">
                  {testStats.split_half_reliability?.toFixed(3) || '-'}
                </Typography>

                <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                  Standard Error of Measurement
                </Typography>
                <Typography variant="h4">
                  {testStats.sem?.toFixed(2) || '-'}
                </Typography>

                <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    <strong>Interpretation Guide:</strong>
                    <br />
                    α ≥ 0.90: Excellent
                    <br />
                    α ≥ 0.80: Good
                    <br />
                    α ≥ 0.70: Acceptable
                    <br />
                    α &lt; 0.70: Poor
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Flagged Items Summary */}
        {flaggedItems.length > 0 && (
          <Grid item xs={12}>
            <Alert
              severity={poorItems.length > 0 ? "error" : "warning"}
              sx={{
                '& .MuiAlert-message': { width: '100%' }
              }}
            >
              <AlertTitle>
                <strong>Items Requiring Attention</strong>
              </AlertTitle>
              <Typography variant="body2" gutterBottom>
                {poorItems.length > 0 && `${poorItems.length} item${poorItems.length > 1 ? 's' : ''} with poor performance`}
                {poorItems.length > 0 && reviewItems.length > 0 && ' and '}
                {reviewItems.length > 0 && `${reviewItems.length} item${reviewItems.length > 1 ? 's' : ''} requiring review`}
              </Typography>

              <Card variant="outlined" sx={{ mt: 2, bgcolor: 'background.paper' }}>
                <CardContent>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Item</strong></TableCell>
                          <TableCell><strong>Status</strong></TableCell>
                          <TableCell align="right"><strong>Difficulty</strong></TableCell>
                          <TableCell align="right"><strong>Discrimination</strong></TableCell>
                          <TableCell align="right"><strong>Point-Biserial</strong></TableCell>
                          <TableCell><strong>Issues</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {flaggedItems.map((item) => {
                          const issues = [];
                          if (item.statistics.discrimination < 0.3) {
                            issues.push('Low discrimination');
                          }
                          if (item.statistics.difficulty < 0.2 || item.statistics.difficulty > 0.95) {
                            issues.push('Extreme difficulty');
                          }
                          if (item.statistics.point_biserial < 0.2) {
                            issues.push('Weak correlation');
                          }

                          return (
                            <TableRow key={item.id}>
                              <TableCell><strong>{item.item_code}</strong></TableCell>
                              <TableCell>
                                <Chip
                                  label={item.status}
                                  size="small"
                                  color={item.status === 'poor' ? 'error' : 'warning'}
                                />
                              </TableCell>
                              <TableCell align="right">
                                {item.statistics.difficulty?.toFixed(3) || '-'}
                              </TableCell>
                              <TableCell align="right">
                                <span style={{
                                  color: item.statistics.discrimination < 0.3 ? '#dc2626' : 'inherit',
                                  fontWeight: item.statistics.discrimination < 0.3 ? 'bold' : 'normal'
                                }}>
                                  {item.statistics.discrimination?.toFixed(3) || '-'}
                                </span>
                              </TableCell>
                              <TableCell align="right">
                                {item.statistics.point_biserial?.toFixed(3) || '-'}
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption" color="text.secondary">
                                  {issues.join(', ')}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      <strong>Recommendations:</strong>
                      <br />
                      • Items with low discrimination (&lt; 0.3) fail to differentiate between high and low performers
                      <br />
                      • Items with extreme difficulty (too easy &gt; 0.95 or too hard &lt; 0.2) provide limited information
                      <br />
                      • Items with weak point-biserial correlation (&lt; 0.2) may have issues with the key or distractors
                      <br />
                      • Review these items for revision or replacement in future assessments
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Alert>
          </Grid>
        )}

        {/* Score Distribution Chart with Normal Distribution Overlay */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Score Distribution with Normal Curve
                </Typography>
                {availableCountries.length > 0 && (
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Country</InputLabel>
                    <Select
                      value={selectedCountry}
                      label="Country"
                      onChange={(e) => setSelectedCountry(e.target.value)}
                    >
                      <MenuItem value="all">All Countries</MenuItem>
                      {availableCountries.map((country) => (
                        <MenuItem key={country} value={country}>
                          {country}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Box>
              <Box sx={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <ComposedChart data={distribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="binPercent"
                      label={{ value: 'Percentage Score (%)', position: 'insideBottom', offset: -5 }}
                      domain={[0, 100]}
                      ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
                    />
                    <YAxis label={{ value: 'Number of Students', angle: -90, position: 'insideLeft' }} />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === 'actual') return [value, 'Actual Count'];
                        if (name === 'expected') return [value.toFixed(2), 'Expected (Normal)'];
                        return [value, name];
                      }}
                      labelFormatter={(label) => `Score: ${label}%`}
                    />
                    <Legend
                      formatter={(value) => {
                        if (value === 'actual') return 'Actual Distribution';
                        if (value === 'expected') return 'Expected (Normal)';
                        return value;
                      }}
                    />
                    <Bar dataKey="actual" fill="#2563eb" name="actual" />
                    <Line type="monotone" dataKey="expected" stroke="#ef4444" strokeWidth={2} dot={false} name="expected" />
                  </ComposedChart>
                </ResponsiveContainer>
              </Box>
              {distributionStats && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    <strong>Distribution Analysis:</strong>
                    <br />
                    {distributionStats.skewnessInterpretation && (
                      <>• Skewness: {distributionStats.skewnessInterpretation}<br /></>
                    )}
                    {distributionStats.kurtosisInterpretation && (
                      <>• Kurtosis: {distributionStats.kurtosisInterpretation}<br /></>
                    )}
                    The red curve shows the expected normal distribution based on mean ({distributionStats.mean?.toFixed(2)}) and standard deviation ({distributionStats.stdev?.toFixed(2)}).
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Item Difficulty Distribution Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Item Difficulty Distribution
              </Typography>
              <Box sx={{ width: '100%', height: 300, mt: 2 }}>
                <ResponsiveContainer>
                  <BarChart data={difficultyDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" label={{ value: 'Difficulty Level', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Number of Items', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Gender Performance Analysis */}
        {genderData.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance by Gender
                </Typography>
                <Grid container spacing={3} sx={{ mt: 1 }}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Mean Score Comparison
                    </Typography>
                    <Box sx={{ width: '100%', height: 250 }}>
                      <ResponsiveContainer>
                        <BarChart data={genderData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="gender" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="meanScore" fill="#2563eb" name="Mean Score" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      % Achieving Minimum Proficiency Level (MPL)
                    </Typography>
                    <Box sx={{ width: '100%', height: 250 }}>
                      <ResponsiveContainer>
                        <BarChart data={genderData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="gender" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="mplPercentage" fill="#10b981" name="% at/above MPL" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Gender</strong></TableCell>
                            <TableCell align="right"><strong>Count</strong></TableCell>
                            <TableCell align="right"><strong>Mean Score</strong></TableCell>
                            <TableCell align="right"><strong>Std Dev</strong></TableCell>
                            <TableCell align="right"><strong>Min</strong></TableCell>
                            <TableCell align="right"><strong>Max</strong></TableCell>
                            <TableCell align="right"><strong>Above MPL</strong></TableCell>
                            <TableCell align="right"><strong>% Above MPL</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {genderData.map((row) => (
                            <TableRow key={row.gender}>
                              <TableCell>{row.gender === 'M' ? 'Male' : row.gender === 'F' ? 'Female' : row.gender}</TableCell>
                              <TableCell align="right">{row.count}</TableCell>
                              <TableCell align="right">{row.meanScore.toFixed(2)}</TableCell>
                              <TableCell align="right">{row.stdDev.toFixed(2)}</TableCell>
                              <TableCell align="right">{row.minScore}</TableCell>
                              <TableCell align="right">{row.maxScore}</TableCell>
                              <TableCell align="right">{row.aboveMPL}</TableCell>
                              <TableCell align="right"><strong>{row.mplPercentage}%</strong></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* School Performance Analysis */}
        {schoolData.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance by School
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>School</strong></TableCell>
                        <TableCell align="right"><strong>Count</strong></TableCell>
                        <TableCell align="right"><strong>Mean Score</strong></TableCell>
                        <TableCell align="right"><strong>Mean %</strong></TableCell>
                        <TableCell align="right"><strong>Std Dev</strong></TableCell>
                        <TableCell align="right"><strong>Min</strong></TableCell>
                        <TableCell align="right"><strong>Max</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {schoolData.sort((a, b) => b.meanScore - a.meanScore).map((row) => (
                        <TableRow key={row.school}>
                          <TableCell>{row.school}</TableCell>
                          <TableCell align="right">{row.count}</TableCell>
                          <TableCell align="right">{row.meanScore.toFixed(2)}</TableCell>
                          <TableCell align="right"><strong>{row.meanPercentage}%</strong></TableCell>
                          <TableCell align="right">{row.stdDev.toFixed(2)}</TableCell>
                          <TableCell align="right">{row.minScore.toFixed(1)}</TableCell>
                          <TableCell align="right">{row.maxScore.toFixed(1)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* District Performance Analysis */}
        {districtData.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance by District
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={8}>
                    <Box sx={{ width: '100%', height: 300 }}>
                      <ResponsiveContainer>
                        <BarChart data={districtData.sort((a, b) => b.meanScore - a.meanScore)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="district" angle={-45} textAnchor="end" height={100} />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="meanScore" fill="#3b82f6" name="Mean Score" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>District</strong></TableCell>
                            <TableCell align="right"><strong>Count</strong></TableCell>
                            <TableCell align="right"><strong>Mean %</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {districtData.sort((a, b) => b.meanScore - a.meanScore).map((row) => (
                            <TableRow key={row.district}>
                              <TableCell>{row.district}</TableCell>
                              <TableCell align="right">{row.count}</TableCell>
                              <TableCell align="right"><strong>{row.meanPercentage}%</strong></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* School Type Performance Analysis */}
        {schoolTypeData.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance by School Type
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ width: '100%', height: 250 }}>
                      <ResponsiveContainer>
                        <BarChart data={schoolTypeData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="schoolType" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="meanScore" fill="#8b5cf6" name="Mean Score" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>School Type</strong></TableCell>
                            <TableCell align="right"><strong>Count</strong></TableCell>
                            <TableCell align="right"><strong>Mean Score</strong></TableCell>
                            <TableCell align="right"><strong>Mean %</strong></TableCell>
                            <TableCell align="right"><strong>Std Dev</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {schoolTypeData.sort((a, b) => b.meanScore - a.meanScore).map((row) => (
                            <TableRow key={row.schoolType}>
                              <TableCell>{row.schoolType}</TableCell>
                              <TableCell align="right">{row.count}</TableCell>
                              <TableCell align="right">{row.meanScore.toFixed(2)}</TableCell>
                              <TableCell align="right"><strong>{row.meanPercentage}%</strong></TableCell>
                              <TableCell align="right">{row.stdDev.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Content Domain Performance (Curriculum Outcomes) */}
        {domainData.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance by Content Domain (Curriculum Outcomes)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Student performance across different content areas. Domains are sorted from weakest to strongest to highlight areas needing attention.
                </Typography>
                <Box sx={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={domainData} layout="vertical" margin={{ left: 150 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} label={{ value: '% Performance', position: 'insideBottom', offset: -5 }} />
                      <YAxis type="category" dataKey="domain" width={140} />
                      <Tooltip />
                      <Bar
                        dataKey="averagePerformance"
                        fill="#f59e0b"
                        name="% Performance"
                        label={{ position: 'right', formatter: (value) => `${value.toFixed(1)}%` }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
                <TableContainer sx={{ mt: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Content Domain</strong></TableCell>
                        <TableCell align="right"><strong>Items</strong></TableCell>
                        <TableCell align="right"><strong>Max Points</strong></TableCell>
                        <TableCell align="right"><strong>Avg Points</strong></TableCell>
                        <TableCell align="right"><strong>Performance</strong></TableCell>
                        <TableCell align="center"><strong>Level</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {domainData.map((domain) => (
                        <TableRow key={domain.domain}>
                          <TableCell>{domain.domain}</TableCell>
                          <TableCell align="right">{domain.itemCount}</TableCell>
                          <TableCell align="right">{domain.totalMaxPoints?.toFixed(0) || domain.itemCount}</TableCell>
                          <TableCell align="right">{domain.averagePoints?.toFixed(2) || '-'}</TableCell>
                          <TableCell align="right"><strong>{domain.averagePerformance.toFixed(1)}%</strong></TableCell>
                          <TableCell align="center">
                            <Chip
                              label={domain.performanceLevel || 'moderate'}
                              size="small"
                              color={
                                domain.performanceLevel === 'strong' ? 'success' :
                                domain.performanceLevel === 'weak' ? 'error' : 'warning'
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    <strong>Performance Levels:</strong> Strong (≥70%), Moderate (50-69%), Weak (&lt;50%)
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Percentile Group Analysis */}
        {percentileData && percentileData.items && percentileData.items.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Item Performance Across Percentile Groups
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  This analysis shows how each item performs for students of different ability levels (Top 25%, Middle 50%, Bottom 25%).
                  Good items should show positive discrimination - higher performing students should score better on each item.
                </Typography>

                {/* Group Summary */}
                {percentileData.groups && (
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 2, bgcolor: 'success.light' }}>
                        <Typography variant="subtitle2" gutterBottom>
                          <strong>{percentileData.groups.topGroup.label}</strong>
                        </Typography>
                        <Typography variant="body2">
                          Students: {percentileData.groups.topGroup.count}
                        </Typography>
                        <Typography variant="body2">
                          Score Range: {percentileData.groups.topGroup.minScore?.toFixed(1)} - {percentileData.groups.topGroup.maxScore?.toFixed(1)}
                        </Typography>
                        <Typography variant="body2">
                          Mean: {percentileData.groups.topGroup.avgScore?.toFixed(2)}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 2, bgcolor: 'warning.light' }}>
                        <Typography variant="subtitle2" gutterBottom>
                          <strong>{percentileData.groups.middleGroup.label}</strong>
                        </Typography>
                        <Typography variant="body2">
                          Students: {percentileData.groups.middleGroup.count}
                        </Typography>
                        <Typography variant="body2">
                          Score Range: {percentileData.groups.middleGroup.minScore?.toFixed(1)} - {percentileData.groups.middleGroup.maxScore?.toFixed(1)}
                        </Typography>
                        <Typography variant="body2">
                          Mean: {percentileData.groups.middleGroup.avgScore?.toFixed(2)}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 2, bgcolor: 'error.light' }}>
                        <Typography variant="subtitle2" gutterBottom>
                          <strong>{percentileData.groups.bottomGroup.label}</strong>
                        </Typography>
                        <Typography variant="body2">
                          Students: {percentileData.groups.bottomGroup.count}
                        </Typography>
                        <Typography variant="body2">
                          Score Range: {percentileData.groups.bottomGroup.minScore?.toFixed(1)} - {percentileData.groups.bottomGroup.maxScore?.toFixed(1)}
                        </Typography>
                        <Typography variant="body2">
                          Mean: {percentileData.groups.bottomGroup.avgScore?.toFixed(2)}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                )}

                {/* Item Performance Table */}
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Item</strong></TableCell>
                        <TableCell><strong>Type</strong></TableCell>
                        <TableCell align="right"><strong>Top 25%</strong></TableCell>
                        <TableCell align="right"><strong>Middle 50%</strong></TableCell>
                        <TableCell align="right"><strong>Bottom 25%</strong></TableCell>
                        <TableCell align="right"><strong>Discrimination</strong></TableCell>
                        <TableCell align="center"><strong>Status</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {percentileData.items.map((item) => (
                        <TableRow key={item.itemId}>
                          <TableCell>{item.itemCode}</TableCell>
                          <TableCell>
                            <Chip
                              label={item.itemType || 'MC'}
                              size="small"
                              color={item.itemType === 'CR' ? 'secondary' : 'primary'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            {item.topGroup.percentCorrect?.toFixed(1)}%
                          </TableCell>
                          <TableCell align="right">
                            {item.middleGroup.percentCorrect?.toFixed(1)}%
                          </TableCell>
                          <TableCell align="right">
                            {item.bottomGroup.percentCorrect?.toFixed(1)}%
                          </TableCell>
                          <TableCell align="right">
                            <strong>{item.discrimination?.toFixed(3)}</strong>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={item.discriminationStatus}
                              size="small"
                              color={
                                item.discriminationStatus === 'good' ? 'success' :
                                item.discriminationStatus === 'fair' ? 'warning' : 'error'
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    <strong>Interpretation:</strong> Percentages show the proportion of students in each group who answered correctly.
                    Discrimination is calculated as (Top 25% difficulty - Bottom 25% difficulty).
                    Good discrimination (≥0.30) indicates the item effectively differentiates between high and low performers.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Distribution Comparison Across Countries */}
        {countryDistributions.length > 1 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Score Distribution Comparison by Country
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Compare score distributions across all countries (same scale for easy comparison)
                </Typography>
                <Grid container spacing={3}>
                  {countryDistributions.map(({ country, distribution, statistics }) => (
                    <Grid item xs={12} md={6} lg={4} key={country}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom align="center">
                            <strong>{country}</strong>
                          </Typography>
                          <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mb: 1 }}>
                            n = {statistics?.totalStudents || 0} | M = {statistics?.mean?.toFixed(2) || '-'} | SD = {statistics?.stdev?.toFixed(2) || '-'}
                          </Typography>
                          <Box sx={{ width: '100%', height: 200 }}>
                            <ResponsiveContainer>
                              <ComposedChart data={distribution}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                  dataKey="binPercent"
                                  tick={{ fontSize: 10 }}
                                  label={{ value: 'Score (%)', position: 'insideBottom', offset: -5, fontSize: 10 }}
                                  domain={[0, 100]}
                                  ticks={[0, 20, 40, 60, 80, 100]}
                                />
                                <YAxis tick={{ fontSize: 10 }} label={{ value: 'Students', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                                <Tooltip
                                  formatter={(value, name) => {
                                    if (name === 'actual') return [value, 'Actual'];
                                    if (name === 'expected') return [value.toFixed(2), 'Normal'];
                                    return [value, name];
                                  }}
                                  labelFormatter={(label) => `${label}%`}
                                  contentStyle={{ fontSize: 12 }}
                                />
                                <Bar dataKey="actual" fill="#2563eb" name="actual" />
                                <Line type="monotone" dataKey="expected" stroke="#ef4444" strokeWidth={1.5} dot={false} name="expected" />
                              </ComposedChart>
                            </ResponsiveContainer>
                          </Box>
                          {statistics && (
                            <Box sx={{ mt: 1, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                {statistics.skewnessInterpretation && (
                                  <>• {statistics.skewnessInterpretation}<br /></>
                                )}
                                {statistics.kurtosisInterpretation && (
                                  <>• {statistics.kurtosisInterpretation}</>
                                )}
                              </Typography>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
