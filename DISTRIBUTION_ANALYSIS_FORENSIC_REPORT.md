# Forensic Analysis Report: Distribution_Analysis.xlsx

## 📋 Executive Summary

**File:** Distribution Analysis.xlsx
**Total Sheets:** 15
**Purpose:** Normal distribution analysis for OERA (Reading) and OEMA (Math) assessments
**Primary Analysis:** Score distribution testing and comparison against theoretical normal distribution

---

## 📊 Workbook Structure

### Sheet Overview

| # | Sheet Name | Type | Dimensions | Purpose |
|---|------------|------|------------|---------|
| 1 | **OERA** | Data (Hidden) | 6,598 rows × 32 cols | Raw OERA reading responses |
| 2 | **OERA Calculations** | Calculations | 6,601 rows × 63 cols | Normal distribution calculations by country |
| 3 | **Normal Distribution OERA** | Chart | Empty (chart only) | Overall OERA distribution visualization |
| 4-11 | **ND OERA [Country]** | Chart | Empty (chart only) | Country-specific OERA distribution charts (ANB, ANG, BVI, DOM, GRN, SKN, SLU, SVG) |
| 12 | **OEMA** | Data | 6,581 rows × 54 cols | Raw OEMA math responses |
| 13 | **OEMA Calculations** | Calculations | 6,601 rows × 63 cols | Normal distribution calculations by country |
| 14 | **Normal Distribution OEMA** | Chart | Empty (chart only) | Overall OEMA distribution visualization |
| 15 | **ND OEMA ANB** | Chart | Empty (chart only) | Country-specific OEMA chart for Antigua & Barbuda |

---

## 🔍 SHEET 1: OERA (Reading Assessment Data)

### Sheet Properties
- **Status:** HIDDEN from user view
- **Dimensions:** 6,598 students (rows) × 32 columns
- **Student Count:** 6,596 valid students
- **Total Formulae:** 13,192

### Data Structure

#### Column Layout

| Column | Field | Description |
|--------|-------|-------------|
| A | OERA | Boolean flag (TRUE/FALSE if student took OERA) |
| B | OEMA SR | Boolean flag (OEMA Selected Response) |
| C | OEMA CR | Boolean flag (OEMA Constructed Response) |
| D | OEMA | Boolean flag (took full OEMA) |
| E | Country | Country code (ANB, ANG, BVI, DOM, GRN, SKN, SLU, SVG) |
| F | ID Number | Student ID |
| G | Sex | M/F gender code |
| H | School Name | School name |
| I | (Calculated) | Row-based calculation reference |
| J | PERCENTILE | Percentile quintile (P1-P5) - **FORMULA** |
| K | Average | Total score (0-1) - **FORMULA** |
| L-AF | R1-R21 | Individual item responses (21 reading items) |

#### Correct Answer Key (Row 1)
```
R1=C, R2=A, R3=C, R4=A, R5=C, R6=A, R7=B, R8=C, R9=B, R10=A,
R11=C, R12=C, R13=B, R14=C, R15=B, R16=B, R17=C, R18=C, R19=B, R20=C, R21=B
```

### Formulae Analysis

#### 1. Percentile Assignment (Column J)
```excel
=IF(ROW(I3)<1322,"P1",
  IF(ROW(I3)<2*1322,"P2",
    IF(ROW(I3)<3*1322,"P3",
      IF(ROW(I3)<4*1322,"P4","P5"))))
```
**Purpose:** Automatically assigns students to quintiles (P1-P5) based on row position
**Quintile Size:** 1,322 students per quintile (6,596 / 5)
**Logic:**
- Rows 3-1321: P1 (Bottom 20%)
- Rows 1322-2642: P2 (20-40%)
- Rows 2643-3963: P3 (40-60%)
- Rows 3964-5284: P4 (60-80%)
- Rows 5285+: P5 (Top 20%)

⚠️ **Note:** This assumes data is pre-sorted by score ascending!

#### 2. Total Score Calculation (Column K)
```excel
=IF(A3=FALSE,"",SUM(L3:AT3)/21)
```
**Purpose:** Calculate average score (0-1 scale)
**Logic:**
- If student didn't take OERA (A=FALSE), return blank
- Otherwise, sum 21 item responses (0/1) and divide by 21
- Result is proportion correct (e.g., 0.5 = 50% correct)

