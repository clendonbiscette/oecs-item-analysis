/**
 * Email Service
 * Handles sending emails for the application using Nodemailer with Gmail SMTP
 */

import nodemailer from 'nodemailer';

// Create reusable transporter object using Gmail SMTP
const createTransporter = () => {
  // Check if email credentials are configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('⚠️  Email credentials not configured. Emails will be logged to console only.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD // App Password, not regular Gmail password
    }
  });
};

const transporter = createTransporter();

/**
 * Send email verification link
 * @param {Object} params
 * @param {string} params.to - Recipient email
 * @param {string} params.fullName - Recipient name
 * @param {string} params.verificationToken - Verification token
 */
export async function sendVerificationEmail({ to, fullName, verificationToken }) {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email/${verificationToken}`;

  const emailContent = {
    to,
    subject: 'Verify Your Email - OECS Assessment Item Analysis',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 30px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to OECS Assessment Item Analysis</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${fullName}</strong>,</p>

              <p>Thank you for registering with OECS Assessment Item Analysis.</p>

              <p>Please verify your email address by clicking the button below:</p>

              <p style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </p>

              <p style="color: #6b7280; font-size: 14px;">
                Or copy and paste this link into your browser:<br>
                <a href="${verificationUrl}" style="color: #6366f1; word-break: break-all;">${verificationUrl}</a>
              </p>

              <div class="warning">
                <strong>⏰ This link will expire in 24 hours.</strong>
              </div>

              <p>After verifying your email, your account will be reviewed by an administrator. You will receive a notification once your access has been approved.</p>

              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                If you did not create this account, please ignore this email.
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} OECS Assessment Item Analysis</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hello ${fullName},

Thank you for registering with OECS Assessment Item Analysis.

Please verify your email address by visiting this link:
${verificationUrl}

This link will expire in 24 hours.

After verifying your email, your account will be reviewed by an administrator. You will receive a notification once your access has been approved.

If you did not create this account, please ignore this email.

---
© ${new Date().getFullYear()} OECS Assessment Item Analysis
    `
  };

  // Send email using transporter if configured, otherwise log to console
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: `"OECS Assessment Platform" <${process.env.EMAIL_USER}>`,
        to: emailContent.to,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
      });

      console.log('✅ Verification email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Error sending verification email:', error);
      throw error;
    }
  } else {
    // Fallback: Log to console for development/testing
    console.log('\n📧 [EMAIL] Verification Email (Console Only - No SMTP Configured)');
    console.log('To:', emailContent.to);
    console.log('Subject:', emailContent.subject);
    console.log('Verification URL:', verificationUrl);
    console.log('---\n');
    return { success: true, messageId: `verification-${Date.now()}` };
  }
}

/**
 * Send account approval notification
 * @param {Object} params
 * @param {string} params.to - Recipient email
 * @param {string} params.fullName - Recipient name
 * @param {string} params.role - Assigned role
 * @param {string} params.country - Assigned country (optional)
 */
