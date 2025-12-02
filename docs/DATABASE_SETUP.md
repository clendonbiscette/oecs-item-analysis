# Production Database Setup Guide

## Problem: "Failed to display..." / 500 Errors

If you're seeing errors like:
- `GET /api/member-states 500 (Internal Server Error)`
- "Failed to display member states"
- "Failed to display assessments"

**This means your production database schema hasn't been initialized.**

---

## Solution: Initialize Your Production Database

### Step 1: Check Database Status

Visit your database status endpoint:
```
https://your-vercel-domain.vercel.app/api/db-status
```

This will show you:
- Whether the database is connected
- Which tables exist
- Which tables are missing
- Row counts for existing tables

**Expected Response (Healthy):**
```json
{
  "connected": true,
  "status": "ok",
  "tables": {
    "member_states": { "exists": true, "count": 8 },
    "users": { "exists": true, "count": 1 },
    "assessments": { "exists": true, "count": 0 },
    ...
  },
  "message": "Database is properly configured"
}
```

**Response with Missing Tables:**
```json
{
  "connected": true,
  "status": "incomplete",
  "missingTables": ["member_states", "users", ...],
  "message": "Database schema incomplete. Missing tables: ..."
}
```

---

### Step 2: Get Your Production Database URL

You need your production PostgreSQL connection string. This depends on where your database is hosted:

#### Option A: Vercel Postgres
```bash
# Get from Vercel dashboard
# Storage → Postgres → .env.local → POSTGRES_URL
```

#### Option B: Supabase
```bash
# Get from Supabase dashboard
# Settings → Database → Connection string → URI
```

#### Option C: Neon
```bash
# Get from Neon console
# Connection Details → Connection string
```

#### Option D: AWS RDS
```bash
# Format: postgresql://username:password@host:5432/database
```

---

### Step 3: Run Database Setup Script

#### Method 1: Automated Script (Recommended)

**On Mac/Linux:**
```bash
# Set your database URL
export DATABASE_URL='postgresql://user:password@host:port/database'

# Make script executable
chmod +x backend/scripts/setup-production-db.sh

# Run the script
./backend/scripts/setup-production-db.sh
```

**On Windows (PowerShell):**
```powershell
# Set your database URL
$env:DATABASE_URL="postgresql://user:password@host:port/database"

# Run the script
.\backend\scripts\setup-production-db.ps1
```

#### Method 2: Manual psql Command

```bash
# Set your database URL
export DATABASE_URL='postgresql://user:password@host:port/database'

# Run schema directly
psql "$DATABASE_URL" < backend/schema.sql
```

#### Method 3: Using pgAdmin or Database GUI

1. Open pgAdmin, DBeaver, or your preferred database GUI
2. Connect to your production database
3. Open `backend/schema.sql`
4. Execute the entire file

---

### Step 4: Verify Setup

After running the schema, verify it worked:

**Option A: Check via API**
```bash
curl https://your-vercel-domain.vercel.app/api/db-status
```

**Option B: Check via Database**
```sql
-- Connect to your database and run:
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- You should see:
--   member_states
--   users
--   assessments
--   items
--   students
--   responses
--   statistics
--   audit_logs
```

---

### Step 5: Create Your First Admin User

1. Visit your app: `https://your-vercel-domain.vercel.app`
2. Click "Create Account"
3. Fill in registration form:
   - Email
   - Password (8+ chars, uppercase, lowercase, number)
   - Full Name
   - **Role: Admin**
   - Access Justification
4. Check email for verification link
5. Click verification link
6. Wait for admin approval (you'll need to manually approve yourself in database)

#### Manual Admin Approval (First User Only)

Since you don't have an admin yet, approve yourself manually:

```sql
-- Connect to your database and run:
UPDATE users
SET registration_status = 'approved',
    is_active = TRUE,
    approved_at = NOW()
WHERE email = 'your-email@example.com';
```

---

## Troubleshooting

### Error: "psql: command not found"

**Mac:**
```bash
brew install postgresql
```

**Windows:**
- Download PostgreSQL from https://www.postgresql.org/download/windows/
- Or use pgAdmin GUI method instead

**Linux:**
```bash
sudo apt-get install postgresql-client
```

### Error: "connection refused"

- Check your DATABASE_URL is correct
- Verify database is accessible from your location
- Check firewall settings
- Ensure IP is whitelisted (Supabase, Neon, AWS RDS)

### Error: "database does not exist"

Create the database first:
```bash
# Connect to default postgres database
psql "postgresql://user:password@host:port/postgres"

# Create your database
CREATE DATABASE your_database_name;

# Exit and reconnect to your new database
\q
```

### Error: Tables already exist

If you get "table already exists" errors, you have two options:

**Option A: Drop and recreate (⚠️ DELETES ALL DATA)**
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
-- Then run schema.sql again
```

**Option B: Run migrations instead**
```bash
# Run each migration in order
psql "$DATABASE_URL" < backend/migrations/001_add_member_states.sql
psql "$DATABASE_URL" < backend/migrations/002_add_user_roles_rbac.sql
psql "$DATABASE_URL" < backend/migrations/003_add_audit_logging.sql
psql "$DATABASE_URL" < backend/migrations/004_add_weighted_scoring.sql
psql "$DATABASE_URL" < backend/migrations/005_add_registration_workflow.sql
```

---

## Database Schema Overview

After setup, you'll have these tables:

| Table | Purpose | Rows (Initial) |
|-------|---------|----------------|
| **member_states** | OECS countries | 8 |
| **users** | User accounts with RBAC | 0 |
| **assessments** | Test metadata | 0 |
| **items** | Test questions | 0 |
| **students** | Test takers | 0 |
| **responses** | Student answers | 0 |
| **statistics** | Psychometric calculations | 0 |
| **audit_logs** | Comprehensive audit trail | 0 |

### Member States (Pre-populated)

The schema automatically inserts 8 OECS member states:
1. Antigua and Barbuda (ANB)
2. British Virgin Islands (BVI)
3. Dominica (DMA)
4. Grenada (GRN)
5. Montserrat (MSR)
6. Saint Kitts and Nevis (SKN)
7. Saint Lucia (LCA)
8. Saint Vincent and the Grenadines (VCT)

---

## Security Notes

⚠️ **Never commit your DATABASE_URL to Git!**

- Always use environment variables
- Add `.env` to `.gitignore`
- Use Vercel environment variables for production
- Rotate credentials if accidentally exposed

---

## Need Help?

If you're still experiencing issues:

1. Check `/api/db-status` endpoint output
2. Check Vercel function logs
3. Check database connection from your local machine:
   ```bash
   psql "$DATABASE_URL" -c "SELECT NOW();"
   ```
4. Verify environment variables in Vercel dashboard
5. Check database provider's status page

---

## Maintenance

### Backing Up Production Data

```bash
# Full backup
pg_dump "$DATABASE_URL" > backup.sql

# Data only (no schema)
pg_dump "$DATABASE_URL" --data-only > data-backup.sql
```

### Restoring from Backup

```bash
psql "$DATABASE_URL" < backup.sql
```

---

**Updated:** 2025-12-02
**Version:** 1.0
