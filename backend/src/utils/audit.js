import { query } from '../db.js';
import { sendAuditNotification } from '../services/emailService.js';

/**
 * Audit logging utility for tracking all system actions
 * Provides comprehensive audit trail for compliance and security monitoring
 */

/**
 * Get all admin email addresses for notifications
 */
async function getAdminEmails() {
  try {
    const result = await query(
      'SELECT email FROM users WHERE role = $1 AND is_active = true',
      ['admin']
    );
    return result.rows.map(row => row.email);
  } catch (error) {
    console.error('Failed to fetch admin emails:', error);
    return [];
  }
}

/**
 * Determine if an action should trigger admin notification
 * Critical actions include: user management, deletions, failed actions, logins
 */
function shouldNotifyAdmins(actionType, status) {
  const notifiableActions = [
    'user_approval',
    'user_rejection',
    'delete',
    'password_reset',
    'role_change',
    'create', // User/assessment creation
    'login', // Failed logins only
    'export', // Data exports
  ];

  // Always notify on failures
  if (status === 'failure') {
    return true;
  }

  // Notify on specific critical actions
  return notifiableActions.includes(actionType);
}

/**
 * Get user info for email notification
 */
async function getUserInfo(userId) {
  if (!userId) return null;

  try {
    const result = await query(
      'SELECT email, full_name FROM users WHERE id = $1',
      [userId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Failed to fetch user info:', error);
    return null;
  }
}

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
    // Insert audit log into database
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

    // Send email notification to admins if this is a critical action
    if (shouldNotifyAdmins(actionType, status)) {
      // Get admin emails and user info in parallel
      const [adminEmails, userInfo] = await Promise.all([
        getAdminEmails(),
        getUserInfo(userId)
      ]);

      if (adminEmails.length > 0) {
        // Send notification asynchronously (don't wait for it to complete)
        sendAuditNotification({
          adminEmails,
          actionType,
          description,
          performedBy: userInfo ? `${userInfo.full_name} (${userInfo.email})` : 'System',
          status,
          details: {
            resourceType,
            ipAddress,
            errorMessage
          }
        }).catch(err => {
          console.error('Failed to send audit notification email:', err);
          // Don't throw - email failure shouldn't break the operation
        });
      }
    }
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
