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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { getGenderDIF, getPercentileDIF, getCountryDIF, getCountryGenderDIF } from '../services/api';

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
  const [loading, setLoading] = useState({
    gender: true,
    percentile: true,
    country: true,
    countryGender: true
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
        const [countryRes, countryGenderRes] = await Promise.all([
          getCountryDIF(assessmentId).catch(err => {
            console.error('Country DIF error:', err);
            return { data: [] };
          }),
          getCountryGenderDIF(assessmentId).catch(err => {
            console.error('Country-Gender DIF error:', err);
            return { data: [] };
          })
        ]);

        setCountryDIF(countryRes.data);
        setCountryGenderDIF(countryGenderRes.data);
        setLoading(prev => ({ ...prev, country: false, countryGender: false }));
      } catch (err) {
        console.error('DIF fetch error:', err);
        setError('Failed to load DIF analysis');
        setLoading({ gender: false, percentile: false, country: false, countryGender: false });
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

    // Prepare chart data
    const chartData = genderDIF.itemDIF.slice(0, 20).map(item => ({
      item: item.itemCode,
      male: item.maleDifficulty,
      female: item.femaleDifficulty,
      classification: item.classification
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

        {/* Bar Chart */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Male vs Female Difficulty (First 20 Items)
          </Typography>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="item" />
              <YAxis domain={[0, 1]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="male" fill="#1976d2" name="Male Difficulty" />
              <Bar dataKey="female" fill="#d81b60" name="Female Difficulty" />
            </BarChart>
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

    return (
      <Box>
        <Typography variant="body2" color="textSecondary" paragraph>
          Shows item performance across ability levels compared to OECS average. P1 = Bottom 20%, P5 = Top 20%.
        </Typography>

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

    return (
      <Box>
        <Typography variant="body2" color="textSecondary" paragraph>
          Compares each country's performance to OECS regional average. Positive DIF = easier for country, Negative = harder.
        </Typography>

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

        {Object.entries(byCountry).map(([country, items]) => (
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
            </AccordionDetails>
          </Accordion>
        ))}
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