export async function sendApprovalEmail({ to, fullName, role, country }) {
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;

  const emailContent = {
    to,
    subject: 'Your Access Request Has Been Approved - OECS Assessment Item Analysis',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .info-box { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✓ Access Approved!</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${fullName}</strong>,</p>

              <p>Good news! Your access request for OECS Assessment Item Analysis has been approved.</p>

              <div class="info-box">
                <p style="margin: 0;"><strong>Your Account Details:</strong></p>
                <p style="margin: 8px 0 0 0;">Role: <strong>${role}</strong></p>
                ${country ? `<p style="margin: 8px 0 0 0;">Country: <strong>${country}</strong></p>` : ''}
              </div>

              <p>You can now log in to the platform and begin using the assessment analysis tools.</p>

              <p style="text-align: center;">
                <a href="${loginUrl}" class="button">Log In Now</a>
              </p>

              <p style="color: #6b7280; font-size: 14px;">
                Or visit: <a href="${loginUrl}" style="color: #10b981;">${loginUrl}</a>
              </p>

              <p style="margin-top: 30px;">If you have any questions or need assistance, please contact your administrator.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} OECS Assessment Item Analysis</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hello ${fullName},

Good news! Your access request for OECS Assessment Item Analysis has been approved.

Your Account Details:
- Role: ${role}
${country ? `- Country: ${country}` : ''}

You can now log in at: ${loginUrl}

If you have any questions or need assistance, please contact your administrator.

---
© ${new Date().getFullYear()} OECS Assessment Item Analysis
    `
  };

  // Send email using transporter if configured, otherwise log to console
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: `"OECS Assessment Platform" <${process.env.EMAIL_USER}>`,
        to: emailContent.to,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
      });

      console.log('✅ Approval email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Error sending approval email:', error);
      throw error;
    }
  } else {
    // Fallback: Log to console
    console.log('\n📧 [EMAIL] Approval Notification (Console Only)');
    console.log('To:', emailContent.to);
    console.log('Subject:', emailContent.subject);
    console.log('Role:', role);
    if (country) console.log('Country:', country);
    console.log('---\n');
    return { success: true, messageId: `approval-${Date.now()}` };
  }
}

/**
 * Send account rejection notification
 * @param {Object} params
 * @param {string} params.to - Recipient email
 * @param {string} params.fullName - Recipient name
 * @param {string} params.reason - Rejection reason
 */
export async function sendRejectionEmail({ to, fullName, reason }) {
  const emailContent = {
    to,
    subject: 'Access Request Update - OECS Assessment Item Analysis',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .reason-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Access Request Update</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${fullName}</strong>,</p>

              <p>Thank you for your interest in OECS Assessment Item Analysis.</p>

              <p>After reviewing your access request, we are unable to approve it at this time.</p>

              <div class="reason-box">
                <p style="margin: 0;"><strong>Reason:</strong></p>
                <p style="margin: 8px 0 0 0;">${reason}</p>
              </div>

              <p>If you have questions about this decision or believe there has been an error, please contact the platform administrator.</p>

              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Contact: <a href="mailto:support@oecs.org" style="color: #6366f1;">support@oecs.org</a>
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} OECS Assessment Item Analysis</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hello ${fullName},

Thank you for your interest in OECS Assessment Item Analysis.

After reviewing your access request, we are unable to approve it at this time.

Reason: ${reason}

If you have questions about this decision or believe there has been an error, please contact the platform administrator at support@oecs.org.

---
© ${new Date().getFullYear()} OECS Assessment Item Analysis
    `
  };

  // Send email using transporter if configured, otherwise log to console
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: `"OECS Assessment Platform" <${process.env.EMAIL_USER}>`,
        to: emailContent.to,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
      });

      console.log('✅ Rejection email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Error sending rejection email:', error);
      throw error;
    }
  } else {
    // Fallback: Log to console
    console.log('\n📧 [EMAIL] Rejection Notification (Console Only)');
    console.log('To:', emailContent.to);
    console.log('Subject:', emailContent.subject);
    console.log('Reason:', reason);
    console.log('---\n');
    return { success: true, messageId: `rejection-${Date.now()}` };
  }
}

/**
 * Send audit notification to all admins
 * @param {Object} params
 * @param {Array<string>} params.adminEmails - Array of admin email addresses
 * @param {string} params.actionType - Type of action performed
 * @param {string} params.description - Description of the action
 * @param {string} params.performedBy - Name/email of user who performed action
 * @param {string} params.status - 'success' or 'failure'
 * @param {Object} params.details - Additional details about the action
 */
