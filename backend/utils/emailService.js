const nodemailer = require('nodemailer');

/**
 * Email service for CivicTrack application
 * Handles sending emails for notifications, user registration, and system messages
 */

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

/**
 * Send welcome email to new user
 * @param {string} email - User's email address
 * @param {string} username - User's username
 * @returns {Promise<Object>} - Email send result
 */
const sendWelcomeEmail = async (email, username) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"CivicTrack" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to CivicTrack! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Welcome to CivicTrack!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Empowering citizens to make their communities better</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${username}! 👋</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Thank you for joining CivicTrack! You're now part of a community dedicated to improving our neighborhoods and cities.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">What you can do now:</h3>
              <ul style="color: #666; line-height: 1.8;">
                <li>📸 Report local issues with photos and descriptions</li>
                <li>📍 Track issues in your neighborhood</li>
                <li>💬 Comment and upvote on community issues</li>
                <li>🔔 Get notified when issues are resolved</li>
                <li>🗺️ View issues on an interactive map</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Start Reporting Issues
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              If you have any questions, feel free to reach out to our support team.
            </p>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2024 CivicTrack. All rights reserved.</p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    throw error;
  }
};

/**
 * Send issue status update notification
 * @param {string} email - User's email address
 * @param {string} username - User's username
 * @param {Object} issue - Issue object
 * @param {string} status - New status
 * @returns {Promise<Object>} - Email send result
 */
const sendIssueStatusUpdateEmail = async (email, username, issue, status) => {
  try {
    const transporter = createTransporter();
    
    const statusColors = {
      'Reported': '#ff6b6b',
      'In Progress': '#4ecdc4',
      'Resolved': '#45b7d1',
      'Rejected': '#96ceb4'
    };

    const mailOptions = {
      from: `"CivicTrack" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Issue Update: ${issue.title} - ${status}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">Issue Status Update</h1>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${username}! 👋</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${statusColors[status]}">
              <h3 style="color: #333; margin-top: 0;">Issue: ${issue.title}</h3>
              <p style="color: #666; margin: 10px 0;"><strong>Category:</strong> ${issue.category}</p>
              <p style="color: #666; margin: 10px 0;"><strong>Location:</strong> ${issue.location.address}</p>
              <p style="color: #666; margin: 10px 0;"><strong>New Status:</strong> <span style="color: ${statusColors[status]}; font-weight: bold;">${status}</span></p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/issues/${issue._id}" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Issue Details
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Thank you for helping make our community better!
            </p>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2024 CivicTrack. All rights reserved.</p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Issue status update email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Failed to send issue status update email:', error);
    throw error;
  }
};

/**
 * Send password reset email
 * @param {string} email - User's email address
 * @param {string} resetToken - Password reset token
 * @returns {Promise<Object>} - Email send result
 */
const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const transporter = createTransporter();
    
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
    
    const mailOptions = {
      from: `"CivicTrack" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request - CivicTrack',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">Password Reset</h1>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Reset Your Password</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              You requested a password reset for your CivicTrack account. Click the button below to reset your password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
              If you didn't request this password reset, you can safely ignore this email.
            </p>
            
            <p style="color: #666; font-size: 14px;">
              This link will expire in 1 hour for security reasons.
            </p>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2024 CivicTrack. All rights reserved.</p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw error;
  }
};

/**
 * Send comment notification email
 * @param {string} email - User's email address
 * @param {string} username - User's username
 * @param {Object} issue - Issue object
 * @param {string} commenterName - Name of the commenter
 * @returns {Promise<Object>} - Email send result
 */
const sendCommentNotificationEmail = async (email, username, issue, commenterName) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"CivicTrack" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `New Comment on Issue: ${issue.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">New Comment</h1>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${username}! 👋</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              <strong>${commenterName}</strong> added a comment to an issue you're following:
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Issue: ${issue.title}</h3>
              <p style="color: #666; margin: 10px 0;"><strong>Category:</strong> ${issue.category}</p>
              <p style="color: #666; margin: 10px 0;"><strong>Status:</strong> ${issue.status}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/issues/${issue._id}" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Issue & Comments
              </a>
            </div>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2024 CivicTrack. All rights reserved.</p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Comment notification email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Failed to send comment notification email:', error);
    throw error;
  }
};

/**
 * Send generic notification email
 * @param {string} email - User's email address
 * @param {string} subject - Email subject
 * @param {string} message - Email message
 * @returns {Promise<Object>} - Email send result
 */
const sendGenericEmail = async (email, subject, message) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"CivicTrack" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">CivicTrack</h1>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            ${message}
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© 2024 CivicTrack. All rights reserved.</p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Generic email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Failed to send generic email:', error);
    throw error;
  }
};

module.exports = {
  sendWelcomeEmail,
  sendIssueStatusUpdateEmail,
  sendPasswordResetEmail,
  sendCommentNotificationEmail,
  sendGenericEmail
}; 