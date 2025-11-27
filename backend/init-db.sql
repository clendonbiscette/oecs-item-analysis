-- Create database if it doesn't exist
SELECT 'CREATE DATABASE oecs_analysis'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'oecs_analysis')\gexec

-- Connect to the database
\c oecs_analysis

-- Drop existing tables if they exist
DROP TABLE IF EXISTS statistics CASCADE;
DROP TABLE IF EXISTS responses CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS assessments CASCADE;
DROP TABLE IF EXISTS users CASCADE;

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

-- Create indexes
CREATE INDEX idx_responses_student ON responses(student_id);
CREATE INDEX idx_responses_item ON responses(item_id);
CREATE INDEX idx_statistics_assessment ON statistics(assessment_id);
CREATE INDEX idx_statistics_item ON statistics(item_id);
CREATE INDEX idx_assessments_user ON assessments(uploaded_by);
CREATE INDEX idx_items_assessment ON items(assessment_id);
CREATE INDEX idx_students_assessment ON students(assessment_id);
