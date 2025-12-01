# OECS Item Analysis Platform - Template Instructions

## Overview

The OECS Item Analysis Platform accepts assessment data in CSV or Excel format. This guide explains how to format your data files for upload.

---

## Template Files Available

1. **OERA_Template.csv** - For reading assessments (unweighted, traditional multiple choice)
2. **OEMA_Template.csv** - For mathematics assessments (weighted, with constructed response items)

---

## Required Column Structure

### Demographic Columns (Always Required)

| Column | Description | Required | Example Values |
|--------|-------------|----------|----------------|
| **ID** | Student identifier | Yes | 1001, 1002, ABC123 |
| **Name** | Student name | Yes | John Doe, Jane Smith |
| **Sex** | Student gender | Yes | M or F |
| **School** | School name or code | Yes | Central Primary School, North Secondary |
| **District** | Educational district | Optional | District A, Northern District |
| **School Type** | Type of school | Optional | Public, Private, Denominational |
| **Country** | Country code (for regional) | Optional | LCA, GRN, SVG, SKN |

### Question Columns (Variable)

After demographic columns, add question columns:
- **Q1, Q2, Q3, ..., Q25** (for multiple choice items)
- **Q1a, Q1b, Q2a, Q2b** (for multi-part constructed response items)

---

## KEY Row (Row 2)

The **second row** must contain "KEY" in column 1, followed by answer keys or max points:

### For Multiple Choice Items (OERA)
```csv
ID,Name,Sex,School,District,School Type,Country,Q1,Q2,Q3,Q4,...
KEY,,,,,,,A,B,C,D,...
```

The KEY row contains **letter answers (A, B, C, D)**:
- Each MC item is automatically worth **1 point**
- Students either get it correct (1 point) or incorrect (0 points)

### For Weighted Items (OEMA with Constructed Response)
```csv
ID,Name,Sex,School,District,School Type,Country,Q1,Q2,Q3,...,Q18,Q1a,Q1b,Q2a,Q2b,...
KEY,,,,,,,B,A,C,...,B,1,2,2,2,...
```

The KEY row contains:
- **Letters (A, B, C, D)** for MC items = 1 point each
- **Numbers (1, 2, 3, 4, 5)** for CR items = max points possible

---

## Student Data Rows (Row 3+)

### For OERA (Multiple Choice Only)

Students answer with letters:
```csv
1001,Student A,M,Central Primary,District A,Public,LCA,A,B,C,D,A,B,C,...
```

### For OEMA (MC + Constructed Response)

- **MC columns**: Student's letter answer (A, B, C, D)
- **CR columns**: **Points earned** (0 to max points)

```csv
1001,Student A,M,Central Primary,District A,Public,LCA,B,A,C,...,B,1,2,2,1,...
                                                        ↑MC↑    ↑CR points↑
```

**Example:**
- Q1a (max 1 point): Student earned **1** → Full credit
- Q1b (max 2 points): Student earned **2** → Full credit  
- Q2a (max 2 points): Student earned **1** → Partial credit
- Q3a (max 1 point): Student earned **0** → No credit

---

## Complete Examples

### OERA Example (Reading Assessment - Unweighted)

```csv
ID,Name,Sex,School,District,School Type,Country,Q1,Q2,Q3,Q4,Q5
KEY,,,,,,,C,A,C,A,B
1001,John Doe,M,Central Primary,District A,Public,LCA,C,A,C,A,B
1002,Jane Smith,F,North Secondary,District A,Private,LCA,C,B,C,A,B
```

**Scoring:**
- John: 5/5 correct = 5/5 points = 100%
- Jane: 4/5 correct (Q2 wrong) = 4/5 points = 80%

### OEMA Example (Math Assessment - Weighted)

```csv
ID,Name,Sex,School,District,School Type,Country,Q1,Q2,Q3,Q1a,Q1b,Q2a
KEY,,,,,,,B,A,C,1,2,2
1001,John Doe,M,Central Primary,District A,Public,LCA,B,A,C,1,2,2
1002,Jane Smith,F,North Secondary,District A,Private,LCA,B,B,C,1,1,2
```