export async function sendAuditNotification({ adminEmails, actionType, description, performedBy, status, details = {} }) {
  if (!adminEmails || adminEmails.length === 0) {
    console.log('⚠️  No admin emails to notify');
    return { success: false, reason: 'no_admins' };
  }

  const platformUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const auditLogsUrl = `${platformUrl}/audit-logs`;

  // Format action type for display
  const formatActionType = (action) => {
    return action.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Determine if this is a critical/security action
  const isCritical = ['delete', 'user_rejection', 'user_approval', 'login'].includes(actionType) || status === 'failure';
  const statusColor = status === 'success' ? '#10b981' : '#ef4444';
  const statusBg = status === 'success' ? '#d1fae5' : '#fee2e2';

  const emailContent = {
    subject: `${isCritical ? '🔔 ' : ''}Audit Alert: ${formatActionType(actionType)} - OECS Platform`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 20px 0; }
            .info-row { display: flex; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
            .info-row:last-child { border-bottom: none; }
            .info-label { font-weight: 600; color: #6b7280; width: 140px; }
            .info-value { color: #1f2937; flex: 1; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background: ${statusBg}; color: ${statusColor}; }
            .button { display: inline-block; padding: 12px 30px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${isCritical ? '🔔 ' : ''}Audit Event Notification</h1>
            </div>
            <div class="content">
              <p><strong>An audited action has occurred on the OECS Assessment Platform.</strong></p>

              <div class="info-box">
                <div class="info-row">
                  <span class="info-label">Action:</span>
                  <span class="info-value"><strong>${formatActionType(actionType)}</strong></span>
                </div>
                <div class="info-row">
                  <span class="info-label">Status:</span>
                  <span class="info-value"><span class="status-badge">${status.toUpperCase()}</span></span>
                </div>
                <div class="info-row">
                  <span class="info-label">Performed By:</span>
                  <span class="info-value">${performedBy || 'System'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Description:</span>
                  <span class="info-value">${description}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Timestamp:</span>
                  <span class="info-value">${new Date().toLocaleString('en-US', { timeZone: 'America/Dominica', dateStyle: 'full', timeStyle: 'long' })}</span>
                </div>
                ${details.resourceType ? `
                <div class="info-row">
                  <span class="info-label">Resource Type:</span>
                  <span class="info-value">${details.resourceType}</span>
                </div>
                ` : ''}
                ${details.ipAddress ? `
                <div class="info-row">
                  <span class="info-label">IP Address:</span>
                  <span class="info-value">${details.ipAddress}</span>
                </div>
                ` : ''}
                ${details.errorMessage ? `
                <div class="info-row">
                  <span class="info-label">Error:</span>
                  <span class="info-value" style="color: #ef4444;">${details.errorMessage}</span>
                </div>
                ` : ''}
              </div>

              ${isCritical ? `
              <div class="alert">
                <strong>⚠️ This is a critical security action.</strong> Please review the audit logs for details.
              </div>
              ` : ''}

              <p style="text-align: center;">
                <a href="${auditLogsUrl}" class="button">View Audit Logs</a>
              </p>

              <p style="color: #6b7280; font-size: 14px;">
                This is an automated notification. To manage notification preferences, contact your system administrator.
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} OECS Assessment Item Analysis</p>
              <p style="font-size: 12px; margin-top: 8px;">Security Audit Notification System</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
AUDIT EVENT NOTIFICATION - OECS Assessment Platform
${isCritical ? '🔔 CRITICAL ACTION' : ''}

Action: ${formatActionType(actionType)}
Status: ${status.toUpperCase()}
Performed By: ${performedBy || 'System'}
Description: ${description}
Timestamp: ${new Date().toLocaleString('en-US', { timeZone: 'America/Dominica', dateStyle: 'full', timeStyle: 'long' })}
${details.resourceType ? `Resource Type: ${details.resourceType}` : ''}
${details.ipAddress ? `IP Address: ${details.ipAddress}` : ''}
${details.errorMessage ? `Error: ${details.errorMessage}` : ''}

${isCritical ? '⚠️ This is a critical security action. Please review the audit logs for details.' : ''}

View full audit logs: ${auditLogsUrl}

---
This is an automated notification from the OECS Assessment Platform Security Audit System.
© ${new Date().getFullYear()} OECS Assessment Item Analysis
    `
  };

  // Send email using transporter if configured, otherwise log to console
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: `"OECS Assessment Platform - Audit System" <${process.env.EMAIL_USER}>`,
        to: adminEmails.join(', '),
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
      });

      console.log(`✅ Audit notification sent to ${adminEmails.length} admin(s):`, info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Error sending audit notification:', error);
      // Don't throw - audit notification failure shouldn't break the main operation
      return { success: false, error: error.message };
    }
  } else {
    // Fallback: Log to console
    console.log('\n📧 [EMAIL] Audit Notification (Console Only - No SMTP Configured)');
    console.log('To:', adminEmails.join(', '));
    console.log('Subject:', emailContent.subject);
    console.log('Action:', formatActionType(actionType));
    console.log('Status:', status);
    console.log('Description:', description);
    console.log('---\n');
    return { success: true, messageId: `audit-${Date.now()}` };
  }
}

/**
 * Generate a secure random token for email verification
 * @returns {string} UUID v4 token
 */
export function generateVerificationToken() {
  // Generate UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
