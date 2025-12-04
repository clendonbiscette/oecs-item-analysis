import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import { sendVerificationEmail, sendApprovalEmail, sendRejectionEmail, generateVerificationToken } from '../services/emailService.js';

const router = express.Router();

// Rate limiting for login attempts: max 5 attempts per 15 minutes per IP
const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many login attempts, please try again after 15 minutes'
});

// Rate limiting for registration: max 3 attempts per hour per IP
const registerRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many registration attempts, please try again later'
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', loginRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Find user
    const result = await query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      // Log failed login attempt (user not found)
      await req.audit.log({
        userId: null,
        actionType: 'login',
        description: `Failed login attempt for ${email}`,
        status: 'failure',
        errorMessage: 'User not found or inactive'
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      // Log failed login attempt
      await req.audit.logAuth({
        userId: user.id,
        actionType: 'login',
        email: user.email,
        status: 'failure',
        errorMessage: 'Invalid password'
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Log successful login
    await req.audit.logAuth({
      userId: user.id,
      actionType: 'login',
      email: user.email
    });

    // Generate JWT with country_id for national coordinators
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name
    };

    // Include country_id for national coordinators
    if (user.country_id) {
      tokenPayload.country_id = user.country_id;
    }

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '1h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        countryId: user.country_id
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/register
 * Register new user with email verification and admin approval workflow
 */
router.post('/register', registerRateLimiter, async (req, res) => {
  try {
    const { email, password, fullName, country } = req.body;

    // Default role is 'analyst' - admin can change during approval
    const role = 'analyst';

    // Validate required fields
    if (!email || !password || !fullName) {
      return res.status(400).json({
        error: 'Email, password, and full name are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Strong password validation
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    }

    if (!/[a-z]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one lowercase letter' });
    }

    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one number' });
    }

    // Check if user exists
    const existing = await query(
      'SELECT id, registration_status FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      const existingUser = existing.rows[0];
      if (existingUser.registration_status === 'rejected') {
        return res.status(409).json({
          error: 'A previous registration with this email was rejected. Please contact support.'
        });
      }
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Look up country_id if country provided
    let countryId = null;
    if (country) {
      const countryResult = await query(
        'SELECT id FROM member_states WHERE id = $1',
        [country]
      );
      if (countryResult.rows.length > 0) {
        countryId = countryResult.rows[0].id;
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user (inactive, pending verification)
    // Role defaults to 'analyst' - admin can change during approval
    const result = await query(
      `INSERT INTO users (
        email, password_hash, full_name, role, country_id,
        is_active, email_verified, email_verification_token,
        email_verification_expires, registration_status
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, email, full_name, role`,
      [
        email.toLowerCase(),
        passwordHash,
        fullName,
        role, // 'analyst'
        countryId, // Optional country_id from dropdown
        false, // is_active
        false, // email_verified
        verificationToken,
        verificationExpires,
        'pending_verification'
      ]
    );

    const user = result.rows[0];

    // Send verification email
    await sendVerificationEmail({
      to: email.toLowerCase(),
      fullName,
      verificationToken
    });

    res.status(201).json({
      message: 'Registration successful! Please check your email to verify your account.',
      userId: user.id,
      email: user.email
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/verify-email/:token
 * Verify user's email address
 */
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Find user with this verification token
    const result = await query(
      `SELECT id, email, full_name, email_verification_expires, registration_status
       FROM users
       WHERE email_verification_token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid verification token',
        code: 'INVALID_TOKEN'
      });
    }

    const user = result.rows[0];

    // Check if token expired
    if (new Date() > new Date(user.email_verification_expires)) {
      return res.status(400).json({
        error: 'Verification token has expired. Please request a new verification email.',
        code: 'TOKEN_EXPIRED'
      });
    }

    // Check if already verified
    if (user.registration_status !== 'pending_verification') {
      return res.status(400).json({
        error: 'Email already verified',
        code: 'ALREADY_VERIFIED'
      });
    }

    // Update user: mark email as verified, move to pending_approval
    await query(
      `UPDATE users
       SET email_verified = TRUE,
           registration_status = 'pending_approval',
           email_verification_token = NULL,
           email_verification_expires = NULL
       WHERE id = $1`,
      [user.id]
    );

    res.json({
      success: true,
      message: 'Email verified successfully! Your account is pending admin approval.',
      email: user.email
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/resend-verification
 * Resend verification email
 */
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user
    const result = await query(
      `SELECT id, email, full_name, registration_status, email_verified
       FROM users
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      // Don't reveal if email exists or not (security)
      return res.json({
        message: 'If your email is registered and not verified, you will receive a verification email.'
      });
    }

    const user = result.rows[0];

    // Check if already verified
    if (user.email_verified || user.registration_status !== 'pending_verification') {
      return res.json({
        message: 'If your email is registered and not verified, you will receive a verification email.'
      });
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new token
    await query(
      `UPDATE users
       SET email_verification_token = $1,
           email_verification_expires = $2
       WHERE id = $3`,
      [verificationToken, verificationExpires, user.id]
    );

    // Send verification email
    await sendVerificationEmail({
      to: user.email,
      fullName: user.full_name,
      verificationToken
    });

    res.json({
      message: 'If your email is registered and not verified, you will receive a verification email.'
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/reset-password
 * Request password reset (simplified for MVP)
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    
    // Check if user exists
    const result = await query(
      'SELECT id, email FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (result.rows.length === 0) {
      // Don't reveal if email exists or not (security)
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }
    
    // In MVP, just log the reset request
    // In production, would send email with token
    console.log(`Password reset requested for: ${email}`);
    
    res.json({ message: 'If the email exists, a reset link has been sent' });
    
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
