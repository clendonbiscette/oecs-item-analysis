# OECS Item Analysis Platform - Production Database Setup Script (Windows PowerShell)
# This script initializes or updates the production database schema

Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  OECS Assessment Item Analysis - Database Setup             ║" -ForegroundColor Cyan
Write-Host "║                                                              ║" -ForegroundColor Cyan
Write-Host "║  This script will set up your production database schema    ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "❌ ERROR: DATABASE_URL environment variable is not set" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please set it with your production database connection string:"
    Write-Host '  $env:DATABASE_URL="postgresql://user:password@host:port/database"'
    Write-Host ""
    exit 1
}

Write-Host "✓ DATABASE_URL is set" -ForegroundColor Green
Write-Host ""

# Extract database info for display (hide password)
$DbInfo = $env:DATABASE_URL -replace ':([^:@]+)@', ':****@'
Write-Host "Database: $DbInfo"
Write-Host ""

# Confirm before proceeding
$confirm = Read-Host "⚠️  This will create/update database tables. Continue? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Aborted."
    exit 0
}

Write-Host ""
Write-Host "📦 Running database schema..." -ForegroundColor Yellow

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "❌ ERROR: psql command not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install PostgreSQL client tools:"
    Write-Host "  • Download from: https://www.postgresql.org/download/windows/"
    Write-Host "  • Or use pgAdmin to run the schema.sql file manually"
    Write-Host ""
    exit 1
}

# Run the complete schema
try {
    Get-Content "backend\schema.sql" | psql $env:DATABASE_URL

    Write-Host ""
    Write-Host "✅ Database schema setup completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your database now includes:"
    Write-Host "  • member_states table (OECS countries)"
    Write-Host "  • users table (authentication & RBAC)"
    Write-Host "  • assessments table (test metadata)"
    Write-Host "  • items table (questions)"
    Write-Host "  • students table (test takers)"
    Write-Host "  • responses table (student answers)"
    Write-Host "  • statistics table (psychometric calculations)"
    Write-Host "  • audit_logs table (comprehensive audit trail)"
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "  1. Verify schema: curl https://your-domain.com/api/db-status"
    Write-Host "  2. Create admin user via registration workflow"
    Write-Host "  3. Start uploading assessments!"
} catch {
    Write-Host ""
    Write-Host "❌ Database setup failed: $_" -ForegroundColor Red
    exit 1
}
