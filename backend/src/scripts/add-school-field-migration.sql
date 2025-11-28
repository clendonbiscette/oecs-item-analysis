-- Migration: Add school and metadata fields to students table
-- This supports school-level analysis and additional demographics

-- Add new columns to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS school VARCHAR(200),
ADD COLUMN IF NOT EXISTS school_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS district VARCHAR(200);

-- Create index for school-based queries
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school);
CREATE INDEX IF NOT EXISTS idx_students_school_type ON students(school_type);
CREATE INDEX IF NOT EXISTS idx_students_district ON students(district);

-- Add comments
COMMENT ON COLUMN students.school IS 'School name or code where student is enrolled';
COMMENT ON COLUMN students.school_type IS 'Type of school (e.g., public, private, denominational)';
COMMENT ON COLUMN students.district IS 'Educational district or region within country';