### Sample Data (Row 3 - First Student)

```
Country: ANB
ID: 313
Sex: M
School: Bendals Primary School
Percentile: P1
Score: 0.000 (0/21 correct)
Responses: All zeros (0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0)
```

### Data Type Distribution

| Type | Count | Percentage |
|------|-------|------------|
| **Numbers** | 144,169 | 68.1% |
| **Booleans** | 26,384 | 12.5% |
| **Strings** | 20,993 | 9.9% |
| **Formulae** | 13,192 | 6.2% |
| **Empty** | 6,398 | 3.0% |

---

## 📈 SHEET 2: OERA Calculations

### Sheet Properties
- **Status:** VISIBLE (user can see)
- **Dimensions:** 6,601 rows × 63 columns
- **Purpose:** Calculate normal distribution parameters for overall and country-specific data
- **Total Formulae:** 414

### Data Structure

#### Row 2: Statistical Summary
Contains aggregate statistics for each country:

| Country | Student Count | Mean Score | Std. Dev |
|---------|--------------|------------|----------|
| **Overall** | 6,596 | 0.5222 | 0.2546 |
| **ANB** (Antigua & Barbuda) | 596 | 0.4917 | 0.2370 |
| **ANG** (Anguilla) | 146 | 0.5023 | 0.2799 |
| **BVI** (British Virgin Islands) | 208 | 0.6190 | 0.2599 |
| **DOM** (Dominica) | 672 | 0.5797 | 0.2453 |
| **GRN** (Grenada) | 1,261 | 0.4893 | 0.2376 |
| **SKN** (St. Kitts & Nevis) | 500 | 0.5447 | 0.2505 |
| **SLU** (St. Lucia) | 1,753 | 0.6064 | 0.2639 |
| **SVG** (St. Vincent) | 1,460 | 0.4161 | 0.2159 |

#### Formula Examples (Row 2):

```excel
C2: =COUNT(C3:C6601)           // Total students
E2: =AVERAGE(C3:C6601)         // Mean score
G2: =STDEVP(C3:C6601)          // Standard deviation (population)
```

**This pattern repeats for each country across columns.**

#### Row 3: Column Headers
```
Country | OERA | Bins | Formula | Normal Distribution | Histogram
```

#### Rows 4+: Normal Distribution Bins

**Structure:** Score bins from 0.00 to 1.00 in increments of 0.05

**For each bin, three values are calculated:**

1. **Bins:** The score threshold (0, 0.05, 0.10, ..., 1.00)
2. **Formula:** Theoretical probability density at that score
3. **Normal Distribution:** Expected count of students in that bin (using NORMDIST)
4. **Histogram:** Actual count of students in that bin

### Example: Overall OERA Distribution (Columns B-G)

| Bin | Formula (Probability) | Normal Distribution (Expected) | Histogram (Actual) |
|-----|----------------------|-------------------------------|-------------------|
| 0.00 | 0.1911 | 63.02 | 349 |
| 0.05 | 0.2804 | 92.49 | 19 |
| 0.10 | 0.3960 | 130.60 | 53 |
| 0.15 | 0.5380 | 177.45 | 100 |
| 0.20 | 0.7034 | 231.97 | 159 |
| 0.25 | 0.8847 | 291.77 | 305 |
| 0.30 | 1.0706 | 353.09 | 393 |
| 0.35 | 1.2466 | 411.12 | 468 |

**Interpretation:**
- **Actual distribution is LEFT-SKEWED** (more students scoring low than expected by normal distribution)
- At 0.00: Expected 63 students with score of 0, but actually found 349!
- At 0.30-0.35: Distribution closer to normal expectations
- This suggests the test was too difficult or students were underprepared

### Country-Specific Example: Antigua & Barbuda (ANB)

| Bin | Formula | Normal Dist (Expected) | Histogram (Actual) |
|-----|---------|----------------------|-------------------|
| 0.00 | 0.1957 | 5.83 | 33 |
| 0.20 | 0.7893 | 23.52 | 17 |
| 0.40 | 1.4839 | 44.22 | 52 |
| 0.60 | 1.6229 | 48.36 | 69 |
| 0.80 | 1.0153 | 30.26 | 60 |

