-- OECS Item Analysis Platform - Complete Database Schema
-- This schema includes all migrations integrated for fresh installations
-- Version: 2.0 (synchronized with migrations 001-003)

-- ============================================================================
-- DROP EXISTING TABLES (for clean reinstall)
-- ============================================================================
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS statistics CASCADE;
DROP TABLE IF EXISTS responses CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS assessments CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS member_states CASCADE;

-- ============================================================================
-- MEMBER STATES TABLE (OECS Countries)
-- ============================================================================
CREATE TABLE member_states (
    id SERIAL PRIMARY KEY,
    state_code VARCHAR(3) UNIQUE NOT NULL,
    state_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE member_states IS 'OECS Member States for multi-country assessment management';

-- Seed OECS Member States
INSERT INTO member_states (state_code, state_name) VALUES
    ('ANB', 'Antigua and Barbuda'),
    ('BVI', 'British Virgin Islands'),
    ('DMA', 'Dominica'),
    ('GRN', 'Grenada'),
    ('MSR', 'Montserrat'),
    ('SKN', 'Saint Kitts and Nevis'),
    ('LCA', 'Saint Lucia'),
    ('VCT', 'Saint Vincent and the Grenadines');

-- ============================================================================
-- USERS TABLE (Authentication & Authorization with RBAC)
-- ============================================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'analyst' CHECK (role IN ('admin', 'national_coordinator', 'analyst', 'user')),
    is_active BOOLEAN DEFAULT TRUE,
    country_id INTEGER REFERENCES member_states(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

COMMENT ON COLUMN users.role IS 'User role: admin (full access), national_coordinator (country-specific), analyst (read-only)';
COMMENT ON COLUMN users.country_id IS 'For national_coordinator role: restricts access to specific member state data';

-- ============================================================================
-- ASSESSMENTS TABLE (Test Metadata)
-- ============================================================================
CREATE TABLE assessments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    assessment_year INTEGER NOT NULL CHECK (assessment_year >= 2000 AND assessment_year <= 2100),
    country VARCHAR(100),  -- Legacy field, kept for backwards compatibility
    country_id INTEGER REFERENCES member_states(id),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    student_count INTEGER CHECK (student_count >= 0),
    item_count INTEGER CHECK (item_count >= 0)
);

COMMENT ON COLUMN assessments.country IS 'Legacy text field - use country_id instead';
COMMENT ON COLUMN assessments.country_id IS 'Foreign key to member_states table';

-- ============================================================================
-- ITEMS TABLE (Test Questions/Items)
-- ============================================================================
CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    assessment_id INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
    item_code VARCHAR(20) NOT NULL,
    correct_answer VARCHAR(10),
    content_domain VARCHAR(20),
    cognitive_level VARCHAR(20),
    UNIQUE(assessment_id, item_code)
);

-- ============================================================================
-- STUDENTS TABLE (Test Takers)
-- ============================================================================
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    assessment_id INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
    student_code VARCHAR(100) NOT NULL,
    gender VARCHAR(1) CHECK (gender IN ('M', 'F')),
    country VARCHAR(100),  -- For regional assessments with multiple countries
    total_score DECIMAL(5,2),
    UNIQUE(assessment_id, student_code, country)
);

COMMENT ON COLUMN students.country IS 'Country code for regional assessments (can differ from assessment.country_id)';

-- ============================================================================
-- RESPONSES TABLE (Student Answers)
-- ============================================================================
CREATE TABLE responses (
    id BIGSERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
    response_value VARCHAR(10),
    is_correct BOOLEAN,
    UNIQUE(student_id, item_id)
);

-- ============================================================================
-- STATISTICS TABLE (Cached Psychometric Calculations)
-- ============================================================================
CREATE TABLE statistics (
    id SERIAL PRIMARY KEY,
    assessment_id INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
    stat_type VARCHAR(50) NOT NULL,
    stat_value DECIMAL(10,4),
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE statistics IS 'Cached psychometric statistics for test and item level analysis';
COMMENT ON COLUMN statistics.item_id IS 'NULL for test-level statistics, populated for item-level';

-- ============================================================================
-- AUDIT LOGS TABLE (Compliance & Security Tracking)
-- ============================================================================
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action_type VARCHAR(50) NOT NULL,  -- e.g., 'create', 'update', 'delete', 'login', 'export'
    resource_type VARCHAR(50),          -- e.g., 'assessment', 'user', 'report'
    resource_id INTEGER,
    description TEXT,
    ip_address INET,                    -- PostgreSQL INET type for IP addresses
    user_agent TEXT,
    changes JSONB,                      -- Before/after values for updates
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failure')),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all system actions and data modifications';
COMMENT ON COLUMN audit_logs.action_type IS 'Type of action: create, update, delete, login, logout, export, etc.';
COMMENT ON COLUMN audit_logs.changes IS 'JSON object containing before and after values';
COMMENT ON COLUMN audit_logs.ip_address IS 'Client IP address (INET type supports IPv4 and IPv6)';

-- ============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================

-- User indexes
CREATE INDEX idx_users_country ON users(country_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);  -- For faster login queries

-- Assessment indexes
CREATE INDEX idx_assessments_user ON assessments(uploaded_by);
CREATE INDEX idx_assessments_country ON assessments(country_id);
CREATE INDEX idx_assessments_country_year ON assessments(country_id, assessment_year);
CREATE INDEX idx_assessments_status ON assessments(status);
CREATE INDEX idx_assessments_year ON assessments(assessment_year);

-- Item indexes
CREATE INDEX idx_items_assessment ON items(assessment_id);
CREATE INDEX idx_items_code ON items(assessment_id, item_code);  -- Composite for fast lookups

-- Student indexes
CREATE INDEX idx_students_assessment ON students(assessment_id);
CREATE INDEX idx_students_score ON students(total_score);  -- For percentile calculations

-- Response indexes
CREATE INDEX idx_responses_student ON responses(student_id);
CREATE INDEX idx_responses_item ON responses(item_id);
CREATE INDEX idx_responses_correctness ON responses(item_id, is_correct);  -- For item statistics

-- Statistics indexes
CREATE INDEX idx_statistics_assessment ON statistics(assessment_id);
CREATE INDEX idx_statistics_item ON statistics(item_id);
CREATE INDEX idx_statistics_type ON statistics(assessment_id, stat_type);  -- For fast stat lookups
CREATE INDEX idx_statistics_item_type ON statistics(item_id, stat_type);   -- For item-specific stats

-- Audit log indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(created_at);  -- For time-based queries

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================
-- This schema is now synchronized with all migrations and ready for production use
