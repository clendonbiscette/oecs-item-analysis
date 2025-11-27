import jwt from 'jsonwebtoken';
import { query } from '../db.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Require admin role
 */
export const adminOnly = async (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * Require specific role(s)
 * Usage: requireRole('admin', 'national_coordinator')
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role
      });
    }
    next();
  };
};

/**
 * Middleware to enforce country-level access control
 * Admins can access all countries
 * National coordinators can only access their assigned country
 * Analysts have read-only access to all countries
 */
export const enforceCountryAccess = async (req, res, next) => {
  try {
    // Admins and analysts have access to all countries
    if (req.user.role === 'admin' || req.user.role === 'analyst') {
      return next();
    }

    // National coordinators must have a country_id
    if (req.user.role === 'national_coordinator') {
      if (!req.user.country_id) {
        return res.status(403).json({
          error: 'National coordinator must be assigned to a country'
        });
      }

      // If the request is for a specific assessment, check if it belongs to their country
      const assessmentId = req.params.id || req.body.assessmentId;
      if (assessmentId) {
        const result = await query(
          'SELECT country_id FROM assessments WHERE id = $1',
          [assessmentId]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Assessment not found' });
        }

        const assessmentCountryId = result.rows[0].country_id;
        if (assessmentCountryId !== req.user.country_id) {
          return res.status(403).json({
            error: 'Access denied: Assessment belongs to a different country'
          });
        }
      }
    }

    next();
  } catch (error) {
    console.error('Country access enforcement error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Check if user can modify data (not read-only)
 */
export const canModify = (req, res, next) => {
  if (req.user.role === 'analyst') {
    return res.status(403).json({
      error: 'Read-only access: Analysts cannot modify data'
    });
  }
  next();
};

/**
 * Filter assessments query based on user role and country
 */
export const filterByUserCountry = (userId, userRole, userCountryId) => {
  if (userRole === 'admin' || userRole === 'analyst') {
    // Admin and analysts see all assessments
    return { whereClause: '', params: [] };
  } else if (userRole === 'national_coordinator' && userCountryId) {
    // National coordinators only see their country's assessments
    return {
      whereClause: 'WHERE a.country_id = $1',
      params: [userCountryId]
    };
  }
  // Default: no assessments
  return { whereClause: 'WHERE 1=0', params: [] };
};
