-- Migration: Add Audit Logging System
-- Purpose: Track all user actions and data modifications for compliance and security
-- Date: 2025-11-26

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action_type VARCHAR(50) NOT NULL,  -- e.g., 'create', 'update', 'delete', 'login', 'logout', 'export'
  resource_type VARCHAR(50),          -- e.g., 'assessment', 'user', 'report'
  resource_id INTEGER,                -- ID of the affected resource
  description TEXT,                   -- Human-readable description of the action
  ip_address INET,                    -- IP address of the user
  user_agent TEXT,                    -- Browser/client information
  changes JSONB,                      -- Before/after values for updates
  status VARCHAR(20) DEFAULT 'success', -- 'success' or 'failure'
  error_message TEXT,                 -- Error details if status is 'failure'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Add comment to table
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all system actions and data modifications';
COMMENT ON COLUMN audit_logs.action_type IS 'Type of action performed: create, update, delete, login, logout, export, etc.';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource affected: assessment, user, report, etc.';
COMMENT ON COLUMN audit_logs.changes IS 'JSON object containing before and after values for data modifications';
COMMENT ON COLUMN audit_logs.status IS 'Whether the action succeeded or failed';
