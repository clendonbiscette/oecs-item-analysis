import { query } from '../db.js';

/**
 * Audit logging utility for tracking all system actions
 * Provides comprehensive audit trail for compliance and security monitoring
 */

/**
 * Log an audit event
 * @param {Object} params - Audit log parameters
 * @param {number} params.userId - ID of the user performing the action
 * @param {string} params.actionType - Type of action (create, update, delete, login, logout, export, etc.)
 * @param {string} params.resourceType - Type of resource affected (assessment, user, report, etc.)
 * @param {number} params.resourceId - ID of the affected resource
 * @param {string} params.description - Human-readable description
 * @param {string} params.ipAddress - IP address of the user
 * @param {string} params.userAgent - Browser/client information
 * @param {Object} params.changes - Before/after values for updates
 * @param {string} params.status - 'success' or 'failure'
 * @param {string} params.errorMessage - Error details if status is 'failure'
 */
export async function logAudit({
  userId,
  actionType,
  resourceType = null,
  resourceId = null,
  description,
  ipAddress = null,
  userAgent = null,
  changes = null,
  status = 'success',
  errorMessage = null,
}) {
  try {
    await query(
      `INSERT INTO audit_logs
       (user_id, action_type, resource_type, resource_id, description,
        ip_address, user_agent, changes, status, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        userId,
        actionType,
        resourceType,
        resourceId,
        description,
        ipAddress,
        userAgent,
        changes ? JSON.stringify(changes) : null,
        status,
        errorMessage,
      ]
    );
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging failure shouldn't break the main operation
  }
}

/**
 * Log user authentication events
 */
export async function logAuth({ userId, actionType, email, ipAddress, userAgent, status = 'success', errorMessage = null }) {
  return logAudit({
    userId,
    actionType, // 'login' or 'logout'
    description: `User ${email} ${actionType === 'login' ? 'logged in' : 'logged out'}`,
    ipAddress,
    userAgent,
    status,
    errorMessage,
  });
}

/**
 * Log assessment-related actions
 */
export async function logAssessment({ userId, actionType, assessmentId, assessmentName, ipAddress, userAgent, changes = null }) {
  const actionDescriptions = {
    create: `Created assessment "${assessmentName}"`,
    upload: `Uploaded data for assessment "${assessmentName}"`,
    update: `Updated assessment "${assessmentName}"`,
    delete: `Deleted assessment "${assessmentName}"`,
    export: `Exported assessment "${assessmentName}"`,
    view: `Viewed assessment "${assessmentName}"`,
  };

  return logAudit({
    userId,
    actionType,
    resourceType: 'assessment',
    resourceId: assessmentId,
    description: actionDescriptions[actionType] || `${actionType} assessment "${assessmentName}"`,
    ipAddress,
    userAgent,
    changes,
  });
}

/**
 * Log user management actions
 */
export async function logUserManagement({
  userId,
  actionType,
  targetUserId,
  targetUserEmail,
  ipAddress,
  userAgent,
  changes = null
}) {
  const actionDescriptions = {
    create: `Created user account for ${targetUserEmail}`,
    update: `Updated user account ${targetUserEmail}`,
    delete: `Deactivated user account ${targetUserEmail}`,
    password_reset: `Reset password for user ${targetUserEmail}`,
    role_change: `Changed role for user ${targetUserEmail}`,
  };

  return logAudit({
    userId,
    actionType,
    resourceType: 'user',
    resourceId: targetUserId,
    description: actionDescriptions[actionType] || `${actionType} user ${targetUserEmail}`,
    ipAddress,
    userAgent,
    changes,
  });
}

/**
 * Log report generation
 */
export async function logReport({ userId, reportType, assessmentId, assessmentName, ipAddress, userAgent }) {
  return logAudit({
    userId,
    actionType: 'export',
    resourceType: 'report',
    resourceId: assessmentId,
    description: `Generated ${reportType} report for assessment "${assessmentName}"`,
    ipAddress,
    userAgent,
  });
}

/**
 * Log failed actions
 */
export async function logFailure({ userId, actionType, resourceType, description, ipAddress, userAgent, errorMessage }) {
  return logAudit({
    userId,
    actionType,
    resourceType,
    description,
    ipAddress,
    userAgent,
    status: 'failure',
    errorMessage,
  });
}

/**
 * Get client IP address from request
 */
export function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         null;
}

/**
 * Get user agent from request
 */
export function getUserAgent(req) {
  return req.headers['user-agent'] || null;
}

/**
 * Middleware to attach audit helpers to request object
 */
export function auditMiddleware(req, res, next) {
  req.audit = {
    log: (params) => logAudit({
      ...params,
      userId: req.user?.id,
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
    }),
    logAuth: (params) => logAuth({
      ...params,
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
    }),
    logAssessment: (params) => logAssessment({
      ...params,
      userId: req.user?.id,
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
    }),
    logUserManagement: (params) => logUserManagement({
      ...params,
      userId: req.user?.id,
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
    }),
    logReport: (params) => logReport({
      ...params,
      userId: req.user?.id,
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
    }),
    logFailure: (params) => logFailure({
      ...params,
      userId: req.user?.id,
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
    }),
  };
  next();
}
