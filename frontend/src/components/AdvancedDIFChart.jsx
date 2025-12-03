import { useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Label
} from 'recharts';
import { Box, Typography, Paper } from '@mui/material';

/**
 * Advanced Psychometric DIF Chart
 * Shows gender differences (Female - Male) within each percentile group
 * Features:
 * - Grey shaded area for overall "ALL" gender DIF
 * - 5 colored lines for percentile groups (P1-P5)
 * - Custom shape markers for each percentile
 * - Y-axis: Female - Male difference in percentage points
 * - X-axis: Item codes
 */

// Custom marker shapes for each percentile
const CircleMarker = (props) => {
  const { cx, cy, fill } = props;
  return <circle cx={cx} cy={cy} r={4} fill={fill} stroke={fill} strokeWidth={1.5} />;
};

const SquareMarker = (props) => {
  const { cx, cy, fill } = props;
  return <rect x={cx - 4} y={cy - 4} width={8} height={8} fill={fill} stroke={fill} strokeWidth={1.5} />;
};

const TriangleMarker = (props) => {
  const { cx, cy, fill } = props;
  const points = `${cx},${cy - 5} ${cx + 4.5},${cy + 3.5} ${cx - 4.5},${cy + 3.5}`;
  return <polygon points={points} fill={fill} stroke={fill} strokeWidth={1.5} />;
};

const DiamondMarker = (props) => {
  const { cx, cy, fill } = props;
  const points = `${cx},${cy - 5} ${cx + 4},${cy} ${cx},${cy + 5} ${cx - 4},${cy}`;
  return <polygon points={points} fill={fill} stroke={fill} strokeWidth={1.5} />;
};

const StarMarker = (props) => {
  const { cx, cy, fill } = props;
  const outerRadius = 5;
  const innerRadius = 2;
  const points = [];

  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    points.push(`${x},${y}`);
  }

  return <polygon points={points.join(' ')} fill={fill} stroke={fill} strokeWidth={1} />;
};

// Color palette: Reds to Greens (matching psychometric standards)
const PERCENTILE_COLORS = {
  P1: '#d32f2f', // Dark red (lowest performers)
  P2: '#f57c00', // Orange
  P3: '#fbc02d', // Yellow
  P4: '#7cb342', // Light green
  P5: '#388e3c'  // Dark green (highest performers)
};

const PERCENTILE_MARKERS = {
  P1: CircleMarker,
  P2: SquareMarker,
  P3: TriangleMarker,
  P4: DiamondMarker,
  P5: StarMarker
};

const PERCENTILE_LABELS = {
  P1: 'P1 (Bottom 20%)',
  P2: 'P2 (21-40%)',
  P3: 'P3 (41-60%)',
  P4: 'P4 (61-80%)',
  P5: 'P5 (Top 20%)'
};

// Custom Tooltip that shows all values including allUpper and allLower
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      border: '1px solid #ccc',
      borderRadius: 8,
      padding: '10px'
    }}>
      <p style={{ margin: 0, marginBottom: 8, fontWeight: 600 }}>
        Item: {label}
      </p>
      {payload.map((entry, index) => {
        let displayName = entry.dataKey;
        if (entry.dataKey === 'all') {
          displayName = 'Overall (ALL)';
        } else if (entry.dataKey === 'allUpper') {
          displayName = 'Upper Bound';
        } else if (entry.dataKey === 'allLower') {
          displayName = 'Lower Bound';
        } else if (PERCENTILE_LABELS[entry.dataKey]) {
          displayName = PERCENTILE_LABELS[entry.dataKey];
        }

        return (
          <p key={index} style={{ margin: 0, color: entry.color }}>
            <span style={{ fontWeight: 600 }}>{displayName}:</span> {entry.value !== null ? `${entry.value}%` : 'N/A'}
          </p>
        );
      })}
    </div>
  );
};

