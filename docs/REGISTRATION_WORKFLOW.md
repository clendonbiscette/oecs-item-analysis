# Registration Workflow Implementation Plan

## Overview
Public registration system with email verification and admin approval for the OECS Item Analysis Platform.

## Workflow Stages

```
┌──────────────┐
│ User Visits  │
│ /register    │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────┐
│ 1. REGISTRATION                      │
│ - Enter: email, password, full name  │
│ - Select: role (dropdown)            │
│ - Enter: country                     │
│ - Provide access justification       │
│ - Submit registration form           │
└──────┬───────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ 2. EMAIL VERIFICATION                │
│ - User receives verification email   │
│ - Clicks link with token             │
│ - Email verified ✓                   │
│ Status: pending_verification →       │
│         pending_approval             │
└──────┬───────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ 3. ADMIN APPROVAL                    │
│ - Admin reviews request in dashboard │
│ - Reviews: role, country, reasoning  │
│ - Admin approves or rejects          │
│ - Can modify role/country if needed  │
│ Status: pending_approval →           │
│         approved/rejected            │
└──────┬───────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ 4. USER ACCESS                       │
│ - User receives approval email       │
│ - Can now login                      │
│ - Has requested role & country       │
└─────────────────────────────────────┘
```

## Database Schema

**New `users` table columns:**
```sql
email_verified BOOLEAN DEFAULT FALSE
email_verification_token VARCHAR(255)
email_verification_expires TIMESTAMP
registration_status VARCHAR(20) DEFAULT 'approved'
  -- Values: 'pending_verification', 'pending_approval', 'approved', 'rejected'
access_justification TEXT
approved_by INTEGER REFERENCES users(id)
approved_at TIMESTAMP
rejected_reason TEXT
```

## Implementation Components

### Backend (Node.js/Express)

#### 1. Registration Endpoint
**POST /api/auth/register**
- **Input:** email, password, fullName, role, country, accessJustification
- Validates email, password strength, full name
- Validates role is one of: 'analyst', 'national_coordinator', 'user' (NOT admin)
- Validates country (optional for analyst/user, required for national_coordinator)
- Creates user with:
  - `is_active = FALSE`
  - `registration_status = 'pending_verification'`
  - `role = <selected role>`
  - `country_id = <selected country>` (if provided)
- Generates email verification token (UUID)
- Sets token expiry (24 hours)
- Sends verification email
- Returns success message

#### 2. Email Verification Endpoint
**GET /api/auth/verify-email/:token**
- Validates token exists and not expired
- Sets `email_verified = TRUE`
- Updates `registration_status = 'pending_approval'`
- Clears verification token
- Returns success page/message

#### 3. Admin Endpoints
**GET /api/admin/pending-users**
- Returns list of users with `registration_status = 'pending_approval'`
- Includes: email, full name, requested role, country, access justification, registration date
- Admin-only (requires `role = 'admin'`)

