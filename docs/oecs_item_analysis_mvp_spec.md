# OECS Item Analysis Platform - MVP Specification

**Version:** 1.0  
**Target Timeline:** 8-10 Weeks  
**Purpose:** Deliver core item analysis functionality to validate concept and gather user feedback

---

## Executive Summary

This MVP will deliver a functional web application that replaces the Excel-based item analysis workflow with essential features only. The goal is to prove the concept, validate with real users, and establish the technical foundation for future expansion.

### MVP Philosophy: "Do Less, Better"

Focus on:
- ✅ Single user workflow (upload → analyze → report)
- ✅ OERA 2025 data only (expand to OEMA later)
- ✅ Core statistics only (difficulty, discrimination, basic descriptives)
- ✅ Simple authentication (add RBAC later)
- ✅ Basic reporting (PDF/Excel export)

Defer to v2.0:
- ❌ Multi-year comparison
- ❌ Complex role-based permissions
- ❌ Advanced visualizations
- ❌ OEMA support
- ❌ School-level disaggregation
- ❌ Email notifications

---

## Table of Contents

1. [MVP Scope](#1-mvp-scope)
2. [User Stories](#2-user-stories)
3. [Technical Architecture](#3-technical-architecture)
4. [Database Schema (Simplified)](#4-database-schema-simplified)
5. [Feature Specifications](#5-feature-specifications)
6. [UI/UX Wireframes](#6-uiux-wireframes)
7. [Implementation Plan](#7-implementation-plan)
8. [Success Metrics](#8-success-metrics)
9. [Post-MVP Roadmap](#9-post-mvp-roadmap)

---

## 1. MVP Scope

### 1.1 What's IN the MVP

#### Core Features
1. **User Authentication**
   - Login/logout
   - Password reset
   - Single admin user + multiple standard users

2. **Data Upload**
   - CSV/Excel file upload
   - Template download
   - Basic validation
   - Preview before confirm

3. **Item Analysis**
   - Item difficulty (p-value)
   - Discrimination index (upper/lower 27%)
   - Point-biserial correlation
   - Distractor analysis

4. **Test Statistics**
   - Descriptive stats (mean, median, SD, min, max)
   - Cronbach's Alpha
   - Score distribution

5. **Reporting**
   - Test summary report (PDF)
   - Item analysis report (Excel)
   - Basic charts (histogram, scatter plot)

6. **Data Management**
   - View uploaded assessments
   - Delete assessments
   - View student list
   - View item list

#### Technical Features
- Responsive web interface
- RESTful API
- PostgreSQL database
- Basic error handling
- Data validation

### 1.2 What's OUT of the MVP

- Multi-year comparative analysis
- OEMA assessment type
- Complex role-based permissions (just admin/user)
- School-level filtering
- Country-level disaggregation
- Advanced data visualizations
- Automated email reports
- API for external systems
- Mobile app
- Offline mode
- Advanced data export options
- Audit logging (basic only)
- Two-factor authentication
- User management interface (manual admin setup)

### 1.3 MVP Success Criteria

✅ Upload 2025 OERA data successfully  
✅ All statistics match Excel workbook (within 0.001 tolerance)  
✅ Generate PDF and Excel reports  
✅ 3 users can access simultaneously  
✅ System stable for continuous 48-hour operation  
✅ User feedback rating ≥ 3.5/5.0  

---

## 2. User Stories

### 2.1 Primary Persona: Assessment Coordinator

**As an Assessment Coordinator,**

1. **I want to** log into the system **so that** I can access item analysis tools
2. **I want to** download a data template **so that** I know the correct format
3. **I want to** upload my assessment data file **so that** it can be analyzed
4. **I want to** see validation errors before confirming **so that** I can fix data issues
5. **I want to** view item statistics **so that** I can identify poorly performing items
6. **I want to** view test statistics **so that** I can assess overall assessment quality
7. **I want to** generate a PDF report **so that** I can share results with stakeholders
8. **I want to** export item statistics to Excel **so that** I can do further analysis
9. **I want to** view my uploaded assessments **so that** I can access past analyses
10. **I want to** delete an assessment **so that** I can remove test data

### 2.2 Secondary Persona: System Administrator

**As a System Administrator,**

1. **I want to** create user accounts **so that** coordinators can access the system
2. **I want to** reset user passwords **so that** users can regain access
3. **I want to** view all assessments **so that** I can monitor system usage

---

## 3. Technical Architecture

### 3.1 Technology Stack (Recommended)

#### Option A: JavaScript Full-Stack (Faster Development)

**Frontend:**
- React 18 with TypeScript
- Vite (build tool)
- Material-UI (component library)
- React Router (navigation)
- Axios (HTTP client)
- React Hook Form + Yup (forms/validation)
- Recharts (simple charts)

**Backend:**
- Node.js 18 LTS
- Express.js
- Prisma ORM
- jsonwebtoken (auth)
- bcrypt (password hashing)
- multer (file uploads)
- xlsx (Excel processing)
- simple-statistics (calculations)
- pdfkit (PDF generation)

**Database:**
- PostgreSQL 15

**Deployment:**
- Docker containers
- Docker Compose for local dev
- Deploy to single VPS or AWS EC2

#### Option B: Python Backend (Better for Statistics)

**Frontend:** Same as Option A

**Backend:**
- Python 3.11
- FastAPI
- SQLAlchemy + Alembic
- python-jose (JWT)
- pandas (data processing)
- scipy/numpy (statistics)
- openpyxl (Excel)
- reportlab (PDF)

**Database:** PostgreSQL 15

**Why Option A for MVP:** Faster development, single language, easier to find developers

### 3.2 System Architecture

```
┌─────────────────────────────────────┐
│      Browser (Client)               │
│                                     │
│  React App with Material-UI         │
│  - Login page                       │
│  - Dashboard                        │
│  - Upload page                      │
│  - Analysis page                    │
│  - Reports page                     │
└─────────────────────────────────────┘
              ↕ HTTPS/REST
┌─────────────────────────────────────┐
│      Node.js + Express Server       │
│                                     │
│  /api/auth/*     - Authentication   │
│  /api/upload/*   - File upload      │
│  /api/analysis/* - Statistics       │
│  /api/reports/*  - Report gen       │
└─────────────────────────────────────┘
              ↕ SQL Queries
┌─────────────────────────────────────┐
│      PostgreSQL Database            │
│                                     │
│  - users                            │
│  - assessments                      │
│  - items                            │
│  - students                         │
│  - responses                        │
│  - statistics                       │
└─────────────────────────────────────┘
```

---

## 4. Database Schema (Simplified)

### 4.1 Core Tables (6 tables only)

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Assessments table
CREATE TABLE assessments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    assessment_year INTEGER NOT NULL,
    country VARCHAR(100),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'active',
    student_count INTEGER,
    item_count INTEGER
);

-- Items table
CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    assessment_id INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
    item_code VARCHAR(20) NOT NULL,
    correct_answer VARCHAR(10),
    content_domain VARCHAR(20),
    cognitive_level VARCHAR(20),
    UNIQUE(assessment_id, item_code)
);

-- Students table
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    assessment_id INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
    student_code VARCHAR(100) NOT NULL,
    gender VARCHAR(1) CHECK (gender IN ('M', 'F')),
    total_score DECIMAL(5,2),
    UNIQUE(assessment_id, student_code)
);

-- Responses table
CREATE TABLE responses (
    id BIGSERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
    response_value VARCHAR(10),
    is_correct BOOLEAN,
    UNIQUE(student_id, item_id)
);

-- Statistics table (cached calculations)
CREATE TABLE statistics (
    id SERIAL PRIMARY KEY,
    assessment_id INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
    stat_type VARCHAR(50) NOT NULL,
    stat_value DECIMAL(10,4),
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_responses_student ON responses(student_id);
CREATE INDEX idx_responses_item ON responses(item_id);
CREATE INDEX idx_statistics_assessment ON statistics(assessment_id);
CREATE INDEX idx_statistics_item ON statistics(item_id);
```

### 4.2 Data Model Diagram

```
users (1) ──── uploads ──── (many) assessments
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                 items (many)   students (many)   statistics (many)
                    │                │
                    └────── responses ──────┘
                         (many-to-many)
```

---

## 5. Feature Specifications

### 5.1 Authentication

**Login Page:**
- Email and password fields
- "Remember me" checkbox
- "Forgot password" link
- Error messages for invalid credentials

**Password Reset:**
- Enter email to request reset
- Receive reset token (console log for MVP, email later)
- Reset password with token

**Implementation:**
- JWT tokens (1 hour expiry)
- bcrypt for password hashing (10 rounds)
- No refresh tokens in MVP (re-login after expiry)

### 5.2 Dashboard

**Layout:**
- Header with logo and user menu
- Sidebar navigation
- Main content area

**Content:**
- Welcome message
- Quick stats cards:
  - Total assessments
  - Recent uploads
- Recent assessments table:
  - Name, Year, Country, Date, Actions (View, Delete)
- "Upload New Assessment" button (prominent)

### 5.3 Data Upload

**Upload Page Steps:**

**Step 1: Download Template**
- Button to download CSV template
- Instructions about format
- Sample data included

**Step 2: Upload File**
- Drag-and-drop area or file picker
- Accept .csv, .xlsx
- Show file name and size
- "Upload" button

**Step 3: Validation**
- Check file format
- Validate columns (StudentID, Gender, Q1-QN, etc.)
- Check for missing required fields
- Check answer key consistency
- Display validation results:
  - ✅ Success messages (green)
  - ⚠️ Warnings (yellow) - continue with caution
  - ❌ Errors (red) - must fix before proceeding

**Step 4: Preview**
- Show first 10 rows
- Display summary:
  - Number of students
  - Number of items
  - Missing responses count
- "Confirm Import" button

**Step 5: Processing**
- Show progress indicator
- Parse data
- Calculate scores
- Store in database
- Redirect to analysis page

**Data Validation Rules:**
```javascript
{
  studentId: { required: true, type: 'string' },
  gender: { required: false, enum: ['M', 'F'] },
  responses: { required: true, pattern: /^[A-D]$|^$/ }, // A-D or empty
  answerKey: { required: true, pattern: /^[A-D]$/ }
}
```

### 5.4 Analysis Dashboard

**Layout:**
```
┌────────────────────────────────────────────────┐
│  Assessment: 2025 OERA - Grenada               │
│  Students: 532  |  Items: 45  |  Mean: 28.4    │
└────────────────────────────────────────────────┘

┌─────────────┬──────────────────────────────────┐
│             │                                  │
│   Tabs:     │   [Selected Tab Content]         │
│             │                                  │
│  > Overview │   Test Statistics                │
│    Items    │   - Descriptive stats            │
│    Students │   - Reliability                  │
│    Reports  │   - Score distribution chart     │
│             │                                  │
└─────────────┴──────────────────────────────────┘
```

**Tab 1: Overview**

*Test Statistics Card:*
- Number of Students: N
- Number of Items: K
- Mean Score: μ
- Median Score: M
- Standard Deviation: σ
- Minimum Score: min
- Maximum Score: max
- Cronbach's Alpha: α
- Interpretation: [Excellent/Good/Acceptable/Poor]

*Score Distribution Chart:*
- Histogram showing frequency distribution
- X-axis: Score ranges
- Y-axis: Number of students

**Tab 2: Items**

*Item Statistics Table:*

| Item | Difficulty | Interpretation | Discrimination | Point-Biserial | Status |
|------|------------|----------------|----------------|----------------|--------|
| Q1   | 0.68       | Moderate       | 0.45           | 0.42           | ✅ Good |
| Q2   | 0.34       | Difficult      | 0.28           | 0.25           | ⚠️ Review |
| Q3   | 0.92       | Easy           | 0.15           | 0.12           | ❌ Poor |

*Features:*
- Sortable by any column
- Filter by status (All, Good, Review, Poor)
- Click row to see distractor analysis

*Item Detail Modal:*
- Item statistics
- Distractor analysis table:
  
| Option | High Performers | Low Performers | Discrimination |
|--------|-----------------|----------------|----------------|
| A      | 8               | 12             | -0.04          |
| B      | 18              | 45             | -0.27          |
| C*     | 95              | 32             | 0.63 ✅        |
| D      | 7               | 11             | -0.04          |

*Answer key marked with asterisk

**Tab 3: Students**

*Student List Table:*

| Student ID | Gender | Score | Percentile | Performance |
|------------|--------|-------|------------|-------------|
| 1509       | M      | 38    | 87         | High        |
| 322        | F      | 12    | 23         | Low         |

*Features:*
- Sort by score, percentile
- Filter by gender
- Export to CSV

**Tab 4: Reports**

*Report Generation:*
- Select report type:
  - [ ] Test Summary Report (PDF)
  - [ ] Item Analysis Report (Excel)
- "Generate Report" button
- View generated reports history

### 5.5 Statistical Calculations

**Implementation Priority:**

#### Level 1: Test Statistics (Required)
```javascript
// Descriptive statistics
function calculateDescriptive(scores) {
    const sorted = scores.sort((a, b) => a - b);
    return {
        n: scores.length,
        min: Math.min(...scores),
        max: Math.max(...scores),
        mean: scores.reduce((a, b) => a + b) / scores.length,
        median: sorted[Math.floor(sorted.length / 2)],
        stdev: calculateStandardDeviation(scores),
        variance: calculateVariance(scores)
    };
}

// Cronbach's Alpha
function calculateCronbachAlpha(itemScoresMatrix, totalScores) {
    const K = itemScoresMatrix[0].length;
    const itemVariances = itemScoresMatrix[0].map((_, itemIndex) => 
        calculateVariance(itemScoresMatrix.map(row => row[itemIndex]))
    );
    const sumItemVar = itemVariances.reduce((a, b) => a + b);
    const totalVar = calculateVariance(totalScores);
    return (K / (K - 1)) * (1 - (sumItemVar / totalVar));
}
```

#### Level 2: Item Statistics (Required)
```javascript
// Item difficulty (p-value)
function calculateDifficulty(responses) {
    const correct = responses.filter(r => r.is_correct).length;
    return correct / responses.length;
}

// Discrimination index
function calculateDiscrimination(allStudents, itemId) {
    // Sort by total score
    const sorted = allStudents.sort((a, b) => b.total_score - a.total_score);
    
    // Get upper and lower 27%
    const groupSize = Math.floor(sorted.length * 0.27);
    const upper = sorted.slice(0, groupSize);
    const lower = sorted.slice(-groupSize);
    
    // Count correct in each group
    const upperCorrect = upper.filter(s => 
        s.responses.find(r => r.item_id === itemId && r.is_correct)
    ).length;
    const lowerCorrect = lower.filter(s => 
        s.responses.find(r => r.item_id === itemId && r.is_correct)
    ).length;
    
    return (upperCorrect - lowerCorrect) / groupSize;
}

// Point-biserial correlation
function calculatePointBiserial(itemScores, totalScores) {
    // Use library: simple-statistics
    return ss.sampleCorrelation(itemScores, totalScores);
}
```

#### Level 3: Distractor Analysis (Required)
```javascript
function analyzeDistractors(item, allStudents) {
    const options = ['A', 'B', 'C', 'D'];
    const sorted = allStudents.sort((a, b) => b.total_score - a.total_score);
    const groupSize = Math.floor(sorted.length * 0.27);
    const upper = sorted.slice(0, groupSize);
    const lower = sorted.slice(-groupSize);
    
    return options.map(option => {
        const upperCount = upper.filter(s => 
            s.responses.find(r => r.item_id === item.id && r.response_value === option)
        ).length;
        const lowerCount = lower.filter(s => 
            s.responses.find(r => r.item_id === item.id && r.response_value === option)
        ).length;
        
        return {
            option,
            upper_count: upperCount,
            lower_count: lowerCount,
            discrimination: (upperCount - lowerCount) / groupSize
        };
    });
}
```

### 5.6 Report Generation

**Test Summary Report (PDF):**

*Page 1: Cover*
- Assessment name and year
- Generation date
- OECS logo

*Page 2: Test Statistics*
- Descriptive statistics table
- Reliability information
- Score distribution chart

*Page 3: Item Summary*
- Table of all items with key statistics
- Items flagged for review highlighted

**Item Analysis Report (Excel):**

*Sheet 1: Test Statistics*
- Descriptive statistics

*Sheet 2: Item Statistics*
- All item statistics in table

*Sheet 3: Distractor Analysis*
- Distractor data for each item

*Sheet 4: Raw Data*
- Student responses matrix

---

## 6. UI/UX Wireframes

### 6.1 Login Page

```
┌──────────────────────────────────────────┐
│                                          │
│         OECS Item Analysis Platform      │
│              [OECS Logo]                 │
│                                          │
│    ┌──────────────────────────────┐     │
│    │  Email: [____________]       │     │
│    │  Password: [____________]    │     │
│    │  [ ] Remember me             │     │
│    │                              │     │
│    │  [    Login    ]             │     │
│    │                              │     │
│    │  Forgot password?            │     │
│    └──────────────────────────────┘     │
│                                          │
└──────────────────────────────────────────┘
```

### 6.2 Dashboard

```
┌────────────────────────────────────────────────────────┐
│ OECS Analysis │  Dashboard  Assessments  Logout ▼     │
├────────┬───────────────────────────────────────────────┤
│        │                                               │
│  📊    │  Welcome, Maria                               │
│  Dash  │                                               │
│        │  ┌─────────────┐  ┌─────────────┐            │
│  📁    │  │ Total       │  │ This Year   │            │
│  Assess│  │ Assessments │  │ Uploads     │            │
│        │  │     12      │  │      3      │            │
│  ➕    │  └─────────────┘  └─────────────┘            │
│  Upload│                                               │
│        │  Recent Assessments                           │
│        │  ┌──────────────────────────────────────┐    │
│        │  │ Name      Year  Country  Date   Actions   │
│        │  │ 2025 OERA 2025  GRN      May 15  👁 🗑    │
│        │  │ 2025 OERA 2025  SVG      May 12  👁 🗑    │
│        │  └──────────────────────────────────────┘    │
│        │                                               │
│        │  [➕ Upload New Assessment]                   │
│        │                                               │
└────────┴───────────────────────────────────────────────┘
```

### 6.3 Upload Page

```
┌────────────────────────────────────────────────────────┐
│ OECS Analysis │  Upload Assessment                     │
├────────┬───────────────────────────────────────────────┤
│        │                                               │
│  Steps:│  Step 1: Download Template                    │
│  ✅ 1  │  ┌─────────────────────────────────────┐     │
│  ⚪ 2  │  │ Download the CSV template file      │     │
│  ⚪ 3  │  │ [📥 Download Template]              │     │
│  ⚪ 4  │  └─────────────────────────────────────┘     │
│        │                                               │
│        │  Step 2: Upload File                          │
│        │  ┌─────────────────────────────────────┐     │
│        │  │     Drag file here or click         │     │
│        │  │         to select file              │     │
│        │  │                                     │     │
│        │  │        📄 2025_OERA_GRN.csv         │     │
│        │  │           (125 KB)                  │     │
│        │  └─────────────────────────────────────┘     │
│        │                                               │
│        │  [    Upload    ]                             │
│        │                                               │
└────────┴───────────────────────────────────────────────┘
```

### 6.4 Analysis Page

```
┌────────────────────────────────────────────────────────┐
│ OECS Analysis │  2025 OERA - Grenada                   │
├────────────────────────────────────────────────────────┤
│ Students: 532 │ Items: 45 │ Mean: 28.4 │ Alpha: 0.87  │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Overview │ Items │ Students │ Reports                │
│  ─────────                                             │
│                                                        │
│  Test Statistics                                       │
│  ┌──────────────────────────────────────────────┐    │
│  │ Mean:              28.4                      │    │
│  │ Median:            29.0                      │    │
│  │ Std Deviation:     8.7                       │    │
│  │ Min / Max:         3 / 45                    │    │
│  │ Cronbach's Alpha:  0.87 (Good)               │    │
│  └──────────────────────────────────────────────┘    │
│                                                        │
│  Score Distribution                                    │
│  ┌──────────────────────────────────────────────┐    │
│  │     ▂▄▆█▆▄▂                                  │    │
│  │  ▂▄▆████████▆▄▂                              │    │
│  │ 0  10  20  30  40  50                        │    │
│  └──────────────────────────────────────────────┘    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 7. Implementation Plan

### 7.1 Sprint Plan (8 Weeks)

#### Week 1: Setup & Authentication
**Backend:**
- [ ] Initialize Node.js project
- [ ] Setup Express server
- [ ] Configure PostgreSQL connection
- [ ] Setup Prisma ORM
- [ ] Create database schema
- [ ] Implement user authentication (JWT)
- [ ] Password reset functionality

**Frontend:**
- [ ] Initialize React project with Vite
- [ ] Setup Material-UI
- [ ] Create login page
- [ ] Create password reset flow
- [ ] Setup API client (Axios)

**DevOps:**
- [ ] Setup Git repository
- [ ] Configure Docker for local development
- [ ] Create docker-compose.yml

#### Week 2: Dashboard & Navigation
**Backend:**
- [ ] GET /api/assessments - list all
- [ ] DELETE /api/assessments/:id
- [ ] GET /api/user/profile

**Frontend:**
- [ ] Create dashboard layout
- [ ] Sidebar navigation
- [ ] Assessment list component
- [ ] Delete confirmation modal
- [ ] Protected routes

#### Week 3: File Upload (Part 1)
**Backend:**
- [ ] POST /api/upload - handle file upload
- [ ] CSV/Excel parsing logic
- [ ] Data validation functions
- [ ] Return validation results

**Frontend:**
- [ ] Upload page UI
- [ ] File upload component
- [ ] Validation results display
- [ ] Data preview component

#### Week 4: File Upload (Part 2) & Data Storage
**Backend:**
- [ ] POST /api/assessments - create assessment
- [ ] Store items in database
- [ ] Store students in database
- [ ] Store responses in database
- [ ] Calculate initial scores

**Frontend:**
- [ ] Confirm and import flow
- [ ] Progress indicators
- [ ] Error handling and display

#### Week 5: Statistical Calculations
**Backend:**
- [ ] Implement test statistics functions
- [ ] Implement item statistics functions
- [ ] Implement distractor analysis
- [ ] GET /api/assessments/:id/statistics
- [ ] Store calculated stats in database

**Testing:**
- [ ] Unit tests for all calculation functions
- [ ] Compare against Excel results
- [ ] Document any discrepancies

#### Week 6: Analysis Dashboard
**Frontend:**
- [ ] Analysis page layout with tabs
- [ ] Overview tab (test stats)
- [ ] Score distribution chart
- [ ] Items tab with table
- [ ] Item detail modal
- [ ] Students tab

**Backend:**
- [ ] GET /api/assessments/:id/items
- [ ] GET /api/assessments/:id/students
- [ ] GET /api/items/:id/distractors

#### Week 7: Report Generation
**Backend:**
- [ ] Implement PDF report generator
- [ ] Implement Excel report generator
- [ ] POST /api/reports/generate
- [ ] Store generated reports
- [ ] GET /api/reports/:id/download

**Frontend:**
- [ ] Reports tab
- [ ] Report generation form
- [ ] Download reports
- [ ] Report history

#### Week 8: Testing, Bug Fixes & Deployment
- [ ] End-to-end testing
- [ ] Performance testing
- [ ] Security audit
- [ ] Bug fixes
- [ ] User acceptance testing
- [ ] Deployment to production
- [ ] User training session
- [ ] Documentation

### 7.2 Daily Standup Structure

**Questions:**
1. What did you complete yesterday?
2. What will you work on today?
3. Any blockers?

**Tools:**
- GitHub for version control
- GitHub Projects for task tracking
- Slack for communication
- Google Meet for standups

### 7.3 Development Environment

**Local Setup:**
```bash
# Clone repository
git clone <repo-url>
cd oecs-item-analysis

# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env with database credentials

# Database setup
docker-compose up -d  # Start PostgreSQL
npx prisma migrate dev
npx prisma db seed  # Create admin user

# Start backend
npm run dev  # Runs on http://localhost:3000

# Frontend setup (new terminal)
cd frontend
npm install
cp .env.example .env

# Start frontend
npm run dev  # Runs on http://localhost:5173
```

**Environment Variables:**
```bash
# Backend .env
DATABASE_URL="postgresql://user:pass@localhost:5432/oecs_analysis"
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRY="1h"
PORT=3000

# Frontend .env
VITE_API_URL="http://localhost:3000/api"
```

---

## 8. Success Metrics

### 8.1 Technical Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Statistical Accuracy | 100% match with Excel (±0.001) | Automated comparison tests |
| Page Load Time | < 3 seconds | Chrome DevTools |
| API Response Time | < 1 second | Backend logging |
| Uptime | > 99% | Monitoring tool |
| Concurrent Users | 10 users | Load testing |

### 8.2 User Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Successful Upload Rate | > 95% | Analytics tracking |
| User Satisfaction | ≥ 3.5/5.0 | Post-launch survey |
| Time to Generate Report | < 30 seconds | System logging |
| Error Rate | < 5% | Error monitoring |

### 8.3 Business Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Excel Replacement | 100% of coordinators using MVP | User adoption tracking |
| Time Saved per Analysis | > 50% vs Excel | Time tracking |
| Training Completion | 100% of users | Training attendance |

---

## 9. Post-MVP Roadmap

### Version 2.0 (Months 4-6)
- [ ] Multi-year comparative analysis
- [ ] OEMA assessment support
- [ ] School-level disaggregation
- [ ] Advanced data visualizations
- [ ] Enhanced role-based permissions
- [ ] Email notifications

### Version 3.0 (Months 7-9)
- [ ] Mobile responsive improvements
- [ ] Automated report scheduling
- [ ] Data export API
- [ ] Advanced filtering and search
- [ ] Collaborative features (comments, sharing)

### Version 4.0 (Months 10-12)
- [ ] Predictive analytics
- [ ] Benchmarking tools
- [ ] Integration with Student Information Systems
- [ ] Mobile app

---

## 10. Resource Requirements

### 10.1 Team Composition

| Role | Allocation | Duration |
|------|-----------|----------|
| Full-Stack Developer | 1 FTE | 8 weeks |
| Frontend Developer | 0.5 FTE | 6 weeks |
| UI/UX Designer | 0.25 FTE | 2 weeks |
| QA Tester | 0.5 FTE | 4 weeks |
| Project Manager | 0.25 FTE | 8 weeks |

**Total Effort:** ~25 person-weeks

### 10.2 Budget Estimate

| Item | Cost (USD) |
|------|-----------|
| Development (1 dev × 8 weeks @ $7k/week) | $56,000 |
| Frontend Support (0.5 dev × 6 weeks @ $7k/week) | $21,000 |
| UI/UX Design | $3,000 |
| QA Testing | $7,000 |
| Project Management | $3,500 |
| Cloud Infrastructure (3 months) | $600 |
| **Total MVP Cost** | **$91,100** |

### 10.3 Infrastructure

**Development:**
- Local machines with Docker
- GitHub for version control
- Free tier: Vercel or Netlify for frontend preview

**Production:**
- Single VPS (4 CPU, 8GB RAM): ~$40/month
- PostgreSQL database
- 50GB storage
- SSL certificate (Let's Encrypt - free)
- Domain name: ~$15/year

**Alternative (Cloud):**
- AWS EC2 t3.medium: ~$50/month
- AWS RDS PostgreSQL: ~$50/month
- AWS S3: ~$5/month
- **Total: ~$105/month**

---

## 11. Risk Management

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Statistical calculation errors | Medium | High | Extensive testing against Excel, peer review |
| Data migration issues | Medium | High | Thorough validation, rollback plan |
| Developer availability | Low | High | Cross-training, documentation |
| Scope creep | High | Medium | Strict MVP scope, change control |
| User resistance | Medium | Medium | Early user involvement, training |
| Performance issues | Low | Medium | Load testing before launch |

---

## 12. Next Steps

### Immediate Actions (This Week)

1. **Get Approval**
   - [ ] Review this MVP spec with stakeholders
   - [ ] Get sign-off on scope and timeline
   - [ ] Secure budget approval

2. **Team Assembly**
   - [ ] Hire or assign developers
   - [ ] Set up communication channels
   - [ ] Schedule kickoff meeting

3. **Technical Setup**
   - [ ] Create GitHub repository
   - [ ] Setup development environments
   - [ ] Acquire domain name
   - [ ] Setup cloud accounts

4. **Project Planning**
   - [ ] Create detailed task list in project management tool
   - [ ] Assign tasks to team members
   - [ ] Set up sprint board
   - [ ] Schedule daily standups

### Week 1 Kickoff Agenda

1. **Project Overview** (30 min)
   - MVP goals and scope
   - Success criteria
   - Timeline and milestones

2. **Technical Architecture** (30 min)
   - Tech stack review
   - Database design
   - API structure

3. **Development Process** (20 min)
   - Git workflow
   - Code review process
   - Testing requirements

4. **Sprint Planning** (40 min)
   - Week 1 tasks
   - Task assignments
   - Questions and clarifications

---

## Appendix A: Sample Data Format

### CSV Upload Template

```csv
StudentID,StudentName,Gender,Country,Q1,Q2,Q3,Q4,Q5
1509,StudentA,M,GRN,C,A,A,B,C
322,StudentB,F,GRN,A,,,,,
33,StudentC,F,GRN,A,B,A,C,A
```

**Answer Key Row:**
```csv
KEY,,,GRN,C,A,C,A,C
```

---

## Appendix B: API Endpoints (MVP)

```
Authentication:
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/reset-password

Assessments:
GET    /api/assessments
POST   /api/assessments
GET    /api/assessments/:id
DELETE /api/assessments/:id

Upload:
POST   /api/upload/validate
POST   /api/upload/confirm

Statistics:
GET    /api/assessments/:id/statistics
GET    /api/assessments/:id/items
GET    /api/assessments/:id/students
GET    /api/items/:id/distractors

Reports:
POST   /api/reports/generate
GET    /api/reports/:id/download

Template:
GET    /api/template/download
```

---

## Appendix C: Testing Checklist

### Functional Testing
- [ ] User can log in with valid credentials
- [ ] User cannot log in with invalid credentials
- [ ] User can upload valid CSV file
- [ ] System rejects invalid CSV format
- [ ] System validates answer key
- [ ] System calculates all statistics correctly
- [ ] User can view item analysis
- [ ] User can view student list
- [ ] User can generate PDF report
- [ ] User can generate Excel report
- [ ] User can download reports
- [ ] User can delete assessment
- [ ] User can log out

### Statistical Validation
- [ ] Mean matches Excel
- [ ] Median matches Excel
- [ ] Standard deviation matches Excel
- [ ] Cronbach's alpha matches Excel
- [ ] All item difficulties match Excel
- [ ] All discrimination indices match Excel
- [ ] All point-biserial correlations match Excel
- [ ] Distractor analysis matches Excel

### Performance Testing
- [ ] Upload 500+ student records in < 10 seconds
- [ ] Generate statistics in < 5 seconds
- [ ] Generate PDF in < 10 seconds
- [ ] Support 5 concurrent users

### Security Testing
- [ ] Passwords are hashed
- [ ] JWT tokens expire correctly
- [ ] Unauthorized users cannot access API
- [ ] File upload validates file types
- [ ] SQL injection prevention works
- [ ] XSS prevention works

---

**END OF MVP SPECIFICATION**