**Scoring:**
- John: MC = 3/3 (3 pts), CR = 5/5 (1+2+2) → Total: 8/8 points = 100%
- Jane: MC = 2/3 (Q2 wrong = 2 pts), CR = 4/5 (1+1+2) → Total: 6/8 points = 75%

---

## How the System Auto-Detects Format

The platform **automatically detects** whether your assessment is weighted or unweighted:

### Detection Logic:
1. Reads the KEY row
2. Checks each key value:
   - **If letter (A/B/C/D)** → Multiple Choice item, 1 point
   - **If number (1/2/3/4/5)** → Constructed Response item, worth that many points
3. Calculates total possible points
4. Adjusts statistics and reporting accordingly

### Examples:
- **OERA**: All letters in KEY row → 29 MC items → 29 total points
- **OEMA**: 18 letters + 11 numbers → 18 MC (18 pts) + 11 CR (20 pts) → 38 total points

---

## Important Rules

### ✅ DO:
- Include all required demographic columns (ID, Name, Sex, School)
- Put "KEY" in the second row, first column
- Use consistent answer format (all uppercase: A, B, C, D)
- Use numeric values (0, 1, 2, 3...) for CR item scores
- Leave cells blank if student didn't answer (not "N/A" or "X")
- Include School information for all students
- Use standard country codes for regional assessments (LCA, GRN, SVG, etc.)

### ❌ DON'T:
- Skip the KEY row
- Mix letters and numbers in MC items (use only A, B, C, D)
- Put text in CR score columns (use numbers only: 0, 1, 2, 3...)
- Include formulas in Excel files (convert to values before upload)
- Add extra header rows or summary rows
- Use special characters in student IDs or names (stick to letters, numbers, spaces)

---

## Missing Data Handling

### Blank/Empty Cells:
- **MC items**: Treated as incorrect (0 points)
- **CR items**: Treated as 0 points earned
- **Demographics**: May cause validation warnings

### Multiple Responses:
If a student marks multiple answers on MC item (e.g., "A B"):
- Automatically marked as **incorrect** (0 points)
- Flagged in validation report

---

## Regional Assessment Guidelines

For regional assessments with multiple countries:

1. **Option A - Combined Upload:**
   - Include all countries in one file
   - Fill the "Country" column for each student
   - System will detect and offer to split by country

2. **Option B - Separate Uploads:**
   - Create separate files per country
   - Upload each country individually
   - Leave "Country" column blank or use same value

---

## File Format Requirements

### CSV Files:
- UTF-8 encoding
- Comma-separated values
- Max file size: 10 MB
- Recommended for simple data

### Excel Files:
- .xlsx format (Excel 2007+)
- Data must be in **first sheet**
- No merged cells
- No pivot tables or charts
- Convert formulas to values before upload

---

## Validation Process

When you upload a file, the system will:

1. **Check format**:
   - KEY row present?
   - Required columns included?
   - Column headers valid?

2. **Validate data**:
   - Student IDs unique?
   - Gender values valid (M/F)?
   - Answer formats correct?

3. **Show preview**:
   - First 10 students
   - Detected format (weighted/unweighted)
   - Total items and points
   - Warnings (if any)

4. **Request confirmation**:
   - Assessment name
   - Assessment year
   - Country (if not in file)

---

## Troubleshooting

### "KEY row not found"
- Ensure "KEY" is in column 1, row 2
- Check spelling (must be uppercase "KEY")

### "Invalid answer format"
- MC items: Use only A, B, C, D (uppercase)
- CR items: Use only numbers (0, 1, 2, 3...)

### "Missing required columns"
- Verify: ID, Name, Sex, School columns present
- Check column header spelling

### "Duplicate student IDs"
- Student IDs must be unique within assessment
- Check for repeated ID values

---

## Support

For assistance:
- Check template examples in this folder
- Review uploaded file against template
- Contact OECS technical support

---

**Last Updated:** November 2024
**Platform Version:** 1.0
