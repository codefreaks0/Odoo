const User = require('../models/User');
const Issue = require('../models/Issue');
const Notification = require('../models/Notification');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

/**
 * @desc    Get current user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
const getProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    status: 'success',
    data: {
      user: user.fullProfile
    }
  });
});

/**
 * @desc    Update current user profile
 * @route   PATCH /api/users/profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res, next) => {
  const { username, phone, location, notificationSettings } = req.body;

  // Check if username is being changed and if it's already taken
  if (username && username !== req.user.username) {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return next(new AppError('Username is already taken', 400));
    }
  }

  // Update user profile
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      username,
      phone,
      location,
      notificationSettings
    },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser.fullProfile
    }
  });
});

/**
 * @desc    Delete current user profile
 * @route   DELETE /api/users/profile
 * @access  Private
 */
const deleteProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  // Delete user's issues
  await Issue.deleteMany({ reportedBy: req.user.id });

  // Delete user's notifications
  await Notification.deleteMany({ recipient: req.user.id });

  // Delete user profile
  await User.findByIdAndDelete(req.user.id);

  res.status(204).json({
    status: 'success',
    data: null
  });
});

/**
 * @desc    Get current user's issues
 * @route   GET /api/users/issues
 * @access  Private
 */
const getMyIssues = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20, status } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const filter = { reportedBy: req.user.id, isHidden: false };
  if (status) filter.status = status;

  const issues = await Issue.find(filter)
    .populate('assignedTo', 'username')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Issue.countDocuments(filter);

  res.status(200).json({
    status: 'success',
    results: issues.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    data: {
      issues
    }
  });
});

/**
 * @desc    Get current user's notifications
 * @route   GET /api/users/notifications
 * @access  Private
 */
const getMyNotifications = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20, isRead } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const filter = { recipient: req.user.id };
  if (isRead !== undefined) filter.isRead = isRead === 'true';

  const notifications = await Notification.find(filter)
    .populate('issue', 'title category status')
    .populate('sender', 'username')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Notification.countDocuments(filter);
  const unreadCount = await Notification.getUnreadCount(req.user.id);

  res.status(200).json({
    status: 'success',
    results: notifications.length,
    unreadCount,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    data: {
      notifications
    }
  });
});

/**
 * @desc    Mark notification as read
 * @route   PATCH /api/users/notifications/:id/read
 * @access  Private
 */
const markNotificationRead = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    recipient: req.user.id
  });

  if (!notification) {
    return next(new AppError('Notification not found', 404));
  }

  await notification.markAsRead();

  res.status(200).json({
    status: 'success',
    message: 'Notification marked as read'
  });
});

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/users/notifications/read-all
 * @access  Private
 */
const markAllNotificationsRead = asyncHandler(async (req, res, next) => {
  await Notification.markAllAsRead(req.user.id);

  res.status(200).json({
    status: 'success',
    message: 'All notifications marked as read'
  });
});

/**
 * @desc    Update notification settings
 * @route   PATCH /api/users/notification-settings
 * @access  Private
 */
const updateNotificationSettings = asyncHandler(async (req, res, next) => {
  const { email, push, sms } = req.body;

  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      notificationSettings: {
        email: email !== undefined ? email : req.user.notificationSettings.email,
        push: push !== undefined ? push : req.user.notificationSettings.push,
        sms: sms !== undefined ? sms : req.user.notificationSettings.sms
      }
    },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: 'success',
    data: {
      notificationSettings: updatedUser.notificationSettings
    }
  });
});

module.exports = {
  getProfile,
  updateProfile,
  deleteProfile,
  getMyIssues,
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  updateNotificationSettings
}; 