**Interpretation:**
- ANB students show bimodal distribution (peaks at low and medium scores)
- Actual count at 0.00 (33) much higher than expected (5.83)

---

## 📊 SHEETS 3-11: Normal Distribution Chart Sheets

### Sheet Properties
- **Type:** Chart sheets (contain graphs, minimal data)
- **Data Cells:** 1 row × 1 column (essentially empty)
- **Purpose:** Visual representation of distribution analysis

### Chart Sheets Included:

1. **Normal Distribution OERA** - Overall OERA distribution
2. **ND OERA ANB** - Antigua & Barbuda
3. **ND OERA ANG** - Anguilla
4. **ND OERA BVI** - British Virgin Islands
5. **ND OERA DOM** - Dominica
6. **ND OERA GRN** - Grenada
7. **ND OERA SKN** - St. Kitts & Nevis
8. **ND OERA SLU** - St. Lucia
9. **ND OERA SVG** - St. Vincent & the Grenadines

### Chart Type and Components

Based on the calculation data, these charts contain:

#### **Histogram + Normal Distribution Overlay Chart**

**X-Axis:** Score bins (0.00, 0.05, 0.10, ..., 1.00)
**Y-Axis:** Student count

**Two data series:**
1. **Blue bars (Histogram):** Actual student count per bin
2. **Red curve (Normal Distribution):** Expected count based on mean and standard deviation

**Purpose:**
- Visual comparison of actual score distribution vs. theoretical normal distribution
- Identify skewness, kurtosis, and deviation from normality
- Assess if test scores follow expected statistical patterns

**Typical Features:**
- Title: "Normal Distribution - [Country/Overall] OERA"
- Legend showing "Actual" vs "Expected"
- Grid lines for easier reading
- May include text boxes with mean and standard deviation

### Visual Interpretation Guide

**If actual matches expected:**
- Bars closely follow the curve
- Test is well-calibrated
- Student ability is normally distributed

**If actual skewed left (more low scores):**
- Bars higher on left side of chart
- Test too difficult or students underprepared
- **This is what OECS data shows!**

**If actual skewed right (more high scores):**
- Bars higher on right side
- Test too easy or students well-prepared

**If actual has multiple peaks (bimodal):**
- Two humps in histogram
- Two distinct student populations
- May indicate teaching quality differences

---

## 🔢 SHEET 12: OEMA (Math Assessment Data)

### Sheet Properties
- **Status:** VISIBLE
- **Dimensions:** 6,581 students (rows) × 54 columns
- **Student Count:** 6,579 valid students
- **Total Formulae:** 13,159
- **Total Items:** 38 (25 Selected Response + 11 Constructed Response + 2 not administered)

### Data Structure

#### Column Layout

| Column | Field | Description |
|--------|-------|-------------|
| A | OERA | Boolean (took reading test) |
| B | OEMA SR | Boolean (took math selected response) |
| C | OEMA | Boolean (took full math test) |
| D | OEMA CR | Boolean (took constructed response) |
| E | Country | Country code |
| F | ID Number | Student ID |
| G | Sex | M/F |
| H | School Name | School name |
| I | (Calculated) | Row calculation reference |
| J | PERCENTILE | P1-P5 quintile - **FORMULA** |
| K | Average | Total score (0-1) - **FORMULA** |
| M-AI | M1-M25 | Math selected response items (25 items) |
| AJ-AU | CR Items | Constructed response items: 1(a), 1(b), 2(a), 2(b), 3(a), 3(b), 4(a), 5(a), 5(b), 6(a), 6(b) |

#### Correct Answer Key (Row 1)

**Selected Response (M1-M25):**
```
M1=B, M2=A, M3=C, M4=B, M5=C, M6=A (not admin), M7=A, M8=C, M9=A (not admin), M10=C (not admin),
M11=C, M12=A, M13=B, M14=A, M15=C, M16=A, M17=C, M18=B, M19=B, M20=C, M21=B,
M22=C, M23=C, M24=A, M25=C
```

