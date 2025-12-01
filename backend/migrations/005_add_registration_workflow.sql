-- Migration 005: Add Registration Workflow with Email Verification and Admin Approval
-- Adds fields to support public registration with email verification and admin approval flow

-- Add email verification and approval workflow columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP,
ADD COLUMN IF NOT EXISTS registration_status VARCHAR(20) DEFAULT 'approved' CHECK (
  registration_status IN ('pending_verification', 'pending_approval', 'approved', 'rejected')
),
ADD COLUMN IF NOT EXISTS access_justification TEXT,
ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS rejected_reason TEXT;

-- Create index for faster lookups of pending users
CREATE INDEX IF NOT EXISTS idx_users_registration_status ON users(registration_status);
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token);

-- Update existing users to be verified and approved
UPDATE users
SET email_verified = TRUE,
    registration_status = 'approved',
    approved_at = created_at
WHERE email_verified IS NULL OR email_verified = FALSE;

-- Add comments for documentation
COMMENT ON COLUMN users.email_verified IS 'Whether user has verified their email address';
COMMENT ON COLUMN users.email_verification_token IS 'Token sent via email for verification';
COMMENT ON COLUMN users.email_verification_expires IS 'Expiration time for verification token (24 hours)';
COMMENT ON COLUMN users.registration_status IS 'Workflow status: pending_verification → pending_approval → approved/rejected';
COMMENT ON COLUMN users.access_justification IS 'User-provided reason for requesting access';
COMMENT ON COLUMN users.approved_by IS 'Admin user who approved this registration';
COMMENT ON COLUMN users.approved_at IS 'Timestamp when user was approved';
COMMENT ON COLUMN users.rejected_reason IS 'Admin-provided reason for rejection';
