-- Migration 006: Add DIF Statistics Table
-- Purpose: Store pre-calculated DIF statistics for Gender and Percentile analysis
-- Date: 2025-12-02

-- Create table for storing Differential Item Functioning (DIF) statistics
CREATE TABLE dif_statistics (
    id BIGSERIAL PRIMARY KEY,
    assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    dif_type VARCHAR(50) NOT NULL, -- 'gender', 'percentile', 'country', 'country_gender'
    group_a VARCHAR(100), -- e.g., 'M' for male, 'P1' for first percentile, 'GRN' for Grenada
    group_b VARCHAR(100), -- e.g., 'F' for female, 'P5' for fifth percentile, 'OECS' for OECS average
    difficulty_a DECIMAL(6,4), -- Difficulty for group A
    difficulty_b DECIMAL(6,4), -- Difficulty for group B
    dif_score DECIMAL(6,4), -- difference (difficulty_a - difficulty_b)
    dif_classification VARCHAR(30), -- 'Negligible', 'Slight to Moderate', 'Moderate to Large'
    sample_size_a INTEGER, -- Number of students in group A
    sample_size_b INTEGER, -- Number of students in group B
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assessment_id, item_id, dif_type, group_a, group_b)
);

-- Indexes for fast retrieval
CREATE INDEX idx_dif_statistics_assessment ON dif_statistics(assessment_id);
CREATE INDEX idx_dif_statistics_item ON dif_statistics(item_id);
CREATE INDEX idx_dif_statistics_type ON dif_statistics(assessment_id, dif_type);
CREATE INDEX idx_dif_statistics_item_type ON dif_statistics(item_id, dif_type);

-- Comment for documentation
COMMENT ON TABLE dif_statistics IS 'Stores Differential Item Functioning (DIF) analysis results comparing item performance across demographic groups';
COMMENT ON COLUMN dif_statistics.dif_type IS 'Type of DIF analysis: gender, percentile, country, or country_gender';
COMMENT ON COLUMN dif_statistics.group_a IS 'First comparison group identifier (e.g., M, P1, GRN)';
COMMENT ON COLUMN dif_statistics.group_b IS 'Second comparison group identifier (e.g., F, OECS, P5)';
COMMENT ON COLUMN dif_statistics.dif_score IS 'DIF score calculated as difficulty_a - difficulty_b';
COMMENT ON COLUMN dif_statistics.dif_classification IS 'Classification of DIF magnitude based on thresholds';
