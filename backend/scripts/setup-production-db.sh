#!/bin/bash

# OECS Item Analysis Platform - Production Database Setup Script
# This script initializes or updates the production database schema

set -e  # Exit on error

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  OECS Assessment Item Analysis - Database Setup             ║"
echo "║                                                              ║"
echo "║  This script will set up your production database schema    ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo ""
    echo "Please set it with your production database connection string:"
    echo "  export DATABASE_URL='postgresql://user:password@host:port/database'"
    echo ""
    exit 1
fi

echo "✓ DATABASE_URL is set"
echo ""

# Extract database info for display (hide password)
DB_INFO=$(echo $DATABASE_URL | sed -E 's/:([^:@]+)@/:****@/')
echo "Database: $DB_INFO"
echo ""

# Confirm before proceeding
read -p "⚠️  This will create/update database tables. Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "📦 Running database schema..."

# Run the complete schema
psql "$DATABASE_URL" < backend/schema.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database schema setup completed successfully!"
    echo ""
    echo "Your database now includes:"
    echo "  • member_states table (OECS countries)"
    echo "  • users table (authentication & RBAC)"
    echo "  • assessments table (test metadata)"
    echo "  • items table (questions)"
    echo "  • students table (test takers)"
    echo "  • responses table (student answers)"
    echo "  • statistics table (psychometric calculations)"
    echo "  • audit_logs table (comprehensive audit trail)"
    echo ""
    echo "Next steps:"
    echo "  1. Verify schema: curl https://your-domain.com/api/db-status"
    echo "  2. Create admin user via registration workflow"
    echo "  3. Start uploading assessments!"
else
    echo ""
    echo "❌ Database setup failed. Please check the error messages above."
    exit 1
fi
