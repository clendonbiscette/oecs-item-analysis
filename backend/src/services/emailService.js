/**
 * Email Service
 * Handles sending emails for the application
 *
 * MVP Implementation: Logs emails to console
 * Production: Replace with actual SMTP service (e.g., SendGrid, AWS SES, Mailgun)
 */

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

  // MVP: Log to console (replace with actual email sending in production)
  console.log('\n📧 [EMAIL] Verification Email');
  console.log('To:', emailContent.to);
  console.log('Subject:', emailContent.subject);
  console.log('Verification URL:', verificationUrl);
  console.log('---\n');

  return { success: true, messageId: `verification-${Date.now()}` };
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

  // MVP: Log to console
  console.log('\n📧 [EMAIL] Approval Notification');
  console.log('To:', emailContent.to);
  console.log('Subject:', emailContent.subject);
  console.log('Role:', role);
  if (country) console.log('Country:', country);
  console.log('---\n');

  return { success: true, messageId: `approval-${Date.now()}` };
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

  // MVP: Log to console
  console.log('\n📧 [EMAIL] Rejection Notification');
  console.log('To:', emailContent.to);
  console.log('Subject:', emailContent.subject);
  console.log('Reason:', reason);
  console.log('---\n');

  return { success: true, messageId: `rejection-${Date.now()}` };
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
