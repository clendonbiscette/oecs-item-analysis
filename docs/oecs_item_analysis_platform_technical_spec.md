# OECS Item Analysis Platform
## Technical Specification & Implementation Guide

**Version:** 1.0  
**Date:** November 2024  
**Organization:** OECS Commission - Education Development and Management Unit  
**Project:** Digital Transformation of OERA & OEMA Item Analysis

---

## Executive Summary

This document provides comprehensive technical specifications for developing a full-stack web application to replace the current Excel-based item analysis tool for the OECS Early Reading Assessment (OERA) and OECS Early Mathematics Assessment (OEMA). The platform will serve Grade 2 assessment data across OECS Member States, providing robust psychometric analysis, secure data management, and actionable insights for educational improvement.

### Key Objectives

1. **Digitalize Item Analysis**: Transform Excel-based workflows into a scalable web application
2. **Preserve Statistical Integrity**: Accurately replicate all existing formulas and calculations
3. **Enable Multi-Year Analysis**: Support longitudinal data tracking from 2025 onwards
4. **Enhance Accessibility**: Provide role-based access for multiple stakeholders
5. **Support Decision-Making**: Generate actionable reports for educators and policymakers

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Functional Requirements](#2-functional-requirements)
3. [Technical Architecture](#3-technical-architecture)
4. [Database Design](#4-database-design)
5. [Psychometric Calculations](#5-psychometric-calculations)
6. [User Interface Specifications](#6-user-interface-specifications)
7. [Security & Data Protection](#7-security--data-protection)
8. [Implementation Roadmap](#8-implementation-roadmap)
9. [Testing Strategy](#9-testing-strategy)
10. [Maintenance & Support](#10-maintenance--support)

---

## 1. System Overview

### 1.1 Current State Analysis

**Existing Tool:** Excel-based workbook (`2025_OERA_Item_Analysis_LATEST.xlsx`)

**Structure:**
- **INPUT Sheet**: Student responses, demographics, answer keys
- **Item Analysis Sheet**: Classical Test Theory (CTT) statistics
- **Distractor Analysis Sheet**: Performance analysis by response option
- **Summary Sheet**: Aggregated test and item statistics

**Limitations:**
- Manual data entry prone to errors
- No version control or audit trails
- Limited concurrent user access
- Difficult to perform cross-year comparisons
- No automated report generation
- Risk of formula corruption

### 1.2 Proposed Solution

A modern web-based platform with:
- **Front-end**: React.js with TypeScript for type safety
- **Back-end**: Node.js/Express or Python/FastAPI
- **Database**: PostgreSQL for relational data integrity
- **Authentication**: JWT-based with role-based access control (RBAC)
- **Cloud Hosting**: AWS or Azure for scalability and reliability
- **Data Validation**: Client and server-side validation
- **Export Capabilities**: PDF, Excel, CSV formats

---

## 2. Functional Requirements

### 2.1 User Roles & Permissions

#### 2.1.1 System Administrator
- User management (create, modify, deactivate accounts)
- System configuration and settings
- Database backup and recovery
- Audit log access
- Regional-level data access

#### 2.1.2 National Assessment Coordinator
- Upload assessment data for their Member State
- View and analyze national-level results
- Generate national reports
- Manage school and student data
- Access historical data for their country

#### 2.1.3 Regional Assessment Officer (OECS)
- Access data across all Member States
- Perform regional comparative analysis
- Generate regional reports
- Monitor data quality and completeness
- Support Member States with technical issues

#### 2.1.4 Educator/School Administrator
- View school-level aggregated results (no individual student data)
- Generate school reports
- Access item-level performance data
- View recommendations for instructional improvement

#### 2.1.5 Read-Only Analyst
- View aggregated data and reports
- Export anonymized datasets
- No data upload or modification capabilities

### 2.2 Core Features

#### 2.2.1 Data Import & Management

**File Upload**
- Support CSV, XLSX file formats
- Drag-and-drop interface
- Validation before import
- Template download functionality
- Batch upload capability

**Data Validation Rules**
- Student ID format verification
- Answer key consistency checks
- Response option validation (A, B, C, D format)
- Demographic data completeness
- Duplicate record detection
- Missing value identification

**Data Structure Requirements**
```
Student Level:
- Student ID (unique identifier)
- Name (optional, can be anonymized)
- Sex/Gender (M/F)
- Country/Territory code
- School code
- Grade level (validation: must be 2)
- Assessment year

Item Level:
- Item ID (Q1, Q2, etc.)
- Answer key (correct response)
- Item type (Selected Response / Constructed Response)
- Content domain (for OEMA: N, O, PR, G, M, D)
- Cognitive level (literal, inferential, evaluative for OERA)
- Difficulty classification
- Maximum possible score
- Student response
```

#### 2.2.2 Item Analysis Calculations

**Classical Test Theory (CTT) Statistics**

1. **Item Difficulty (p-value)**
   - Formula: `p = (Number of correct responses) / (Total number of responses)`
   - Interpretation categories:
     - p < 0.30: Difficult
     - 0.30 ≤ p < 0.70: Moderate
     - 0.70 ≤ p < 0.95: Easy
     - p ≥ 0.95: Very Easy

2. **Discrimination Index**
   - Method: Upper 27% vs Lower 27% group comparison
   - Formula: `D = (P_upper - P_lower) / (n_group)`
   - Where:
     - P_upper = Number correct in high-performing group
     - P_lower = Number correct in low-performing group
     - n_group = Size of each group
   - Interpretation:
     - D ≥ 0.40: Excellent discrimination
     - 0.30 ≤ D < 0.40: Good
     - 0.20 ≤ D < 0.30: Fair (needs improvement)
     - D < 0.20: Poor (consider revision/removal)

3. **Point-Biserial Correlation (rpbis)**
   - Measures correlation between item score and total test score
   - Formula: Built-in statistical correlation function
   - Interpretation:
     - rpbis ≥ 0.30: Good item
     - 0.20 ≤ rpbis < 0.30: Acceptable
     - rpbis < 0.20: Poor (review needed)

4. **Distractor Analysis**
   - For each response option (A, B, C, D):
     - Count selections by high performers (upper 27%)
     - Count selections by low performers (lower 27%)
     - Calculate distractor difficulty index
     - Calculate distractor discrimination index
   - Purpose: Identify non-functioning distractors

#### 2.2.3 Test-Level Statistics

1. **Descriptive Statistics**
   - Number of students (n)
   - Number of items (K)
   - Minimum score
   - Maximum score
   - Mode
   - Median
   - Mean (μ)
   - Standard deviation (σ)
   - Variance (σ²)
   - Standard error of measurement (SEM)
   - Skewness
   - Kurtosis

2. **Reliability Coefficients**
   - Cronbach's Alpha (α)
     - Formula: `α = (K/(K-1)) × (1 - (Σσᵢ²/σₜ²))`
     - Interpretation:
       - α ≥ 0.90: Excellent
       - 0.80 ≤ α < 0.90: Good
       - 0.70 ≤ α < 0.80: Acceptable
       - α < 0.70: Poor
   
   - KR-20 (for dichotomous items)
   - Split-half reliability

3. **Performance Levels**
   - Classification by proficiency bands
   - Percentage distribution across levels
   - Minimum Proficiency Level (MPL) alignment with SDG 4.1.1a

#### 2.2.4 Reporting & Visualization

**Report Types**

1. **Test Summary Report**
   - Overall test statistics
   - Score distribution histogram
   - Reliability coefficients
   - Item difficulty distribution
   - Performance by demographic groups

2. **Item Analysis Report**
   - Item-by-item statistics table
   - Difficulty vs. Discrimination scatter plot
   - Flagged items requiring review
   - Distractor effectiveness analysis

3. **Student Performance Report**
   - Individual student scores
   - Percentile ranks
   - Performance by content domain
   - Strengths and areas for improvement

4. **Comparative Report**
   - Year-over-year trends
   - Cross-country comparisons
   - School-level benchmarking
   - Cohort analysis

5. **SDG 4.1.1a Report**
   - Percentage achieving MPL
   - Disaggregation by gender, location, country
   - Progress toward targets
   - Regional aggregation

**Visualization Components**
- Bar charts (score distributions, demographic breakdowns)
- Line graphs (trends over time)
- Scatter plots (difficulty vs. discrimination)
- Heat maps (item performance across schools/countries)
- Box plots (score distributions by group)
- Tables with sortable columns and filters

#### 2.2.5 Data Export

**Export Formats**
- PDF (formatted reports)
- Excel (.xlsx) with multiple sheets
- CSV (raw data)
- JSON (API integration)

**Export Options**
- Full dataset vs. filtered subset
- Anonymized vs. identified data (based on permissions)
- Aggregated summaries vs. item-level details
- Custom date ranges

---

## 3. Technical Architecture

### 3.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer (Browser)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          React.js Application (TypeScript)            │   │
│  │  - State Management (Redux/Context API)               │   │
│  │  - UI Components (Material-UI / Ant Design)           │   │
│  │  - Charts (Chart.js / Recharts)                       │   │
│  │  - Form Validation (React Hook Form + Yup)            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↕ HTTPS/REST API
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   API Server (Node.js/Express OR Python/FastAPI)     │   │
│  │  - RESTful API endpoints                              │   │
│  │  - JWT authentication middleware                      │   │
│  │  - Input validation and sanitization                  │   │
│  │  - Business logic layer                               │   │
│  │  - Statistical calculation modules                    │   │
│  │  - Report generation service                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↕ Database Queries
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         PostgreSQL Database (Primary)                 │   │
│  │  - User accounts & permissions                        │   │
│  │  - Assessment metadata                                │   │
│  │  - Student responses                                  │   │
│  │  - Calculated statistics                              │   │
│  │  - Audit logs                                         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │      Redis Cache (Optional - Performance)             │   │
│  │  - Session management                                 │   │
│  │  - Frequently accessed statistics                     │   │
│  │  - Report generation queue                            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↕ Backup/Archive
┌─────────────────────────────────────────────────────────────┐
│                    Storage Layer                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │      Cloud Storage (AWS S3 / Azure Blob)              │   │
│  │  - Uploaded data files                                │   │
│  │  - Generated reports (PDF/Excel)                      │   │
│  │  - Database backups                                   │   │
│  │  - System logs                                        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Technology Stack

#### Front-End
- **Framework**: React 18+ with TypeScript
- **State Management**: Redux Toolkit or Zustand
- **UI Library**: Material-UI (MUI) or Ant Design
- **Forms**: React Hook Form with Yup validation
- **Charts**: Chart.js or Recharts
- **Data Tables**: React Table or AG Grid
- **HTTP Client**: Axios
- **Build Tool**: Vite or Create React App
- **Testing**: Jest, React Testing Library

#### Back-End (Option A - Node.js)
- **Runtime**: Node.js 18+ LTS
- **Framework**: Express.js
- **ORM**: Prisma or TypeORM
- **Authentication**: jsonwebtoken, bcrypt
- **Validation**: Joi or Zod
- **File Processing**: xlsx, csv-parser
- **Statistical Calculations**: jStat, simple-statistics
- **PDF Generation**: PDFKit or Puppeteer
- **Testing**: Jest, Supertest

#### Back-End (Option B - Python)
- **Framework**: FastAPI
- **ORM**: SQLAlchemy with Alembic
- **Authentication**: python-jose, passlib
- **Validation**: Pydantic (built into FastAPI)
- **File Processing**: pandas, openpyxl
- **Statistical Calculations**: scipy, numpy, statsmodels
- **PDF Generation**: ReportLab or WeasyPrint
- **Testing**: pytest, httpx

#### Database
- **Primary**: PostgreSQL 15+
- **Advantages**:
  - ACID compliance
  - Complex queries support
  - JSON data type support
  - Robust backup/recovery
  - Strong community support

#### Caching (Optional)
- **Redis**: For session management and performance optimization

#### Cloud Infrastructure
- **Option A - AWS**:
  - EC2/ECS for application hosting
  - RDS for PostgreSQL
  - S3 for file storage
  - CloudFront for CDN
  - Route 53 for DNS
  - CloudWatch for monitoring

- **Option B - Azure**:
  - App Service for hosting
  - Azure Database for PostgreSQL
  - Blob Storage
  - Azure CDN
  - Azure Monitor

#### DevOps
- **Version Control**: Git (GitHub/GitLab)
- **CI/CD**: GitHub Actions, GitLab CI, or Jenkins
- **Containerization**: Docker
- **Orchestration**: Kubernetes (for large scale) or Docker Compose (for simpler deployment)
- **Monitoring**: Prometheus + Grafana or cloud-native tools
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana) or cloud logging

---

## 4. Database Design

### 4.1 Entity-Relationship Diagram

```
┌─────────────────┐         ┌──────────────────┐
│     Users       │         │   MemberStates   │
├─────────────────┤         ├──────────────────┤
│ user_id (PK)    │         │ state_id (PK)    │
│ username        │         │ state_code       │
│ email           │         │ state_name       │
│ password_hash   │         │ is_active        │
│ role            │         └──────────────────┘
│ state_id (FK)   │                 │
│ is_active       │                 │
│ created_at      │                 │
│ last_login      │                 │
└─────────────────┘                 │
                                    │
        │                           │
        │                           │
        │                           ↓
        │                ┌──────────────────┐
        │                │    Schools       │
        │                ├──────────────────┤
        │                │ school_id (PK)   │
        │                │ state_id (FK)    │
        │                │ school_code      │
        │                │ school_name      │
        │                │ location_type    │
        │                │ is_active        │
        │                └──────────────────┘
        │                        │
        │                        │
        │                        ↓
        │             ┌──────────────────────┐
        │             │   Assessments        │
        │             ├──────────────────────┤
        │             │ assessment_id (PK)   │
        │             │ assessment_type      │ (OERA/OEMA)
        │             │ assessment_year      │
        │             │ state_id (FK)        │
        │             │ administration_date  │
        │             │ status               │
        │             │ uploaded_by (FK)     │
        │             │ uploaded_at          │
        │             └──────────────────────┘
        │                        │
        │                        │
        │                        ↓
        │             ┌──────────────────────┐
        │             │    Items             │
        │             ├──────────────────────┤
        │             │ item_id (PK)         │
        │             │ assessment_id (FK)   │
        │             │ item_code            │ (Q1, Q2...)
        │             │ item_type            │ (SR/CR)
        │             │ correct_answer       │
        │             │ content_domain       │
        │             │ cognitive_level      │
        │             │ max_score            │
        │             └──────────────────────┘
        │                        │
        │                        │
        ↓                        ↓
┌─────────────────────┐  ┌──────────────────────┐
│     Students        │  │   Responses          │
├─────────────────────┤  ├──────────────────────┤
│ student_id (PK)     │  │ response_id (PK)     │
│ assessment_id (FK)  │  │ student_id (FK)      │
│ school_id (FK)      │  │ item_id (FK)         │
│ student_code        │  │ response_value       │
│ student_name        │  │ score                │
│ gender              │  │ is_correct           │
│ total_score         │  └──────────────────────┘
│ percentile_rank     │
└─────────────────────┘
        │
        │
        ↓
┌─────────────────────────┐
│   CalculatedStats       │
├─────────────────────────┤
│ stat_id (PK)            │
│ assessment_id (FK)      │
│ item_id (FK)            │ (NULL for test-level)
│ stat_type               │
│ stat_value              │
│ calculated_at           │
└─────────────────────────┘

┌─────────────────────┐
│   AuditLogs         │
├─────────────────────┤
│ log_id (PK)         │
│ user_id (FK)        │
│ action              │
│ table_affected      │
│ record_id           │
│ old_value           │
│ new_value           │
│ timestamp           │
│ ip_address          │
└─────────────────────┘
```

### 4.2 Table Specifications

#### Users Table
```sql
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'national_coordinator', 
                                                'regional_officer', 'educator', 'analyst')),
    state_id INTEGER REFERENCES member_states(state_id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    reset_token VARCHAR(255),
    reset_token_expiry TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

#### Member States Table
```sql
CREATE TABLE member_states (
    state_id SERIAL PRIMARY KEY,
    state_code VARCHAR(3) UNIQUE NOT NULL, -- ANB, BVI, GRN, etc.
    state_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Seed data
INSERT INTO member_states (state_code, state_name) VALUES
    ('ANB', 'Antigua and Barbuda'),
    ('BVI', 'British Virgin Islands'),
    ('DMA', 'Dominica'),
    ('GRN', 'Grenada'),
    ('MSR', 'Montserrat'),
    ('SKN', 'Saint Kitts and Nevis'),
    ('LCA', 'Saint Lucia'),
    ('VCT', 'Saint Vincent and the Grenadines');
```

#### Schools Table
```sql
CREATE TABLE schools (
    school_id SERIAL PRIMARY KEY,
    state_id INTEGER NOT NULL REFERENCES member_states(state_id),
    school_code VARCHAR(20) UNIQUE NOT NULL,
    school_name VARCHAR(200) NOT NULL,
    location_type VARCHAR(20) CHECK (location_type IN ('urban', 'rural')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_schools_state ON schools(state_id);
CREATE INDEX idx_schools_code ON schools(school_code);
```

#### Assessments Table
```sql
CREATE TABLE assessments (
    assessment_id SERIAL PRIMARY KEY,
    assessment_type VARCHAR(10) NOT NULL CHECK (assessment_type IN ('OERA', 'OEMA')),
    assessment_year INTEGER NOT NULL,
    state_id INTEGER NOT NULL REFERENCES member_states(state_id),
    administration_date DATE,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
    uploaded_by INTEGER REFERENCES users(user_id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    number_of_items INTEGER,
    number_of_students INTEGER,
    UNIQUE (assessment_type, assessment_year, state_id)
);

CREATE INDEX idx_assessments_type_year ON assessments(assessment_type, assessment_year);
CREATE INDEX idx_assessments_state ON assessments(state_id);
```

#### Items Table
```sql
CREATE TABLE items (
    item_id SERIAL PRIMARY KEY,
    assessment_id INTEGER NOT NULL REFERENCES assessments(assessment_id) ON DELETE CASCADE,
    item_code VARCHAR(20) NOT NULL, -- Q1, Q2, Q3...
    item_type VARCHAR(2) NOT NULL CHECK (item_type IN ('SR', 'CR')), -- Selected/Constructed Response
    correct_answer VARCHAR(10), -- For SR: A, B, C, D; for CR: could be NULL
    content_domain VARCHAR(10), -- For OEMA: N, O, PR, G, M, D
    cognitive_level VARCHAR(20), -- literal, inferential, evaluative
    max_score INTEGER DEFAULT 1,
    item_order INTEGER,
    UNIQUE (assessment_id, item_code)
);

CREATE INDEX idx_items_assessment ON items(assessment_id);
CREATE INDEX idx_items_code ON items(item_code);
```

#### Students Table
```sql
CREATE TABLE students (
    student_id SERIAL PRIMARY KEY,
    assessment_id INTEGER NOT NULL REFERENCES assessments(assessment_id) ON DELETE CASCADE,
    school_id INTEGER REFERENCES schools(school_id),
    student_code VARCHAR(50) NOT NULL, -- Can be anonymized
    student_name VARCHAR(200), -- Optional, can be NULL for privacy
    gender VARCHAR(1) CHECK (gender IN ('M', 'F')),
    total_score NUMERIC(5,2),
    percentile_rank NUMERIC(5,2),
    performance_level VARCHAR(50),
    UNIQUE (assessment_id, student_code)
);

CREATE INDEX idx_students_assessment ON students(assessment_id);
CREATE INDEX idx_students_school ON students(school_id);
CREATE INDEX idx_students_gender ON students(gender);
```

#### Responses Table
```sql
CREATE TABLE responses (
    response_id BIGSERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(item_id) ON DELETE CASCADE,
    response_value VARCHAR(100), -- Student's answer
    score NUMERIC(5,2), -- Points earned
    is_correct BOOLEAN,
    UNIQUE (student_id, item_id)
);

CREATE INDEX idx_responses_student ON responses(student_id);
CREATE INDEX idx_responses_item ON responses(item_id);
CREATE INDEX idx_responses_correct ON responses(is_correct);
```

#### Calculated Statistics Table
```sql
CREATE TABLE calculated_stats (
    stat_id BIGSERIAL PRIMARY KEY,
    assessment_id INTEGER NOT NULL REFERENCES assessments(assessment_id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES items(item_id) ON DELETE CASCADE, -- NULL for test-level stats
    stat_type VARCHAR(50) NOT NULL, -- 'difficulty', 'discrimination', 'rpbis', 'mean', 'stdev', etc.
    stat_value NUMERIC(10,4),
    stat_metadata JSONB, -- For storing additional context
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    calculated_by INTEGER REFERENCES users(user_id)
);

CREATE INDEX idx_stats_assessment ON calculated_stats(assessment_id);
CREATE INDEX idx_stats_item ON calculated_stats(item_id);
CREATE INDEX idx_stats_type ON calculated_stats(stat_type);
```

#### Distractor Analysis Table
```sql
CREATE TABLE distractor_analysis (
    distractor_id BIGSERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES items(item_id) ON DELETE CASCADE,
    option_value VARCHAR(10) NOT NULL, -- A, B, C, D
    count_high_performers INTEGER,
    count_low_performers INTEGER,
    difficulty_index NUMERIC(5,4),
    discrimination_index NUMERIC(5,4),
    point_biserial NUMERIC(5,4),
    UNIQUE (item_id, option_value)
);

CREATE INDEX idx_distractor_item ON distractor_analysis(item_id);
```

#### Audit Logs Table
```sql
CREATE TABLE audit_logs (
    log_id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    action VARCHAR(50) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT'
    table_affected VARCHAR(100),
    record_id INTEGER,
    old_value JSONB,
    new_value JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_action ON audit_logs(action);
```

#### Reports Table
```sql
CREATE TABLE reports (
    report_id SERIAL PRIMARY KEY,
    assessment_id INTEGER NOT NULL REFERENCES assessments(assessment_id),
    report_type VARCHAR(50) NOT NULL,
    report_format VARCHAR(10) CHECK (report_format IN ('PDF', 'XLSX', 'CSV', 'JSON')),
    file_path VARCHAR(500),
    generated_by INTEGER REFERENCES users(user_id),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    parameters JSONB -- Store report generation parameters
);

CREATE INDEX idx_reports_assessment ON reports(assessment_id);
CREATE INDEX idx_reports_type ON reports(report_type);
```

### 4.3 Database Indexing Strategy

**Purpose**: Optimize query performance for common operations

1. **Composite Indexes** for frequently queried combinations
2. **Partial Indexes** for filtered queries
3. **GIN Indexes** for JSONB columns

```sql
-- Composite index for filtering students by assessment and school
CREATE INDEX idx_students_assessment_school ON students(assessment_id, school_id);

-- Composite index for responses by assessment (through student)
CREATE INDEX idx_responses_assessment_item ON responses(student_id, item_id);

-- Partial index for active assessments
CREATE INDEX idx_active_assessments ON assessments(assessment_year, state_id) 
WHERE status = 'active';

-- GIN index for JSONB metadata
CREATE INDEX idx_stats_metadata ON calculated_stats USING GIN (stat_metadata);
```

### 4.4 Data Integrity Constraints

1. **Foreign Key Constraints**: Ensure referential integrity
2. **Check Constraints**: Validate data ranges and formats
3. **Unique Constraints**: Prevent duplicate records
4. **Not Null Constraints**: Ensure required fields

### 4.5 Backup and Recovery Strategy

1. **Automated Daily Backups**
   - Full database backup to cloud storage
   - Retention: 30 days rolling
   - Backup verification tests

2. **Point-in-Time Recovery (PITR)**
   - Enable WAL (Write-Ahead Logging)
   - Continuous archiving
   - 7-day recovery window

3. **Disaster Recovery**
   - Geo-redundant backup copies
   - Documented recovery procedures
   - Regular DR drills

---

## 5. Psychometric Calculations

### 5.1 Statistical Functions Library

**Core statistical calculations must be implemented or imported from reliable libraries:**

#### 5.1.1 Descriptive Statistics

```javascript
// Example implementations (Node.js with simple-statistics)
const ss = require('simple-statistics');

function calculateDescriptiveStats(scores) {
    return {
        n: scores.length,
        min: ss.min(scores),
        max: ss.max(scores),
        mean: ss.mean(scores),
        median: ss.median(scores),
        mode: ss.mode(scores),
        stdev: ss.standardDeviation(scores),
        variance: ss.variance(scores),
        skewness: ss.sampleSkewness(scores),
        kurtosis: ss.sampleKurtosis(scores)
    };
}
```

```python
# Example implementations (Python with scipy/numpy)
import numpy as np
from scipy import stats

def calculate_descriptive_stats(scores):
    return {
        'n': len(scores),
        'min': np.min(scores),
        'max': np.max(scores),
        'mean': np.mean(scores),
        'median': np.median(scores),
        'mode': stats.mode(scores, keepdims=True)[0][0],
        'stdev': np.std(scores, ddof=1),
        'variance': np.var(scores, ddof=1),
        'skewness': stats.skew(scores),
        'kurtosis': stats.kurtosis(scores)
    }
```

#### 5.1.2 Item Difficulty

```javascript
function calculateDifficulty(responses) {
    const totalResponses = responses.length;
    const correctResponses = responses.filter(r => r.is_correct).length;
    return correctResponses / totalResponses;
}
```

#### 5.1.3 Discrimination Index

```javascript
function calculateDiscrimination(students, itemId) {
    // Sort students by total score
    students.sort((a, b) => b.total_score - a.total_score);
    
    // Get upper and lower 27%
    const groupSize = Math.floor(students.length * 0.27);
    const upperGroup = students.slice(0, groupSize);
    const lowerGroup = students.slice(-groupSize);
    
    // Count correct in each group for this item
    const upperCorrect = upperGroup.filter(s => 
        s.responses.find(r => r.item_id === itemId && r.is_correct)
    ).length;
    
    const lowerCorrect = lowerGroup.filter(s => 
        s.responses.find(r => r.item_id === itemId && r.is_correct)
    ).length;
    
    return (upperCorrect - lowerCorrect) / groupSize;
}
```

#### 5.1.4 Point-Biserial Correlation

```javascript
const ss = require('simple-statistics');

function calculatePointBiserial(itemScores, totalScores) {
    // itemScores: array of 0/1 (incorrect/correct)
    // totalScores: array of total test scores
    return ss.sampleCorrelation(itemScores, totalScores);
}
```

```python
from scipy.stats import pointbiserialr

def calculate_point_biserial(item_scores, total_scores):
    # item_scores: array of 0/1
    # total_scores: array of total test scores
    correlation, p_value = pointbiserialr(item_scores, total_scores)
    return correlation
```

#### 5.1.5 Cronbach's Alpha

```javascript
function calculateCronbachAlpha(itemScores, totalScores) {
    const K = itemScores[0].length; // Number of items
    const n = itemScores.length; // Number of students
    
    // Calculate variance of each item
    const itemVariances = [];
    for (let i = 0; i < K; i++) {
        const itemColumn = itemScores.map(student => student[i]);
        itemVariances.push(ss.variance(itemColumn));
    }
    
    const sumItemVariances = itemVariances.reduce((a, b) => a + b, 0);
    const totalVariance = ss.variance(totalScores);
    
    return (K / (K - 1)) * (1 - (sumItemVariances / totalVariance));
}
```

```python
import numpy as np
from scipy.stats import cronbach_alpha

def calculate_cronbach_alpha(item_scores):
    # item_scores: 2D array (students x items)
    # Returns Cronbach's alpha
    return cronbach_alpha(item_scores)
```

#### 5.1.6 Standard Error of Measurement

```javascript
function calculateSEM(stdev, reliability) {
    return stdev * Math.sqrt(1 - reliability);
}
```

### 5.2 Calculation Workflow

**Step-by-Step Process for Analysis:**

1. **Data Validation**
   - Verify all student responses are present
   - Check for missing values
   - Validate answer key correctness

2. **Score Calculation**
   - Mark each response as correct/incorrect
   - Calculate total score for each student
   - Identify high/low performer groups

3. **Item-Level Statistics**
   - Calculate difficulty for each item
   - Calculate discrimination for each item
   - Calculate point-biserial correlation
   - Perform distractor analysis

4. **Test-Level Statistics**
   - Calculate descriptive statistics
   - Calculate reliability (Cronbach's α)
   - Calculate SEM

5. **Performance Classification**
   - Assign performance levels based on score thresholds
   - Calculate percentile ranks

6. **Data Storage**
   - Save all calculated statistics to database
   - Timestamp calculations
   - Link to source assessment

### 5.3 Formula Verification

**Critical**: All formulas from the Excel workbook must be verified against calculated results:

**Testing Strategy:**
1. Export sample data from Excel workbook
2. Run calculations through new system
3. Compare results (tolerance: ±0.001 for floating-point)
4. Document any discrepancies
5. Validate with psychometrician

**Excel Formula Mapping Document:**
- Create detailed mapping of each Excel formula to code implementation
- Include cell references and formula logic
- Document any assumptions or special cases

---

## 6. User Interface Specifications

### 6.1 Design Principles

1. **Clarity**: Clear labeling, intuitive navigation
2. **Consistency**: Uniform design patterns across pages
3. **Accessibility**: WCAG 2.1 Level AA compliance
4. **Responsiveness**: Mobile-friendly design
5. **Performance**: Fast load times, optimized data rendering

### 6.2 Page Structure

#### 6.2.1 Login Page
- Username/email and password fields
- "Remember me" checkbox
- "Forgot password" link
- Role-based redirect after login
- Security: Rate limiting, CAPTCHA after failed attempts

#### 6.2.2 Dashboard (Home)
- Welcome message with user name and role
- Quick statistics cards:
  - Total assessments
  - Recent uploads
  - Pending analyses
  - System alerts
- Recent activity feed
- Quick action buttons (Upload Data, View Reports)
- Navigation sidebar with role-based menu items

#### 6.2.3 Assessment Management
**Assessment List View:**
- Filterable table: Assessment type, year, country, status
- Columns: ID, Type, Year, Country, Date, Status, Actions
- Actions: View Details, Analyze, Generate Report, Export, Delete
- Pagination and search

**Assessment Detail View:**
- Header: Assessment metadata (type, year, country, date)
- Tabs:
  - Overview: Summary statistics
  - Students: Student list with scores
  - Items: Item list with statistics
  - Analysis: Detailed psychometric results
  - Reports: Generated reports
  - Settings: Edit assessment metadata

**Upload Data Page:**
- File upload area (drag-and-drop)
- Template download buttons (OERA/OEMA)
- Instructions and format guidelines
- Validation feedback
- Preview before final import
- Confirmation step

#### 6.2.4 Analysis Dashboard

**Test-Level Analysis:**
- Summary statistics cards (mean, stdev, reliability)
- Score distribution histogram
- Performance level distribution (pie chart)
- Reliability indicators with interpretation

**Item-Level Analysis:**
- Sortable/filterable table:
  - Item ID
  - Difficulty
  - Discrimination
  - Point-biserial
  - Flagged status
- Scatter plot: Difficulty vs. Discrimination
- Item flagging system (color-coded: red=poor, yellow=review, green=good)
- Detailed view for each item with distractor analysis

**Distractor Analysis:**
- For each item, show table with columns:
  - Option (A, B, C, D)
  - High Performers Count
  - Low Performers Count
  - Difficulty Index
  - Discrimination Index
  - Functioning status
- Visual indicators for non-functioning distractors

**Comparative Analysis:**
- Multi-select filters: Years, Countries, Schools
- Line charts showing trends
- Side-by-side comparison tables
- Export comparison data

#### 6.2.5 Reporting Center
- Report type selection (Test Summary, Item Analysis, Student Performance, etc.)
- Filter options:
  - Assessment
  - Date range
  - Countries/schools
  - Student demographics
- Preview report
- Download in selected format (PDF, Excel, CSV)
- Schedule recurring reports (optional advanced feature)

#### 6.2.6 User Management (Admin Only)
- User list table:
  - Username, Email, Role, Country, Status, Last Login
  - Actions: Edit, Deactivate, Reset Password
- Add new user form
- Role assignment
- Permission management

#### 6.2.7 System Settings (Admin Only)
- General settings (site name, logo, timezone)
- Assessment year configuration
- Performance level thresholds
- Email notifications settings
- Backup schedule
- System logs viewer

### 6.3 UI Components

#### Reusable Components
1. **DataTable**: Sortable, filterable, paginated tables
2. **StatCard**: Display single statistic with icon and trend
3. **Chart**: Wrapper for various chart types
4. **FileUpload**: Drag-and-drop file upload with validation
5. **Modal**: Reusable modal dialog
6. **Alert**: Success/error/warning notifications
7. **Breadcrumb**: Navigation breadcrumb
8. **LoadingSpinner**: Loading indicator
9. **EmptyState**: Display when no data available
10. **Tooltip**: Contextual help text

#### Form Components
- Text inputs with validation
- Select dropdowns (single/multi-select)
- Date pickers
- Checkboxes and radio buttons
- File upload fields

### 6.4 Color Scheme & Branding

**Primary Colors:**
- Primary: #1976D2 (Blue - OECS brand)
- Secondary: #388E3C (Green - success)
- Accent: #F57C00 (Orange - highlights)

**Status Colors:**
- Success: #4CAF50 (Green)
- Warning: #FFC107 (Amber)
- Error: #F44336 (Red)
- Info: #2196F3 (Blue)

**Neutral Colors:**
- Background: #F5F5F5 (Light gray)
- Card: #FFFFFF (White)
- Text: #212121 (Dark gray)
- Border: #E0E0E0 (Light border)

**Typography:**
- Headings: Roboto Bold
- Body: Roboto Regular
- Monospace: Roboto Mono (for data tables)

### 6.5 Accessibility Features

1. **Keyboard Navigation**: All functions accessible via keyboard
2. **Screen Reader Support**: Proper ARIA labels
3. **Color Contrast**: Minimum 4.5:1 ratio for text
4. **Focus Indicators**: Clear visual focus states
5. **Alt Text**: All images have descriptive alt text
6. **Error Messages**: Clear, specific error descriptions
7. **Form Labels**: All form fields properly labeled

---

## 7. Security & Data Protection

### 7.1 Authentication & Authorization

#### 7.1.1 Authentication
- **JWT (JSON Web Tokens)**: Stateless authentication
- **Token Expiry**: Access tokens valid for 1 hour
- **Refresh Tokens**: Valid for 7 days, stored securely
- **Password Requirements**:
  - Minimum 12 characters
  - Mix of uppercase, lowercase, numbers, special characters
  - Not in common password list
- **Password Hashing**: bcrypt with salt rounds (cost factor 12)
- **Two-Factor Authentication (2FA)**: Optional, recommended for admins

#### 7.1.2 Authorization
- **Role-Based Access Control (RBAC)**
- Permissions matrix:

| Resource | Admin | National Coord. | Regional Officer | Educator | Analyst |
|----------|-------|-----------------|------------------|----------|---------|
| Upload Data | ✓ | ✓ (own country) | ✗ | ✗ | ✗ |
| View Own Country | ✓ | ✓ | ✓ | ✓ | ✓ |
| View All Countries | ✓ | ✗ | ✓ | ✗ | ✓ |
| Manage Users | ✓ | ✗ | ✗ | ✗ | ✗ |
| Delete Data | ✓ | ✗ | ✗ | ✗ | ✗ |
| Generate Reports | ✓ | ✓ | ✓ | ✓ | ✓ |
| Export Identified Data | ✓ | ✓ | ✗ | ✗ | ✗ |

### 7.2 Data Protection

#### 7.2.1 Data Privacy
- **Anonymization**: Option to anonymize student names during upload
- **Pseudonymization**: Replace student IDs with pseudonyms for research
- **Data Minimization**: Collect only necessary information
- **Retention Policy**: Define data retention periods
  - Active assessments: Indefinite
  - Historical data: 10 years
  - Audit logs: 7 years
  - Deleted data: 90-day soft delete before permanent removal

#### 7.2.2 Data Encryption
- **At Rest**: Database encryption (AES-256)
- **In Transit**: TLS 1.3 for all connections
- **File Storage**: Encrypt uploaded files
- **Backups**: Encrypted backup files

#### 7.2.3 Data Access Logging
- Log all data access (SELECT queries)
- Log all modifications (INSERT, UPDATE, DELETE)
- Include: User, timestamp, IP address, action, affected records
- Audit log retention: 7 years

### 7.3 Application Security

#### 7.3.1 Input Validation
- **Client-side**: Immediate feedback, UX improvement
- **Server-side**: Primary defense, cannot be bypassed
- **Validation Rules**:
  - Type checking (string, number, date)
  - Length limits
  - Format validation (email, date, codes)
  - Whitelisting allowed characters
  - Sanitization of user input

#### 7.3.2 Protection Against Common Attacks
- **SQL Injection**: Use parameterized queries, ORM
- **XSS (Cross-Site Scripting)**: Sanitize output, Content Security Policy (CSP)
- **CSRF (Cross-Site Request Forgery)**: CSRF tokens, SameSite cookies
- **Clickjacking**: X-Frame-Options header
- **DDoS**: Rate limiting, CDN protection

#### 7.3.3 Secure Configuration
- Remove default accounts
- Disable unnecessary services
- Keep software updated
- Use environment variables for secrets (not hardcoded)
- Separate development/production environments

### 7.4 Compliance

#### 7.4.1 Data Protection Regulations
- Align with GDPR principles (if applicable)
- Follow OECS data governance policies
- Implement right to access, correct, delete data
- Obtain consent for data usage

#### 7.4.2 Assessment Security
- Protect assessment content (items, answer keys)
- Limit access to authorized personnel
- Watermark downloaded reports
- Log all exports

---

## 8. Implementation Roadmap

### 8.1 Project Phases

#### Phase 1: Planning & Design (Weeks 1-4)
**Objectives:**
- Finalize technical specifications
- Stakeholder requirements gathering
- Database schema design
- UI/UX mockups
- Technology stack selection

**Deliverables:**
- Approved technical specification document
- Database schema diagram
- UI wireframes and mockups
- Project plan with timeline

**Resources:**
- Project manager
- Business analyst
- Database architect
- UI/UX designer

#### Phase 2: Backend Development (Weeks 5-12)
**Objectives:**
- Database setup and migration scripts
- API development (CRUD operations)
- Authentication and authorization
- Statistical calculation modules
- File upload and processing

**Deliverables:**
- Database deployed with schema
- RESTful API endpoints
- User authentication system
- Statistical functions library
- Unit tests for backend

**Resources:**
- Backend developers (2)
- DevOps engineer
- QA tester

#### Phase 3: Frontend Development (Weeks 9-16)
**Objectives:**
- Component library development
- Page layouts and navigation
- Integration with backend API
- Data visualization components
- Form validation

**Deliverables:**
- React application
- Responsive UI components
- Interactive dashboards
- Report generation interface

**Resources:**
- Frontend developers (2)
- UI/UX designer

#### Phase 4: Integration & Testing (Weeks 17-20)
**Objectives:**
- End-to-end integration
- Comprehensive testing (functional, performance, security)
- Bug fixes
- Data migration from Excel (2025 data)
- User acceptance testing (UAT)

**Deliverables:**
- Integrated application
- Test reports
- Bug fix documentation
- Migrated historical data

**Resources:**
- Full development team
- QA testers (2)
- Selected end-users for UAT

#### Phase 5: Deployment & Training (Weeks 21-24)
**Objectives:**
- Production environment setup
- Application deployment
- User training sessions
- Documentation (user manuals, admin guides)
- Handover to support team

**Deliverables:**
- Live production system
- User documentation
- Training materials
- Support procedures

**Resources:**
- DevOps engineer
- Training coordinator
- Technical writer
- Support team

#### Phase 6: Post-Launch Support (Weeks 25-28)
**Objectives:**
- Monitor system performance
- Address user feedback
- Bug fixes and minor enhancements
- Optimization based on usage patterns

**Deliverables:**
- Performance reports
- Issue resolution log
- Enhancement backlog

**Resources:**
- Support team
- Development team (on-call)

### 8.2 Milestones

| Milestone | Target Date | Success Criteria |
|-----------|-------------|------------------|
| Project Kickoff | Week 1 | Stakeholders aligned, team assembled |
| Design Approval | Week 4 | Approved UI/UX and architecture |
| Backend MVP | Week 10 | Core API functional, tested |
| Frontend MVP | Week 14 | Core pages developed, integrated |
| Data Migration Complete | Week 18 | 2025 data successfully imported |
| UAT Sign-off | Week 20 | Users approve functionality |
| Go-Live | Week 23 | System live in production |
| Post-Launch Review | Week 28 | Lessons learned, future roadmap |

### 8.3 Risk Management

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| Scope creep | Medium | High | Clear requirements, change control process |
| Data migration issues | Medium | High | Thorough testing, backup strategy |
| Key personnel unavailable | Low | High | Cross-training, documentation |
| Performance issues at scale | Low | Medium | Load testing, scalable architecture |
| Security breach | Low | Critical | Security audits, penetration testing |
| User adoption resistance | Medium | Medium | Training, change management, pilot program |
| Budget overrun | Low | High | Regular budget reviews, contingency fund |
| Technology changes | Low | Medium | Flexible architecture, avoid over-customization |

---

## 9. Testing Strategy

### 9.1 Testing Types

#### 9.1.1 Unit Testing
- Test individual functions and modules
- Backend: Test each API endpoint
- Frontend: Test React components
- Statistical functions: Verify calculation accuracy
- Target coverage: >80%

#### 9.1.2 Integration Testing
- Test API integration with frontend
- Test database operations
- Test file upload and processing pipeline
- Test report generation workflow

#### 9.1.3 Functional Testing
- Test all user workflows
- Test role-based access control
- Test data validation rules
- Test error handling

#### 9.1.4 Performance Testing
- Load testing: Simulate concurrent users
- Stress testing: Identify breaking points
- Scalability testing: Verify performance with large datasets
- Benchmarks:
  - Page load time < 3 seconds
  - API response time < 1 second
  - Support 100 concurrent users
  - Handle 10,000 student records

#### 9.1.5 Security Testing
- Vulnerability scanning
- Penetration testing
- Authentication and authorization testing
- SQL injection, XSS testing
- Data encryption verification

#### 9.1.6 User Acceptance Testing (UAT)
- Test with real end-users
- Verify business requirements
- Validate workflows
- Gather feedback for improvements

#### 9.1.7 Regression Testing
- Re-test after changes
- Automated test suite
- Ensure no functionality breaks

### 9.2 Test Data

**Sample Datasets:**
- Small dataset: 50 students, 20 items
- Medium dataset: 500 students, 50 items
- Large dataset: 5,000 students, 100 items
- Edge cases: Missing data, invalid responses, extreme scores

**Validation Against Excel:**
- Use 2025 OERA data
- Compare all calculated statistics
- Document discrepancies
- Verify formulas

### 9.3 Testing Tools

- **Unit Testing**: Jest (JavaScript), pytest (Python)
- **Integration Testing**: Supertest (Node.js), httpx (Python)
- **E2E Testing**: Cypress, Playwright
- **Load Testing**: Apache JMeter, k6
- **Security Testing**: OWASP ZAP, Burp Suite
- **Code Quality**: ESLint, SonarQube
- **CI/CD**: GitHub Actions, Jenkins

---

## 10. Maintenance & Support

### 10.1 Support Tiers

#### Tier 1: User Support
- **Responsibilities**: Answer user questions, basic troubleshooting
- **SLA**: Respond within 4 business hours
- **Escalation**: To Tier 2 if technical issue

#### Tier 2: Technical Support
- **Responsibilities**: Debug application issues, data fixes, minor enhancements
- **SLA**: Resolve within 2 business days
- **Escalation**: To Tier 3 for major bugs or architecture changes

#### Tier 3: Development Team
- **Responsibilities**: Major bugs, new feature development, architecture changes
- **SLA**: Critical bugs within 1 day, others as prioritized

### 10.2 Maintenance Activities

#### Regular Maintenance
- Database backups: Daily
- Security patches: Monthly or as needed
- Dependency updates: Quarterly
- Performance monitoring: Continuous
- Log review: Weekly

#### Annual Maintenance
- Full security audit
- Performance optimization review
- User satisfaction survey
- Feature roadmap review

### 10.3 Documentation

**User Documentation:**
- User manual (PDF)
- Video tutorials
- FAQ section
- In-app help tooltips

**Technical Documentation:**
- API documentation (Swagger/OpenAPI)
- Database schema documentation
- Deployment guide
- Troubleshooting guide
- Code comments and README files

### 10.4 Continuous Improvement

**Feedback Channels:**
- In-app feedback form
- User surveys
- Support ticket analysis
- Usage analytics

**Enhancement Process:**
1. Collect feedback
2. Prioritize enhancements
3. Plan development
4. Implement and test
5. Deploy in scheduled releases

**Release Cycle:**
- Major releases: 1-2 per year
- Minor updates: Quarterly
- Hotfixes: As needed

---

## 11. Cost Estimation

### 11.1 Development Costs (One-Time)

| Item | Description | Estimated Cost (USD) |
|------|-------------|----------------------|
| Project Management | 6 months @ $8,000/month | $48,000 |
| Backend Development | 2 developers × 4 months @ $7,000/month | $56,000 |
| Frontend Development | 2 developers × 4 months @ $7,000/month | $56,000 |
| UI/UX Design | 2 months @ $6,000/month | $12,000 |
| QA Testing | 2 testers × 2 months @ $5,000/month | $20,000 |
| DevOps | 3 months @ $7,000/month | $21,000 |
| Documentation & Training | 1 month @ $5,000/month | $5,000 |
| **Total Development** | | **$218,000** |

### 11.2 Infrastructure Costs (Annual)

| Item | Description | Estimated Cost (USD/year) |
|------|-------------|---------------------------|
| Cloud Hosting | Server, database, storage (AWS/Azure) | $6,000 |
| Domain & SSL | Domain registration, SSL certificate | $200 |
| Backup Storage | Off-site backup storage | $500 |
| Monitoring Tools | Application monitoring (optional) | $1,000 |
| **Total Infrastructure** | | **$7,700** |

### 11.3 Operational Costs (Annual)

| Item | Description | Estimated Cost (USD/year) |
|------|-------------|---------------------------|
| Tier 1 Support | Part-time support staff | $20,000 |
| Tier 2/3 Support | On-call developer support | $15,000 |
| Maintenance & Updates | Bug fixes, minor enhancements | $10,000 |
| Security Audits | Annual security audit | $5,000 |
| **Total Operational** | | **$50,000** |

### 11.4 Total Cost of Ownership (3 Years)

| Category | Cost (USD) |
|----------|-----------|
| Development (Year 1) | $218,000 |
| Infrastructure (3 years) | $23,100 |
| Operations (3 years) | $150,000 |
| **Total (3 years)** | **$391,100** |
| **Average Annual** | **$130,367** |

*Note: Costs are estimates and may vary based on location, vendor rates, and specific requirements.*

---

## 12. Conclusion & Next Steps

### 12.1 Summary

This technical specification document provides a comprehensive blueprint for developing the OECS Item Analysis Platform. The proposed solution will:

1. **Modernize** the item analysis process with a web-based application
2. **Preserve** the statistical integrity of existing Excel formulas
3. **Enhance** data security, accessibility, and usability
4. **Enable** longitudinal analysis and cross-country comparisons
5. **Support** evidence-based decision-making for educational improvement

### 12.2 Recommended Next Steps

1. **Stakeholder Review** (Week 1-2)
   - Present this document to OECS Commission leadership
   - Gather feedback and address concerns
   - Obtain approval to proceed

2. **Vendor Selection** (Week 3-4)
   - Issue RFP (Request for Proposal) if outsourcing development
   - Evaluate proposals against this specification
   - Select development partner

3. **Project Kickoff** (Week 5)
   - Assemble project team
   - Confirm budget and timeline
   - Establish communication protocols

4. **Detailed Requirements** (Week 6-8)
   - Conduct workshops with end-users
   - Refine UI/UX designs
   - Finalize database schema

5. **Begin Development** (Week 9)
   - Start Phase 2 (Backend Development)
   - Set up development environment
   - Initialize code repositories

### 12.3 Success Criteria

The project will be considered successful if:

1. All statistical calculations match Excel results within acceptable tolerance
2. System handles peak load of 100 concurrent users
3. 95% uptime achieved
4. User satisfaction rating ≥ 4.0/5.0
5. Data migration from Excel completed without data loss
6. All security requirements met
7. Training completed for all user roles
8. Project delivered within 10% of budget and timeline

### 12.4 Contact Information

**Project Lead:**  
OECS Commission - Education Development and Management Unit  
[Contact details to be added]

**Technical Architect:**  
[To be assigned]

**Document Version Control:**
- Version 1.0: November 2024 - Initial draft
- [Future versions to be tracked here]

---

## Appendices

### Appendix A: Glossary

- **CTT**: Classical Test Theory - traditional psychometric approach
- **Distractor**: Incorrect answer option in multiple-choice item
- **Discrimination Index**: Measure of how well an item differentiates between high and low performers
- **Item Difficulty**: Proportion of students answering item correctly (p-value)
- **MPL**: Minimum Proficiency Level - threshold for SDG 4.1.1a
- **OECS**: Organisation of Eastern Caribbean States
- **OEMA**: OECS Early Mathematics Assessment
- **OERA**: OECS Early Reading Assessment
- **Point-Biserial Correlation**: Correlation between dichotomous item score and continuous total score
- **RBAC**: Role-Based Access Control
- **SDG 4.1.1a**: Sustainable Development Goal indicator for educational quality

### Appendix B: References

1. OECS Curriculum and Assessment Framework (2022)
2. OECS Harmonized Primary Curriculum - Mathematics and Language Arts (2021)
3. UNESCO Institute for Statistics (2019). Global Framework for SDG 4.1.1
4. Australian Council for Educational Research (2018). International best practices in balanced assessment systems
5. RTI International & USAID (2017). EGRA Toolkit for Early Grade Reading Assessment

### Appendix C: Sample API Endpoints

```
Authentication:
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/forgot-password
POST   /api/auth/reset-password

Users:
GET    /api/users
POST   /api/users
GET    /api/users/:id
PUT    /api/users/:id
DELETE /api/users/:id

Assessments:
GET    /api/assessments
POST   /api/assessments
GET    /api/assessments/:id
PUT    /api/assessments/:id
DELETE /api/assessments/:id
POST   /api/assessments/:id/upload
POST   /api/assessments/:id/analyze

Students:
GET    /api/assessments/:id/students
GET    /api/students/:id

Items:
GET    /api/assessments/:id/items
GET    /api/items/:id
GET    /api/items/:id/distractor-analysis

Statistics:
GET    /api/assessments/:id/statistics
GET    /api/assessments/:id/items/:itemId/statistics

Reports:
GET    /api/assessments/:id/reports
POST   /api/assessments/:id/reports/generate
GET    /api/reports/:id/download

Member States:
GET    /api/member-states
GET    /api/member-states/:id

Schools:
GET    /api/schools
GET    /api/schools/:id
```

### Appendix D: Sample Data Structures

**Assessment Upload Format (CSV/Excel):**
```
StudentID, StudentName, Gender, School, Q1, Q2, Q3, Q4, Q5, ...
1509, StudentA, M, School123, C, A, A, B, C, ...
322, StudentB, F, School456, A, , , , , ...
```

**Item Definition Format:**
```json
{
  "item_code": "Q1",
  "item_type": "SR",
  "correct_answer": "C",
  "content_domain": "N",
  "cognitive_level": "literal",
  "max_score": 1
}
```

**Statistical Output Format:**
```json
{
  "assessment_id": 123,
  "test_statistics": {
    "n": 5432,
    "mean": 45.3,
    "median": 46,
    "stdev": 12.4,
    "cronbach_alpha": 0.87,
    "sem": 4.5
  },
  "item_statistics": [
    {
      "item_code": "Q1",
      "difficulty": 0.65,
      "discrimination": 0.42,
      "point_biserial": 0.38,
      "interpretation": "good"
    }
  ]
}
```

---

**END OF DOCUMENT**