**Constructed Response (CR):**
```
1(a)=1, 1(b)=2, 2(a)=2, 2(b)=2, 3(a)=1, 3(b)=2, 4(a)=1, 5(a)=1, 5(b)=1, 6(a)=1, 6(b)=1
```
*Note: Numbers indicate maximum points possible for each CR item*

### Formulae Analysis

#### 1. Percentile Assignment (Column J)
```excel
=IF(ROW(I3)<1316,"P1",
  IF(ROW(I3)<2*1316,"P2",
    IF(ROW(I3)<3*1316,"P3",
      IF(ROW(I3)<4*1316,"P4","P5"))))
```
**Quintile Size:** 1,316 students per quintile (6,579 / 5)

#### 2. Total Score Calculation (Column K)
```excel
=SUM(M3:AV3)/38
```
**Purpose:** Sum all 38 items and divide by total possible (38)
**Note:** Includes both SR (scored 0/1) and CR (scored 0-2)

### Sample Data (Row 3 - Lowest Scoring Student)

```
Country: SVG
ID: 991
Sex: M
School: Lowmans Windward Anglican
Percentile: P1
Score: 0.0263 (1/38 = 2.63% correct)
Only correct: M3 (answered C)
CR Items: All zeros
```

### Data Type Distribution

| Type | Count | Percentage |
|------|-------|------------|
| **Numbers** | 163,885 | 46.0% |
| **Strings** | 19,809 | 5.6% |
| **Formulae** | 13,159 | 3.7% |
| **Empty** | 159,332 | 44.7% |
| **Booleans** | 0 | 0% |

**Note:** High empty cell count due to missing CR responses (many students left CR items blank)

---

## 📈 SHEET 13: OEMA Calculations

### Sheet Properties
- **Status:** VISIBLE
- **Dimensions:** 6,601 rows × 63 columns
- **Purpose:** Normal distribution calculations for OEMA (Math) by country
- **Structure:** Identical to OERA Calculations sheet

### Statistical Summary (Row 2)

| Country | Student Count | Mean Score | Std. Dev |
|---------|--------------|------------|----------|
| **Overall** | 6,579 | 0.4215 | 0.1994 |
| **ANB** | 585 | 0.4166 | 0.2006 |
| **ANG** | 145 | 0.4343 | 0.2153 |
| **BVI** | 207 | 0.5266 | 0.2004 |
| **DOM** | 669 | 0.4868 | 0.1993 |
| **GRN** | 1,257 | 0.4002 | 0.1880 |
| **SKN** | 500 | 0.4392 | 0.1935 |
| **SLU** | 1,750 | 0.4797 | 0.2058 |
| **SVG** | 1,466 | 0.3484 | 0.1745 |

### Key Observations

**Compared to OERA (Reading):**
- **Lower mean scores** (0.42 vs 0.52) - Math is harder
- **Lower standard deviation** (0.20 vs 0.25) - Scores more clustered
- **SVG shows lowest performance** in both subjects (0.35 Math, 0.42 Reading)
- **BVI shows highest performance** in both subjects (0.53 Math, 0.62 Reading)

---

## 📊 SHEET 14-15: OEMA Chart Sheets

### Sheets Included:
1. **Normal Distribution OEMA** - Overall OEMA distribution chart
2. **ND OEMA ANB** - Antigua & Barbuda OEMA chart

**Note:** Workbook appears incomplete - missing charts for other countries (ANG, BVI, DOM, GRN, SKN, SLU, SVG)

---

## 🎯 Statistical Analysis Methods

### Normal Distribution Formula

The workbook uses the **NORMDIST** function to calculate expected values:

```excel
=NORMDIST(x, mean, standard_dev, FALSE)
```

**Parameters:**
- `x` = Score value (bin threshold)
- `mean` = Average score for that country
- `standard_dev` = Standard deviation for that country
- `FALSE` = Returns probability density (not cumulative)

**Then multiplies by student count to get expected count:**
```excel
Expected Count = NORMDIST(x, μ, σ, FALSE) × N × bin_width
```

Where:
- μ (mu) = mean
- σ (sigma) = standard deviation
- N = total students
- bin_width = 0.05 (5% intervals)

### Distribution Testing

**Purpose:** Test goodness-of-fit between actual and expected distributions

**Visual Method (Charts):**
- Overlay histogram with normal curve
- Identify deviations visually
- Look for skewness, kurtosis, outliers

