# OECS Item Analysis Platform - Deployment Guide

## Quick Start Deployment

This guide will help you deploy the OECS Item Analysis Platform to production using Vercel (hosting) and Supabase (database).

---

## Step 1: Setup Supabase Database

### 1.1 Create Supabase Project

1. Go to https://supabase.com/
2. Sign in or create an account
3. Click "New Project"
4. Fill in details:
   - **Name**: `oecs-item-analysis`
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users (e.g., US East)
5. Click "Create new project" (takes 2-3 minutes)

### 1.2 Get Database Connection String

1. In your Supabase project, go to **Settings** > **Database**
2. Scroll to **Connection Info** section
3. Find "Connection string" and select **URI** mode
4. Copy the connection string - it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghijklm.supabase.co:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with the password you created

### 1.3 Run Database Schema

1. In Supabase, go to **SQL Editor**
2. Open `backend/schema.sql` from your local project
3. Copy the entire file contents
4. Paste into the SQL Editor
5. Click **Run** (bottom right)
6. Verify success - you should see "Success. No rows returned"

### 1.4 Run Migrations

1. Still in SQL Editor, run each migration file in order:
   - `backend/migrations/001_add_member_states.sql`
   - `backend/migrations/002_add_user_roles_rbac.sql`
   - `backend/migrations/003_add_audit_logging.sql`

2. For each file: copy contents → paste → run

### 1.5 Seed Initial Data

1. In SQL Editor, run the seed script:
   ```sql
   -- Create default admin user (password: admin123)
   INSERT INTO users (email, password_hash, full_name, role, country_id, is_active)
   VALUES (
     'admin@oecs.org',
     '$2a$10$rN5z6LKlJO7qvCLB7eO7yON.F0lJfxkZvULPn7GKKX1WqUqC.cKOG',
     'System Administrator',
     'admin',
     NULL,
     TRUE
   );
   ```

**IMPORTANT**: Change this password immediately after first login!

---

## Step 2: Deploy Backend to Vercel

### 2.1 Import Project

1. Go to https://vercel.com/
2. Sign in with GitHub
3. Click "Add New..." > "Project"
4. Find and import: `clendonbiscette/oecs-item-analysis`

### 2.2 Configure Backend

1. **Framework Preset**: Other
2. **Root Directory**: Click "Edit" and enter `backend`
3. **Build Command**: Leave empty
4. **Output Directory**: Leave empty
5. **Install Command**: `npm install`

### 2.3 Set Environment Variables

Click "Environment Variables" and add these:

```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-change-this-in-production
JWT_EXPIRY=1h
NODE_ENV=production
FRONTEND_URL=https://your-frontend-url.vercel.app
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

**Notes:**
- Replace `DATABASE_URL` with your Supabase connection string
- Generate a random `JWT_SECRET` (32+ characters)
- We'll update `FRONTEND_URL` after deploying the frontend

4. Click **Deploy**
5. Wait for deployment (2-3 minutes)
6. **Save your backend URL** - it will look like: `https://oecs-item-analysis-backend.vercel.app`

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Add Second Project

1. In Vercel dashboard, click "Add New..." > "Project" again
2. Select the same repository: `clendonbiscette/oecs-item-analysis`

### 3.2 Configure Frontend

1. **Framework Preset**: Vite
2. **Root Directory**: Click "Edit" and enter `frontend`
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. **Install Command**: `npm install`

### 3.3 Set Environment Variable

Click "Environment Variables" and add:

```
VITE_API_URL=https://your-backend-url.vercel.app
```

Replace with your actual backend URL from Step 2.

4. Click **Deploy**
5. Wait for deployment
6. **Save your frontend URL** - it will look like: `https://oecs-item-analysis.vercel.app`

---

## Step 4: Update Backend CORS

Now that we have the frontend URL, update the backend:

1. Go to your backend project in Vercel
2. Go to **Settings** > **Environment Variables**
3. Find `FRONTEND_URL` and click **Edit**
4. Update to your actual frontend URL (from Step 3)
5. Click **Save**
6. Go to **Deployments** tab
7. Click "..." on the latest deployment > **Redeploy**

---

## Step 5: Test the Application

1. Open your frontend URL in a browser
2. You should see the login page
3. Login with:
   - **Email**: `admin@oecs.org`
   - **Password**: `admin123`
4. **IMMEDIATELY change the password** after first login
5. Try uploading a test OERA/OEMA file
6. Verify statistics are generated correctly

---

## Troubleshooting

### Database Connection Errors
- ✅ Verify `DATABASE_URL` is correct
- ✅ Check Supabase project is active
- ✅ Ensure password doesn't have special characters (use letters/numbers only)

### CORS Errors
- ✅ Verify `FRONTEND_URL` matches your frontend domain exactly
- ✅ Include `https://` protocol
- ✅ NO trailing slash
- ✅ Redeploy backend after changing

### Login Fails
- ✅ Check backend logs in Vercel
- ✅ Verify database has users table
- ✅ Run seed script again if needed

### Upload Fails
- ✅ Check file size (Vercel free tier has 4.5MB limit)
- ✅ Verify backend is receiving the file
- ✅ Check backend logs for errors

---

## Post-Deployment Tasks

### 1. Change Admin Password
1. Login as admin
2. Go to Users page
3. Edit admin user
4. Set a new strong password

### 2. Add Additional Users
1. Go to Users page
2. Click "Add User"
3. Fill in details and assign appropriate role

### 3. Configure Email (Optional)
- Set up SMTP for password resets
- Configure in backend environment variables

### 4. Custom Domain (Optional)
1. In Vercel project settings
2. Go to Domains
3. Add your custom domain
4. Update DNS records as instructed

---

## Environment Variables Reference

### Backend
| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Supabase PostgreSQL connection | `postgresql://postgres:...` |
| `JWT_SECRET` | Secret for JWT tokens (32+ chars) | `abc123...xyz789` |
| `JWT_EXPIRY` | Token expiration time | `1h` or `7d` |
| `NODE_ENV` | Environment | `production` |
| `FRONTEND_URL` | Frontend domain (for CORS) | `https://app.example.com` |
| `MAX_FILE_SIZE` | Max upload size in bytes | `10485760` (10MB) |
| `UPLOAD_DIR` | Upload directory path | `./uploads` |

### Frontend
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://api.example.com` |

---

## Monitoring and Maintenance

### View Logs
- **Backend**: Vercel Dashboard > Your Project > Logs
- **Database**: Supabase Dashboard > Logs

### Database Backups
- Supabase automatically backs up your database daily
- You can also create manual backups in Supabase Dashboard

### Check Application Health
- Monitor error rates in Vercel Analytics
- Check database usage in Supabase Dashboard
- Set up alerts for critical errors

---

## Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Repository**: https://github.com/clendonbiscette/oecs-item-analysis

---

## Summary Checklist

- [  ] Supabase project created
- [  ] Database schema installed
- [  ] Migrations run
- [  ] Admin user created
- [  ] Backend deployed to Vercel
- [  ] Frontend deployed to Vercel
- [  ] CORS configured
- [  ] Test login successful
- [  ] Admin password changed
- [  ] Test file upload successful

