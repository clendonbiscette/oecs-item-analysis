-- Migration: Add Member States table and formalize country relationships
-- Purpose: Support multi-country OECS deployment with proper foreign keys

-- Step 1: Create Member States table
CREATE TABLE IF NOT EXISTS member_states (
    id SERIAL PRIMARY KEY,
    state_code VARCHAR(3) UNIQUE NOT NULL,
    state_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Seed OECS Member States data
INSERT INTO member_states (state_code, state_name) VALUES
    ('ANB', 'Antigua and Barbuda'),
    ('BVI', 'British Virgin Islands'),
    ('DMA', 'Dominica'),
    ('GRN', 'Grenada'),
    ('MSR', 'Montserrat'),
    ('SKN', 'Saint Kitts and Nevis'),
    ('LCA', 'Saint Lucia'),
    ('VCT', 'Saint Vincent and the Grenadines')
ON CONFLICT (state_code) DO NOTHING;

-- Step 3: Add country_id column to assessments (nullable initially for migration)
ALTER TABLE assessments
ADD COLUMN IF NOT EXISTS country_id INTEGER REFERENCES member_states(id);

-- Step 4: Migrate existing country data
-- Map existing country text to member_states IDs
UPDATE assessments
SET country_id = (
    SELECT id FROM member_states
    WHERE state_name = assessments.country
       OR state_code = assessments.country
    LIMIT 1
)
WHERE country IS NOT NULL;

-- Step 5: Create index on country_id
CREATE INDEX IF NOT EXISTS idx_assessments_country ON assessments(country_id);

-- Note: We're keeping the old 'country' VARCHAR column for now to ensure backwards compatibility
-- It can be dropped in a future migration once all data is verified

-- Add composite index for multi-year queries
CREATE INDEX IF NOT EXISTS idx_assessments_country_year
ON assessments(country_id, assessment_year);

COMMENT ON TABLE member_states IS 'OECS Member States for multi-country assessment management';
COMMENT ON COLUMN assessments.country_id IS 'Foreign key to member_states table';