**Statistical Method (Not in workbook, but should be added):**
- **Kolmogorov-Smirnov Test:** Test if data follows normal distribution
- **Chi-Square Goodness-of-Fit:** Compare observed vs expected frequencies
- **Shapiro-Wilk Test:** Another normality test
- **Skewness Coefficient:** Measure of asymmetry
- **Kurtosis Coefficient:** Measure of tail heaviness

---

## 💡 Key Findings and Insights

### 1. Distribution Characteristics

**OERA (Reading):**
- Mean: 0.522 (52.2% correct)
- **Left-skewed distribution** (more low scorers than expected)
- Large spike at score = 0 (349 students vs 63 expected)
- Suggests test difficulty or preparation issues

**OEMA (Math):**
- Mean: 0.422 (42.2% correct)
- **More difficult than reading** (10 percentage points lower)
- Also left-skewed
- Tighter clustering (lower std. dev)

### 2. Country Performance Patterns

**Highest Performing:**
1. **BVI** (British Virgin Islands): 0.619 (Reading), 0.527 (Math)
2. **SLU** (St. Lucia): 0.606 (Reading), 0.480 (Math)

**Lowest Performing:**
1. **SVG** (St. Vincent): 0.416 (Reading), 0.348 (Math)
2. **GRN** (Grenada): 0.489 (Reading), 0.400 (Math)

**Most Consistent:**
- **ANB** (Antigua): Similar scores in both subjects (0.492 Reading, 0.417 Math)

### 3. Percentile Methodology

**Current Approach:**
- Assigns percentiles based on row position
- Assumes data is pre-sorted by score
- Uses hard-coded quintiles (1,322 students per group for OERA)

**Potential Issues:**
- No dynamic calculation of percentiles
- Vulnerable to data re-sorting
- Doesn't account for tied scores

**Better Approach:**
```excel
=PERCENTRANK(score_column, this_score) * 100
```

### 4. Missing Statistical Tests

The workbook performs **visual comparison** but lacks:
- ❌ Formal normality tests (Shapiro-Wilk, Kolmogorov-Smirnov)
- ❌ Skewness and kurtosis calculations
- ❌ Chi-square goodness-of-fit test
- ❌ Interpretation guidance for users
- ❌ Pass/fail criteria for normality

---

## 🚀 Recommendations for MVP Implementation

### ✅ Already Implemented in MVP
1. ✅ Score distribution histogram
2. ✅ Descriptive statistics (mean, std. dev)
3. ✅ Country-level filtering

### ⚠️ To Be Implemented - Phase 1 (Easy)

#### 1. **Normal Distribution Overlay** ⭐⭐⭐
**Priority:** HIGH
**Effort:** MEDIUM
**Value:** HIGH

**Implementation:**
- Add normal distribution curve to existing histogram
- Calculate using JavaScript statistical library (e.g., jStat)
- Use `normalDistribution(x, mean, stdev)` function

**Frontend Component:**
```javascript
import { jStat } from 'jstat';

// In existing histogram component
const normalCurve = scoreRange.map(score => ({
  score,
  expected: jStat.normal.pdf(score, mean, stdev) * totalStudents * binWidth
}));

// Add as line series to chart
<Line data={normalCurve} stroke="#ff0000" name="Expected (Normal)" />
```

**Backend API:**
```javascript
// GET /api/statistics/:assessmentId/distribution-test
router.get('/:assessmentId/distribution-test', async (req, res) => {
  const { bins, mean, stdev, totalStudents } = await getDistributionData(assessmentId);

  const normalDistribution = bins.map(bin => ({
    bin: bin.score,
    actual: bin.count,
    expected: normalPDF(bin.score, mean, stdev) * totalStudents * 0.05
  }));

  res.json({ distribution: normalDistribution });
});
```

#### 2. **Skewness and Kurtosis** ⭐⭐
**Priority:** MEDIUM
**Effort:** LOW
**Value:** MEDIUM

