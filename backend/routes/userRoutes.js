const express = require('express');
const {
  getProfile,
  updateProfile,
  deleteProfile,
  getMyIssues,
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  updateNotificationSettings
} = require('../controllers/userController');

const {
  validateProfileUpdate
} = require('../middleware/validationMiddleware');

const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/users/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', getProfile);

/**
 * @route   PATCH /api/users/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.patch('/profile', ...validateProfileUpdate, updateProfile);

/**
 * @route   DELETE /api/users/profile
 * @desc    Delete current user profile
 * @access  Private
 */
router.delete('/profile', deleteProfile);

/**
 * @route   GET /api/users/issues
 * @desc    Get current user's issues
 * @access  Private
 */
router.get('/issues', getMyIssues);

/**
 * @route   GET /api/users/notifications
 * @desc    Get current user's notifications
 * @access  Private
 */
router.get('/notifications', getMyNotifications);

/**
 * @route   PATCH /api/users/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.patch('/notifications/:id/read', markNotificationRead);

/**
 * @route   PATCH /api/users/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.patch('/notifications/read-all', markAllNotificationsRead);

/**
 * @route   PATCH /api/users/notification-settings
 * @desc    Update notification settings
 * @access  Private
 */
router.patch('/notification-settings', updateNotificationSettings);

module.exports = router; 