**POST /api/admin/approve-user/:id**
- **Input:** userId, (optional) role, (optional) countryId
- Validates user is in pending_approval status
- Sets `is_active = TRUE`, `registration_status = 'approved'`
- If role/countryId provided in request, updates them (admin can override user's selection)
- Otherwise keeps user's requested role and country
- Records `approved_by` and `approved_at`
- Sends approval notification email
- Returns success message

**POST /api/admin/reject-user/:id**
- **Input:** userId, rejectedReason
- Sets `registration_status = 'rejected'`
- Records `rejected_reason` (from request body)
- Sends rejection notification email
- Returns success message

### Frontend (React)

#### 1. Registration Page (`/register`)
**Components:**
- Form fields:
  - Email (text input)
  - Password (password input)
  - Confirm Password (password input)
  - Full Name (text input)
  - **Role** (dropdown select)
    - Options: Analyst, National Coordinator, User
    - Help text for each role
  - **Country** (text input or autocomplete)
    - Required for National Coordinator
    - Optional for Analyst/User
  - Access Justification (textarea, 200-500 characters)
- Password strength indicator
- Terms & conditions checkbox
- Submit button

**Validation:**
- Email format validation
- Password requirements (8+ chars, uppercase, lowercase, number)
- Passwords match
- Role selected (cannot select 'admin')
- Country required if role is National Coordinator
- Justification length (200-500 chars)
- All required fields filled

**Success Flow:**
- Shows "Check your email" message
- Displays countdown for resend verification

#### 2. Email Verification Page (`/verify-email/:token`)
**States:**
- Loading (verifying token)
- Success (email verified, pending admin approval)
- Error (invalid/expired token)
- Link to resend verification

**Success Message:**
```
✓ Email Verified Successfully!

Your account has been verified and is pending admin approval.
You will receive an email notification once your access request
has been reviewed.

Typically takes 1-2 business days.
```

#### 3. Admin User Management Tab
**Location:** `/users` (Admin only)

**Sections:**
1. **Pending Approvals** (Badge with count)
   - Table columns:
     - Name
     - Email
     - **Requested Role** (badge)
     - **Requested Country**
     - Justification (truncated, expandable)
     - Date Requested
   - Actions: Approve, Reject buttons

2. **Modal: Approve User**
   - Shows user's requested role and country
   - **Optional Override:**
     - Change Role: (dropdown) admin, national_coordinator, analyst, user
     - Change Country: (dropdown of OECS member states)
   - Note: "User requested: [role] for [country]. You can approve as-is or modify."
   - Confirm button

3. **Modal: Reject User**
   - Shows user's request details
   - Rejection reason textarea (required)
   - Confirm button

4. **All Users** (Existing functionality)
   - Show registration_status as badge
   - Show role and country columns
   - Filter by status, role, country

### Email Templates

#### 1. Verification Email
```
Subject: Verify Your Email - OECS Item Analysis Platform

Hello [Full Name],

Thank you for registering with the OECS Item Analysis Platform.

Please verify your email address by clicking the link below:

[Verify Email Button/Link]

This link will expire in 24 hours.

If you did not create this account, please ignore this email.

---
© [Year] OECS Commission
```

#### 2. Approval Notification
```
Subject: Your Access Request Has Been Approved

Hello [Full Name],

Good news! Your access request for the OECS Item Analysis Platform
has been approved.

Role: [assigned role]
Country: [assigned country, if applicable]

You can now log in at: [Login URL]

---
© [Year] OECS Commission
```

#### 3. Rejection Notification
```
Subject: Access Request Update

Hello [Full Name],

Thank you for your interest in the OECS Item Analysis Platform.

Unfortunately, we are unable to approve your access request at this time.

Reason: [rejection reason]

If you have questions, please contact support@oecs.org.

---
© [Year] OECS Commission
```

## Security Considerations

1. **Email Verification Tokens**
   - Use cryptographically secure random tokens (UUID v4)
   - Expire after 24 hours
   - Single use only
   - Clear token after verification

2. **Rate Limiting**
   - Registration: 3 attempts per IP per hour
   - Email resend: 1 per 5 minutes
   - Approval/rejection: Admin actions logged

3. **Password Security**
   - Minimum 8 characters
   - Require uppercase, lowercase, number
   - Hashed with bcrypt (10 rounds)

4. **Audit Logging**
   - Log all registration attempts
   - Log email verifications
   - Log admin approvals/rejections

## Testing Checklist

### Registration Flow
- [ ] Valid registration creates pending user
- [ ] Duplicate email returns error
- [ ] Weak password rejected
- [ ] Verification email sent
- [ ] User cannot login before verification

### Email Verification
- [ ] Valid token verifies email
- [ ] Expired token (>24h) returns error
- [ ] Invalid token returns error
- [ ] Token single-use only

### Admin Approval
- [ ] Admin sees pending users
- [ ] Approval activates user account
- [ ] Role and country assigned correctly
- [ ] Rejection prevents login
- [ ] Notification emails sent

### Edge Cases
- [ ] Resend verification email
- [ ] User tries to register twice
- [ ] Admin tries to approve rejected user
- [ ] Token expires during verification
- [ ] Network errors during registration

## MVP Simplifications

For initial release, we can simplify:

1. **Email Sending**: Log emails to console instead of actual SMTP
2. **Notifications**: Store in-app notifications instead of email
3. **Justification**: Optional instead of required
4. **Auto-Approval**: Admin can enable auto-approval for specific email domains

## Future Enhancements

1. Magic link login (passwordless)
2. Two-factor authentication (2FA)
3. SSO integration (Google, Microsoft)
4. Batch user import for admins
5. User self-service password reset
6. Account deactivation/reactivation
7. User activity tracking

---

**Status:** Ready for implementation
**Est. Time:** 8-12 hours for full implementation
**Priority:** High (enables self-service user onboarding)