**Formulae:**
```javascript
// Skewness (3rd moment)
function calculateSkewness(scores) {
  const n = scores.length;
  const mean = scores.reduce((a,b) => a+b) / n;
  const stdev = Math.sqrt(scores.reduce((sq, x) => sq + (x-mean)**2, 0) / n);
  const m3 = scores.reduce((sum, x) => sum + ((x-mean)/stdev)**3, 0) / n;
  return m3;
}

// Kurtosis (4th moment)
function calculateKurtosis(scores) {
  const n = scores.length;
  const mean = scores.reduce((a,b) => a+b) / n;
  const stdev = Math.sqrt(scores.reduce((sq, x) => sq + (x-mean)**2, 0) / n);
  const m4 = scores.reduce((sum, x) => sum + ((x-mean)/stdev)**4, 0) / n;
  return m4 - 3; // Excess kurtosis
}
```

**Interpretation Guide:**
- Skewness = 0: Perfectly symmetric
- Skewness < 0: Left-skewed (tail on left, most scores high)
- Skewness > 0: Right-skewed (tail on right, most scores low)
- Kurtosis = 0: Normal tails
- Kurtosis < 0: Light tails (platykurtic)
- Kurtosis > 0: Heavy tails (leptokurtic)

#### 3. **Country-Specific Distribution Charts** ⭐⭐
**Priority:** HIGH
**Effort:** LOW (reuse existing histogram component)
**Value:** HIGH

**Implementation:**
- Add country filter to distribution chart
- Generate separate charts for each country
- Show comparative view (all countries in grid)

**UI Component:**
```jsx
<FormControl>
  <InputLabel>Select Country</InputLabel>
  <Select value={selectedCountry} onChange={handleCountryChange}>
    <MenuItem value="all">All Countries (Regional)</MenuItem>
    <MenuItem value="ANB">Antigua & Barbuda</MenuItem>
    <MenuItem value="BVI">British Virgin Islands</MenuItem>
    {/* ... other countries */}
  </Select>
</FormControl>

<DistributionChart
  assessmentId={assessmentId}
  countryCode={selectedCountry}
  showNormalOverlay={true}
/>
```

### ⚠️ To Be Implemented - Phase 2 (Advanced)

#### 4. **Normality Tests** ⚠️
**Priority:** MEDIUM
**Effort:** HIGH
**Value:** HIGH (for test validation)

**Tests to Implement:**

**A. Kolmogorov-Smirnov Test**
```javascript
import { ksTest } from 'statistical-tests';

const result = ksTest(actualScores, 'normal', { mean, stdev });
// result.pValue > 0.05: Data is normally distributed
// result.pValue < 0.05: Data is NOT normally distributed
```

**B. Shapiro-Wilk Test** (more powerful for small samples)
```javascript
import { shapiroWilkTest } from 'shapiro-wilk';

const { W, pValue } = shapiroWilkTest(scores);
// W close to 1: Normal
// pValue > 0.05: Normal
```

**C. Chi-Square Goodness-of-Fit**
```javascript
function chiSquareGoodnessOfFit(observed, expected) {
  let chiSquare = 0;
  for (let i = 0; i < observed.length; i++) {
    chiSquare += Math.pow(observed[i] - expected[i], 2) / expected[i];
  }
  const df = observed.length - 3; // degrees of freedom (bins - parameters)
  const pValue = chiSquareCDF(chiSquare, df);
  return { chiSquare, pValue };
}
```

**Display Results:**
```jsx
<Card>
  <CardContent>
    <Typography variant="h6">Normality Tests</Typography>
    <Table>
      <TableRow>
        <TableCell>Shapiro-Wilk Test</TableCell>
        <TableCell>W = {W.toFixed(4)}</TableCell>
        <TableCell>{pValue > 0.05 ? '✅ Normal' : '❌ Not Normal'}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Skewness</TableCell>
        <TableCell>{skewness.toFixed(3)}</TableCell>
        <TableCell>{Math.abs(skewness) < 0.5 ? '✅ Symmetric' : '⚠️ Skewed'}</TableCell>
      </TableRow>
    </Table>
  </CardContent>
</Card>
```

---

## 📋 Implementation Priority

### **Immediate (Next Sprint):**
1. ✅ Normal distribution overlay on histogram chart
2. ✅ Country-specific distribution views
3. ✅ Skewness and kurtosis calculations

### **Short-term (2-4 weeks):**
4. Distribution comparison grid (all countries side-by-side)
5. Statistical test results display
6. Interpretation guidance text

