const mongoose = require('mongoose');

/**
 * Notification Schema for CivicTrack application
 * Handles user notifications for issue updates, status changes, and system messages
 */
const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: {
      values: [
        'ISSUE_CREATED',
        'ISSUE_UPDATED', 
        'ISSUE_RESOLVED',
        'ISSUE_ASSIGNED',
        'COMMENT_ADDED',
        'ISSUE_FLAGGED',
        'STATUS_CHANGED',
        'SYSTEM_MESSAGE',
        'WELCOME_MESSAGE'
      ],
      message: 'Invalid notification type'
    }
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  issue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Issue',
    default: null
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isEmailSent: {
    type: Boolean,
    default: false
  },
  isPushSent: {
    type: Boolean,
    default: false
  },
  isSMSSent: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  scheduledFor: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ scheduledFor: 1 });
notificationSchema.index({ expiresAt: 1 });

// Virtual for notification summary
notificationSchema.virtual('summary').get(function() {
  return {
    id: this._id,
    type: this.type,
    title: this.title,
    message: this.message,
    isRead: this.isRead,
    priority: this.priority,
    createdAt: this.createdAt,
    issue: this.issue
  };
});

// Virtual for checking if notification is expired
notificationSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Virtual for checking if notification is scheduled
notificationSchema.virtual('isScheduled').get(function() {
  if (!this.scheduledFor) return false;
  return new Date() < this.scheduledFor;
});

/**
 * Mark notification as read
 */
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  return this.save();
};

/**
 * Mark notification as unread
 */
notificationSchema.methods.markAsUnread = function() {
  this.isRead = false;
  return this.save();
};

/**
 * Mark email as sent
 */
notificationSchema.methods.markEmailSent = function() {
  this.isEmailSent = true;
  return this.save();
};

/**
 * Mark push notification as sent
 */
notificationSchema.methods.markPushSent = function() {
  this.isPushSent = true;
  return this.save();
};

/**
 * Mark SMS as sent
 */
notificationSchema.methods.markSMSSent = function() {
  this.isSMSSent = true;
  return this.save();
};

/**
 * Static method to create issue update notification
 * @param {ObjectId} recipientId - User to notify
 * @param {ObjectId} issueId - Related issue
 * @param {string} status - New status
 * @param {ObjectId} senderId - User who made the change
 */
notificationSchema.statics.createIssueUpdateNotification = function(recipientId, issueId, status, senderId = null) {
  const statusMessages = {
    'Reported': 'A new issue has been reported in your area',
    'In Progress': 'An issue in your area is now being worked on',
    'Resolved': 'An issue in your area has been resolved',
    'Rejected': 'An issue in your area has been rejected'
  };

  return this.create({
    recipient: recipientId,
    type: 'STATUS_CHANGED',
    title: `Issue Status Updated - ${status}`,
    message: statusMessages[status] || `Issue status changed to ${status}`,
    issue: issueId,
    sender: senderId,
    priority: status === 'Resolved' ? 'High' : 'Medium'
  });
};

/**
 * Static method to create comment notification
 * @param {ObjectId} recipientId - User to notify
 * @param {ObjectId} issueId - Related issue
 * @param {string} commenterName - Name of commenter
 * @param {ObjectId} senderId - User who commented
 */
notificationSchema.statics.createCommentNotification = function(recipientId, issueId, commenterName, senderId) {
  return this.create({
    recipient: recipientId,
    type: 'COMMENT_ADDED',
    title: 'New Comment on Issue',
    message: `${commenterName} added a comment to an issue you're following`,
    issue: issueId,
    sender: senderId,
    priority: 'Low'
  });
};

/**
 * Static method to create welcome notification
 * @param {ObjectId} recipientId - User to notify
 */
notificationSchema.statics.createWelcomeNotification = function(recipientId) {
  return this.create({
    recipient: recipientId,
    type: 'WELCOME_MESSAGE',
    title: 'Welcome to CivicTrack!',
    message: 'Thank you for joining CivicTrack. Start reporting issues in your community!',
    priority: 'Low'
  });
};

/**
 * Static method to get unread notifications count
 * @param {ObjectId} userId - User ID
 */
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ recipient: userId, isRead: false });
};

/**
 * Static method to mark all notifications as read
 * @param {ObjectId} userId - User ID
 */
notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true }
  );
};

/**
 * Static method to delete old notifications
 * @param {number} daysOld - Number of days old to delete
 */
notificationSchema.statics.deleteOldNotifications = function(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return this.deleteMany({
    createdAt: { $lt: cutoffDate },
    isRead: true
  });
};

module.exports = mongoose.model('Notification', notificationSchema); 