export default function AdvancedDIFChart({ data }) {
  // Transform data for Recharts
  const chartData = useMemo(() => {
    if (!data || !data.itemData || data.itemData.length === 0) {
      return [];
    }

    return data.itemData.map(item => {
      const dataPoint = {
        itemCode: item.itemCode,
        all: item.allDifferencePct !== null ? parseFloat(item.allDifferencePct.toFixed(2)) : null
      };

      // Add percentile differences
      ['P1', 'P2', 'P3', 'P4', 'P5'].forEach(percentile => {
        if (item.percentiles[percentile] && item.percentiles[percentile].differencePct !== null) {
          dataPoint[percentile] = parseFloat(item.percentiles[percentile].differencePct.toFixed(2));
        } else {
          dataPoint[percentile] = null;
        }
      });

      return dataPoint;
    });
  }, [data]);

  // Calculate upper and lower bounds for the grey shaded area
  const chartDataWithBounds = useMemo(() => {
    return chartData.map(item => {
      // Create a small band around the ALL line (±0.5 percentage points)
      const allValue = item.all;
      return {
        ...item,
        allUpper: allValue !== null ? allValue + 0.5 : null,
        allLower: allValue !== null ? allValue - 0.5 : null
      };
    });
  }, [chartData]);

  if (!data || !data.itemData || data.itemData.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          Insufficient data for percentile-gender DIF analysis
        </Typography>
      </Box>
    );
  }

  const avgAllDiff = data.allData?.avgDifferencePct || 0;

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Differential Item Functioning (DIF)
      </Typography>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Females vs. Males
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Average gender difference (Female - Male): <strong>{avgAllDiff.toFixed(2)}%</strong>
        {' '}(Positive = Females perform better, Negative = Males perform better)
      </Typography>

      <ResponsiveContainer width="100%" height={500}>
        <ComposedChart data={chartDataWithBounds} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />

          <XAxis
            dataKey="itemCode"
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fontSize: 12 }}
          >
            <Label value="Reading Items" offset={-10} position="insideBottom" />
          </XAxis>

          <YAxis
            domain={[-8, 8]}
            ticks={[-8, -6, -4, -2, 0, 2, 4, 6, 8]}
            tick={{ fontSize: 12 }}
          >
            <Label
              value="Female - Male Difference (%)"
              angle={-90}
              position="insideLeft"
              style={{ textAnchor: 'middle' }}
            />
          </YAxis>

          <Tooltip content={<CustomTooltip />} />

          <Legend
            verticalAlign="top"
            height={60}
            iconType="line"
            formatter={(value) => {
              if (value === 'all') return 'Overall (ALL)';
              return PERCENTILE_LABELS[value] || value;
            }}
            wrapperStyle={{ paddingBottom: 20 }}
          />

          {/* Zero reference line */}
          <ReferenceLine y={0} stroke="#666" strokeWidth={1.5} strokeDasharray="5 5" />

          {/* Grey shaded area for "ALL" envelope */}
          <Area
            type="monotone"
            dataKey="allUpper"
            stackId="1"
            stroke="none"
            fill="transparent"
          />
          <Area
            type="monotone"
            dataKey="allLower"
            stackId="1"
            stroke="none"
            fill="#bdbdbd"
            fillOpacity={0.3}
          />

          {/* Overall "ALL" line (bold grey) */}
          <Line
            type="monotone"
            dataKey="all"
            stroke="#757575"
            strokeWidth={3}
            dot={false}
            name="all"
          />

          {/* Percentile lines with custom markers */}
          {['P1', 'P2', 'P3', 'P4', 'P5'].map(percentile => {
            const MarkerComponent = PERCENTILE_MARKERS[percentile];
            const color = PERCENTILE_COLORS[percentile];

            return (
              <Line
                key={percentile}
                type="monotone"
                dataKey={percentile}
                stroke={color}
                strokeWidth={2}
                dot={(props) => <MarkerComponent {...props} fill={color} />}
                activeDot={{ r: 6, fill: color }}
                name={percentile}
                connectNulls
              />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>

      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Interpretation:</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary" component="div">
          <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
            <li>
              <strong>Grey shaded band:</strong> Overall gender difference across all students
            </li>
            <li>
              <strong>Colored lines:</strong> Gender differences within each ability level (percentile group)
            </li>
            <li>
              <strong>Positive values:</strong> Females outperform males on that item
            </li>
            <li>
              <strong>Negative values:</strong> Males outperform females on that item
            </li>
            <li>
              <strong>Lines far from grey band:</strong> Gender gap varies significantly across ability levels
            </li>
            <li>
              <strong>Color coding:</strong> Red (P1 - lowest performers) → Green (P5 - highest performers)
            </li>
          </ul>
        </Typography>
      </Box>
    </Paper>
  );
}