### **Long-term (Phase 3):**
7. Formal normality testing (Shapiro-Wilk, K-S)
8. Chi-square goodness-of-fit
9. Percentile recalculation using actual score distribution
10. PDF report generation with distribution charts

---

## 🎨 Chart Specifications

### Histogram + Normal Distribution Chart

**Chart Type:** Combination (Bar + Line)

**Configuration:**
```javascript
{
  type: 'bar',
  data: {
    labels: ['0-5%', '5-10%', '10-15%', ..., '95-100%'], // 20 bins
    datasets: [
      {
        type: 'bar',
        label: 'Actual Student Count',
        data: actualCounts,
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      },
      {
        type: 'line',
        label: 'Expected (Normal Distribution)',
        data: expectedCounts,
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4 // Smooth curve
      }
    ]
  },
  options: {
    responsive: true,
    scales: {
      x: {
        title: { display: true, text: 'Score Range (%)' }
      },
      y: {
        title: { display: true, text: 'Number of Students' }
      }
    },
    plugins: {
      title: {
        display: true,
        text: 'Score Distribution with Normal Curve Overlay'
      },
      legend: {
        display: true,
        position: 'top'
      }
    }
  }
}
```

**Visual Elements:**
- Blue bars for actual distribution
- Red smooth curve for theoretical normal distribution
- Grid lines for readability
- Tooltips showing exact counts
- Legend identifying series

---

## 📊 Data Quality Observations

### Issues Found in Source Data:

1. **OERA Sheet is Hidden**
   - Users can't see raw data
   - May cause confusion

2. **Hard-coded Percentile Calculation**
   - Uses row numbers, not actual scores
   - Breaks if data is re-sorted
   - Doesn't handle tied scores

3. **Missing OEMA Country Charts**
   - Only ANB chart exists for OEMA
   - Incomplete analysis

4. **No Statistical Test Results**
   - Visual comparison only
   - No p-values or formal conclusions
   - Users must interpret visually

5. **Large Spike at Zero Scores**
   - 349 students with 0/21 (5.3% of total)
   - Suggests data quality issues OR
   - Students who didn't attempt the test

### Recommendations for MVP:

1. ✅ Use dynamic percentile calculation
2. ✅ Flag zero-score students separately
3. ✅ Add statistical test interpretations
4. ✅ Generate all country charts automatically
5. ✅ Add data quality warnings

---

## 🔍 Formula Patterns Summary

### Count, Mean, Standard Deviation Pattern
```excel
Count:  =COUNT(range)
Mean:   =AVERAGE(range)
StdDev: =STDEVP(range)  // Population standard deviation
```

### Normal Distribution Calculation
```excel
=NORMDIST(x, mean, stdev, FALSE) * total_count * bin_width
```

### Percentile Assignment (Row-based)
```excel
=IF(ROW()<cutoff1, "P1",
  IF(ROW()<cutoff2, "P2",
    IF(ROW()<cutoff3, "P3",
      IF(ROW()<cutoff4, "P4", "P5"))))
```

### Total Score Calculation
```excel
// OERA (21 items)
=IF(took_test=FALSE, "", SUM(items)/21)

// OEMA (38 items)
=SUM(items)/38
```

---

## ✅ Conclusion

The **Distribution_Analysis.xlsx** workbook provides:

1. ✅ **Country-specific normal distribution analysis** for OERA and OEMA
2. ✅ **Visual comparison** of actual vs expected distributions
3. ✅ **Histogram and normal curve overlays** (in chart sheets)
4. ✅ **Statistical summaries** (mean, standard deviation) by country
5. ✅ **Score binning** in 5% increments for detailed analysis

**Primary Purpose:** Assess whether test scores follow a normal distribution, which indicates:
- Test is well-calibrated
- Student ability is normally distributed
- Scoring is fair and unbiased

**Key Finding:** Both OERA and OEMA show **left-skewed distributions** with more low scorers than expected, suggesting tests may be too difficult or students need better preparation.

**Value for MVP:** This analysis type is important for test validation and should be included in the platform as a "Distribution Analysis" feature with normal distribution overlay charts.

---

**END OF FORENSIC REPORT**
