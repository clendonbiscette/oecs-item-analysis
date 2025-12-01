-- Migration 004: Add Weighted Scoring Support
-- Description: Add support for weighted items (OEMA) and enhanced demographics
-- Date: 2024-11-29

-- ============================================================================
-- ITEMS TABLE: Add weighted scoring fields
-- ============================================================================

-- Add max_points column (default 1 for backward compatibility with existing MC items)
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS max_points INTEGER DEFAULT 1 CHECK (max_points >= 1 AND max_points <= 10);

-- Add item_type column (MC = Multiple Choice, CR = Constructed Response)
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS item_type VARCHAR(10) DEFAULT 'MC' CHECK (item_type IN ('MC', 'CR'));

COMMENT ON COLUMN items.max_points IS 'Maximum points possible for this item (1 for MC, varies for CR)';
COMMENT ON COLUMN items.item_type IS 'Item type: MC (Multiple Choice) or CR (Constructed Response)';

-- ============================================================================
-- RESPONSES TABLE: Add points_earned for weighted scoring
-- ============================================================================

-- Add points_earned column (for weighted scoring - actual points student received)
ALTER TABLE responses 
ADD COLUMN IF NOT EXISTS points_earned DECIMAL(4,2) DEFAULT 0 CHECK (points_earned >= 0);

COMMENT ON COLUMN responses.points_earned IS 'Actual points earned by student (0 to max_points). For MC: 0 or 1. For CR: 0 to max_points.';
COMMENT ON COLUMN responses.is_correct IS 'For MC items only: TRUE if correct. NULL for CR items.';
COMMENT ON COLUMN responses.response_value IS 'For MC: letter answer (A/B/C/D). For CR: may be NULL (score in points_earned)';

-- ============================================================================
-- STUDENTS TABLE: Add enhanced demographic fields
-- ============================================================================

-- Add school field (primary school identifier)
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS school VARCHAR(200);

-- Add district field (educational district)
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS district VARCHAR(200);

-- Add school_type field (public, private, denominational, etc.)
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS school_type VARCHAR(100);

COMMENT ON COLUMN students.school IS 'School name or code';
COMMENT ON COLUMN students.district IS 'Educational district or region';
COMMENT ON COLUMN students.school_type IS 'Type of school: Public, Private, Denominational, etc.';

-- ============================================================================
-- INDEXES: Add indexes for new columns
-- ============================================================================

-- Index for filtering/grouping by school
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school);

-- Index for filtering/grouping by district
CREATE INDEX IF NOT EXISTS idx_students_district ON students(district);

-- Index for filtering/grouping by school type
CREATE INDEX IF NOT EXISTS idx_students_school_type ON students(school_type);

-- Index for item type queries
CREATE INDEX IF NOT EXISTS idx_items_type ON items(assessment_id, item_type);

-- Index for points_earned queries (for statistics calculations)
CREATE INDEX IF NOT EXISTS idx_responses_points ON responses(item_id, points_earned);

-- ============================================================================
-- UPDATE EXISTING DATA (if any)
-- ============================================================================

-- Update existing MC items to have explicit type
UPDATE items 
SET item_type = 'MC', max_points = 1 
WHERE item_type IS NULL OR max_points IS NULL;

-- Update existing responses to have points_earned based on is_correct
UPDATE responses 
SET points_earned = CASE WHEN is_correct = TRUE THEN 1 ELSE 0 END 
WHERE points_earned IS NULL OR points_earned = 0;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 004 completed successfully';
    RAISE NOTICE 'Added weighted scoring support: max_points, item_type, points_earned';
    RAISE NOTICE 'Added demographic fields: school, district, school_type';
END $$;
