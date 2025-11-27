-- Migration: Add comprehensive user roles and RBAC
-- Purpose: Support role-based access control with admin, national coordinators, and analysts

-- Step 1: Drop existing role constraint and add new one with more roles
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN ('admin', 'national_coordinator', 'analyst', 'user'));

-- Step 2: Add country_id for national coordinators
-- National coordinators are assigned to specific member states
ALTER TABLE users
ADD COLUMN IF NOT EXISTS country_id INTEGER REFERENCES member_states(id);

-- Step 3: Create index on country_id for performance
CREATE INDEX IF NOT EXISTS idx_users_country ON users(country_id);

-- Step 4: Create index on role for permission checks
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Step 5: Update existing users to have 'admin' role if they were 'user'
-- This ensures backwards compatibility
UPDATE users
SET role = 'analyst'
WHERE role = 'user';

-- Comments for documentation
COMMENT ON COLUMN users.role IS 'User role: admin (full access), national_coordinator (country-specific), analyst (read-only)';
COMMENT ON COLUMN users.country_id IS 'For national_coordinator role: restricts access to specific member state data';

-- Role descriptions:
-- admin: Full system access, can manage users, view all data across all countries
-- national_coordinator: Can upload and manage assessments for their assigned country only
-- analyst: Read-only access to all data, can generate reports but cannot upload or modify
