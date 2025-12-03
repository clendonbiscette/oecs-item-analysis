import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { getGenderDIF, getPercentileDIF, getCountryDIF, getCountryGenderDIF, getPercentileGenderDIF } from '../services/api';
import AdvancedDIFChart from './AdvancedDIFChart';

/**
 * Get color for DIF classification chip
 */
const getDIFColor = (classification) => {
  switch (classification) {
    case 'Negligible':
      return 'success';
    case 'Slight to Moderate':
      return 'warning';
    case 'Moderate to Large':
      return 'error';
    default:
      return 'default';
  }
};

/**
 * Get cell background color for heatmap
 */
const getDIFBackgroundColor = (classification) => {
  switch (classification) {
    case 'Negligible':
      return '#e8f5e9';
    case 'Slight to Moderate':
      return '#fff3e0';
    case 'Moderate to Large':
      return '#ffebee';
    default:
      return '#ffffff';
  }
};

const DIFTab = ({ assessmentId }) => {
  const [genderDIF, setGenderDIF] = useState(null);
  const [percentileDIF, setPercentileDIF] = useState(null);
  const [countryDIF, setCountryDIF] = useState(null);
  const [countryGenderDIF, setCountryGenderDIF] = useState(null);
  const [percentileGenderDIF, setPercentileGenderDIF] = useState(null);
  const [loading, setLoading] = useState({
    gender: true,
    percentile: true,
    country: true,
    countryGender: true,
    percentileGender: true
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!assessmentId) return;

    // Fetch all DIF types in parallel
    const fetchAllDIF = async () => {
      try {
        // Fetch pre-calculated (fast)
        const [genderRes, percentileRes] = await Promise.all([
          getGenderDIF(assessmentId).catch(err => {
            console.error('Gender DIF error:', err);
            return { data: { itemDIF: [] } };
          }),
          getPercentileDIF(assessmentId).catch(err => {
            console.error('Percentile DIF error:', err);
            return { data: [] };
          })
        ]);

        setGenderDIF(genderRes.data);
        setPercentileDIF(percentileRes.data);
        setLoading(prev => ({ ...prev, gender: false, percentile: false }));

        // Fetch on-demand (slower)
        const [countryRes, countryGenderRes, percentileGenderRes] = await Promise.all([
          getCountryDIF(assessmentId).catch(err => {
            console.error('Country DIF error:', err);
            return { data: [] };
          }),
          getCountryGenderDIF(assessmentId).catch(err => {
            console.error('Country-Gender DIF error:', err);
            return { data: [] };
          }),
          getPercentileGenderDIF(assessmentId).catch(err => {
            console.error('Percentile-Gender DIF error:', err);
            return { data: { itemData: [], allData: null } };
          })
        ]);

        setCountryDIF(countryRes.data);
        setCountryGenderDIF(countryGenderRes.data);
        setPercentileGenderDIF(percentileGenderRes.data);
        setLoading(prev => ({ ...prev, country: false, countryGender: false, percentileGender: false }));
      } catch (err) {
        console.error('DIF fetch error:', err);
        setError('Failed to load DIF analysis');
        setLoading({ gender: false, percentile: false, country: false, countryGender: false, percentileGender: false });
      }
    };

    fetchAllDIF();
  }, [assessmentId]);

  // Gender DIF Section
  const renderGenderDIF = () => {
    if (loading.gender) {
      return (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      );
    }

    if (!genderDIF || !genderDIF.itemDIF || genderDIF.itemDIF.length === 0) {
      return (
        <Alert severity="info">
          No Gender DIF data available. Requires at least 10 male and 10 female students.
        </Alert>
      );
    }

    // Calculate summary statistics
    const flaggedItems = genderDIF.itemDIF.filter(
      item => item.classification !== 'Negligible'
    ).length;
    const avgDIF = (
      genderDIF.itemDIF.reduce((sum, item) => sum + Math.abs(item.difScore), 0) /
      genderDIF.itemDIF.length
    ).toFixed(4);

    // Prepare chart data (all items for line chart)
    const lineChartData = genderDIF.itemDIF.map(item => ({
      item: item.itemCode,
      male: (item.maleDifficulty * 100).toFixed(1),
      female: (item.femaleDifficulty * 100).toFixed(1),
      maleRaw: item.maleDifficulty,
      femaleRaw: item.femaleDifficulty
    }));

    return (
      <Box>
        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Items Analyzed
                </Typography>
                <Typography variant="h4">{genderDIF.itemDIF.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Items with Flagged DIF
                </Typography>
                <Typography variant="h4">{flaggedItems}</Typography>
                <Typography variant="caption" color="textSecondary">
                  (Slight to Moderate or higher)
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Average Absolute DIF
                </Typography>
                <Typography variant="h4">{avgDIF}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Advanced Psychometric DIF Chart */}
        {loading.percentileGender ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Loading advanced DIF analysis...</Typography>
          </Box>
        ) : percentileGenderDIF && percentileGenderDIF.itemData && percentileGenderDIF.itemData.length > 0 ? (
          <AdvancedDIFChart data={percentileGenderDIF} />
        ) : (
          <Alert severity="info" sx={{ mb: 3 }}>
            Insufficient data for percentile-gender DIF chart. Requires at least 50 students with gender data.
          </Alert>
        )}

        {/* Line Chart - All Items */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Gender DIF Across All Items (Basic View)
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Shows item difficulty (%) for males vs females across all items
          </Typography>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={lineChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="item"
                tick={{ fontSize: 10 }}
                interval={Math.floor(lineChartData.length / 20)}
              />
              <YAxis
                domain={[0, 100]}
                label={{ value: 'Difficulty (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                formatter={(value, name) => [`${value}%`, name === 'male' ? 'Male' : 'Female']}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="male"
                stroke="#1976d2"
                name="Male Difficulty"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="female"
                stroke="#d81b60"
                name="Female Difficulty"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Paper>

        {/* Table */}
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Male Difficulty</TableCell>
                <TableCell align="right">Female Difficulty</TableCell>
                <TableCell align="right">DIF Score</TableCell>
                <TableCell>Classification</TableCell>
                <TableCell align="right">Male N</TableCell>
                <TableCell align="right">Female N</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {genderDIF.itemDIF.map((item) => (
                <TableRow key={item.itemId}>
                  <TableCell>{item.itemCode}</TableCell>
                  <TableCell>{item.itemType}</TableCell>
                  <TableCell align="right">{item.maleDifficulty.toFixed(3)}</TableCell>
                  <TableCell align="right">{item.femaleDifficulty.toFixed(3)}</TableCell>
                  <TableCell align="right">{item.difScore.toFixed(3)}</TableCell>
                  <TableCell>
                    <Chip
                      label={item.classification}
                      color={getDIFColor(item.classification)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">{item.maleSampleSize}</TableCell>
                  <TableCell align="right">{item.femaleSampleSize}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  // Percentile DIF Section
  const renderPercentileDIF = () => {
    if (loading.percentile) {
      return (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      );
    }

    if (!percentileDIF || percentileDIF.length === 0) {
      return (
        <Alert severity="info">
          No Percentile DIF data available. Requires at least 50 students.
        </Alert>
      );
    }

    const percentileGroups = ['P1', 'P2', 'P3', 'P4', 'P5'];

    // Prepare line chart data
    const percentileLineData = percentileDIF.map(item => {
      const dataPoint = { item: item.itemCode };
      percentileGroups.forEach(group => {
        const data = item.percentiles?.[group];
        if (data) {
          dataPoint[group] = (data.percentileDifficulty * 100).toFixed(1);
        }
      });
      return dataPoint;
    });

    return (
      <Box>
        <Typography variant="body2" color="textSecondary" paragraph>
          Shows item performance across ability levels compared to OECS average. P1 = Bottom 20%, P5 = Top 20%.
        </Typography>

        {/* Line Chart - All Percentiles */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Percentile Performance Across All Items
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Shows how each ability level performs on each item
          </Typography>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={percentileLineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="item"
                tick={{ fontSize: 10 }}
                interval={Math.floor(percentileLineData.length / 20)}
              />
              <YAxis
                domain={[0, 100]}
                label={{ value: 'Difficulty (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="P1"
                stroke="#d32f2f"
                name="P1 (0-20%)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="P2"
                stroke="#f57c00"
                name="P2 (21-40%)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="P3"
                stroke="#fbc02d"
                name="P3 (41-60%)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="P4"
                stroke="#388e3c"
                name="P4 (61-80%)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="P5"
                stroke="#1976d2"
                name="P5 (81-100%)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Paper>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                {percentileGroups.map(group => (
                  <TableCell key={group} align="center">{group}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {percentileDIF.map((item) => (
                <TableRow key={item.itemId}>
                  <TableCell>{item.itemCode}</TableCell>
                  {percentileGroups.map(group => {
                    const data = item.percentiles?.[group];
                    if (!data) return <TableCell key={group} align="center">-</TableCell>;

                    return (
                      <TableCell
                        key={group}
                        align="center"
                        sx={{ bgcolor: getDIFBackgroundColor(data.classification) }}
                      >
                        <Box>
                          <Typography variant="body2">
                            {data.difScore.toFixed(3)}
                          </Typography>
                          <Chip
                            label={data.classification.substring(0, 1)}
                            color={getDIFColor(data.classification)}
                            size="small"
                            sx={{ height: 16, fontSize: '0.65rem' }}
                          />
                        </Box>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box mt={2}>
          <Typography variant="caption" color="textSecondary">
            Cell colors: Green = Negligible, Orange = Slight to Moderate, Red = Moderate to Large DIF
          </Typography>
        </Box>
      </Box>
    );
  };

  // Country DIF Section
  const renderCountryDIF = () => {
    if (loading.country) {
      return (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
          <Typography ml={2}>Calculating country DIF (may take 2-3 seconds)...</Typography>
        </Box>
      );
    }

    if (!countryDIF || countryDIF.length === 0) {
      return (
        <Alert severity="info">
          No Country DIF data available. Requires multi-country assessment with at least 10 students per country.
        </Alert>
      );
    }

    // Get all countries
    const countries = [...new Set(countryDIF.flatMap(item =>
      Object.keys(item.countries || {})
    ))].sort();

    // Prepare line chart data
    const countryLineData = countryDIF.map(item => {
      const dataPoint = { item: item.itemCode };
      countries.forEach(country => {
        const data = item.countries?.[country];
        if (data) {
          dataPoint[country] = (data.countryDifficulty * 100).toFixed(1);
        }
      });
      return dataPoint;
    });

    // Color palette for countries
    const countryColors = [
      '#1976d2', '#d32f2f', '#388e3c', '#f57c00', '#7b1fa2',
      '#0097a7', '#c2185b', '#5d4037', '#455a64', '#00796b'
    ];

    return (
      <Box>
        <Typography variant="body2" color="textSecondary" paragraph>
          Compares each country's performance to OECS regional average. Positive DIF = easier for country, Negative = harder.
        </Typography>

        {/* Line Chart - All Countries */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Country Performance Across All Items
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Shows item difficulty (%) for each country
          </Typography>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={countryLineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="item"
                tick={{ fontSize: 10 }}
                interval={Math.floor(countryLineData.length / 20)}
              />
              <YAxis
                domain={[0, 100]}
                label={{ value: 'Difficulty (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend />
              {countries.map((country, index) => (
                <Line
                  key={country}
                  type="monotone"
                  dataKey={country}
                  stroke={countryColors[index % countryColors.length]}
                  name={country}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Paper>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                {countries.map(country => (
                  <TableCell key={country} align="center">{country}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {countryDIF.map((item) => (
                <TableRow key={item.itemId}>
                  <TableCell>{item.itemCode}</TableCell>
                  {countries.map(country => {
                    const data = item.countries?.[country];
                    if (!data) return <TableCell key={country} align="center">-</TableCell>;

                    return (
                      <TableCell
                        key={country}
                        align="center"
                        sx={{ bgcolor: getDIFBackgroundColor(data.classification) }}
                      >
                        <Box>
                          <Typography variant="body2">
                            {data.difScore.toFixed(3)}
                          </Typography>
                          <Chip
                            label={data.classification.substring(0, 1)}
                            color={getDIFColor(data.classification)}
                            size="small"
                            sx={{ height: 16, fontSize: '0.65rem' }}
                          />
                        </Box>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  // Country-Gender DIF Section
  const renderCountryGenderDIF = () => {
    if (loading.countryGender) {
      return (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
          <Typography ml={2}>Calculating country-gender DIF (may take 3-4 seconds)...</Typography>
        </Box>
      );
    }

    if (!countryGenderDIF || countryGenderDIF.length === 0) {
      return (
        <Alert severity="info">
          No Country-Gender DIF data available. Requires at least 5 male and 5 female students per country.
        </Alert>
      );
    }

    // Group by country
    const byCountry = {};
    countryGenderDIF.forEach(item => {
      if (!byCountry[item.country]) {
        byCountry[item.country] = [];
      }
      byCountry[item.country].push(item);
    });

    return (
      <Box>
        <Typography variant="body2" color="textSecondary" paragraph>
          Within each country, compares male vs female performance. Shows if gender differences vary by country.
        </Typography>

        {Object.entries(byCountry).map(([country, items]) => {
          // Prepare line chart data for this country
          const countryGenderLineData = items.map(item => ({
            item: item.itemCode,
            male: (item.maleDifficulty * 100).toFixed(1),
            female: (item.femaleDifficulty * 100).toFixed(1)
          }));

          return (
            <Accordion key={country} defaultExpanded={Object.keys(byCountry).length === 1}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">{country}</Typography>
                <Chip
                  label={`${items.length} items`}
                  size="small"
                  sx={{ ml: 2 }}
                />
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  {/* Line Chart for this country */}
                  <Paper sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      {country}: Male vs Female Performance
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={countryGenderLineData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="item"
                          tick={{ fontSize: 10 }}
                          interval={Math.floor(countryGenderLineData.length / 15)}
                        />
                        <YAxis
                          domain={[0, 100]}
                          label={{ value: 'Difficulty (%)', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip formatter={(value, name) => [`${value}%`, name === 'male' ? 'Male' : 'Female']} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="male"
                          stroke="#1976d2"
                          name="Male Difficulty"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="female"
                          stroke="#d81b60"
                          name="Female Difficulty"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Paper>

                  <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell align="right">Male Difficulty</TableCell>
                      <TableCell align="right">Female Difficulty</TableCell>
                      <TableCell align="right">DIF Score</TableCell>
                      <TableCell>Classification</TableCell>
                      <TableCell align="right">Male N</TableCell>
                      <TableCell align="right">Female N</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.itemId}>
                        <TableCell>{item.itemCode}</TableCell>
                        <TableCell align="right">{item.maleDifficulty.toFixed(3)}</TableCell>
                        <TableCell align="right">{item.femaleDifficulty.toFixed(3)}</TableCell>
                        <TableCell align="right">{item.difScore.toFixed(3)}</TableCell>
                        <TableCell>
                          <Chip
                            label={item.classification}
                            color={getDIFColor(item.classification)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">{item.maleSampleSize}</TableCell>
                        <TableCell align="right">{item.femaleSampleSize}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
                </Box>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>
    );
  };

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Differential Item Functioning (DIF) Analysis
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        DIF analysis identifies items that may favor or disadvantage specific demographic groups,
        helping to ensure fairness in assessment.
      </Typography>

      {/* Gender DIF */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">1. Gender DIF Analysis</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {renderGenderDIF()}
        </AccordionDetails>
      </Accordion>

      {/* Percentile DIF */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">2. Percentile DIF Analysis</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {renderPercentileDIF()}
        </AccordionDetails>
      </Accordion>

      {/* Country DIF */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">3. Country DIF Analysis</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {renderCountryDIF()}
        </AccordionDetails>
      </Accordion>

      {/* Country-Gender DIF */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">4. Country-Gender DIF Analysis</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {renderCountryGenderDIF()}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default DIFTab;
