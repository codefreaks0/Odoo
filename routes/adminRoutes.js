const express = require('express');
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  banUser,
  unbanUser,
  getFlaggedIssues,
  reviewFlaggedIssue,
  getAdminStats,
  assignIssue,
  bulkUpdateIssues
} = require('../controllers/adminController');

const {
  validateUserId,
  validateAdminUserUpdate
} = require('../middleware/validationMiddleware');

const { 
  authenticateToken, 
  requireAdmin,
  requireModerator 
} = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication and admin privileges
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users (admin only)
 * @access  Private (admin)
 */
router.get('/users', getAllUsers);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user by ID (admin only)
 * @access  Private (admin)
 */
router.get('/users/:id', validateUserId, getUserById);

/**
 * @route   PATCH /api/admin/users/:id
 * @desc    Update user (admin only)
 * @access  Private (admin)
 */
router.patch('/users/:id', validateUserId, validateAdminUserUpdate, updateUser);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user (admin only)
 * @access  Private (admin)
 */
router.delete('/users/:id', validateUserId, deleteUser);

/**
 * @route   POST /api/admin/users/:id/ban
 * @desc    Ban user (admin only)
 * @access  Private (admin)
 */
router.post('/users/:id/ban', validateUserId, banUser);

/**
 * @route   POST /api/admin/users/:id/unban
 * @desc    Unban user (admin only)
 * @access  Private (admin)
 */
router.post('/users/:id/unban', validateUserId, unbanUser);

/**
 * @route   GET /api/admin/issues/flagged
 * @desc    Get flagged issues (admin/moderator)
 * @access  Private (admin/moderator)
 */
router.get('/issues/flagged', requireModerator, getFlaggedIssues);

/**
 * @route   PATCH /api/admin/issues/:id/review
 * @desc    Review flagged issue (admin/moderator)
 * @access  Private (admin/moderator)
 */
router.patch('/issues/:id/review', requireModerator, reviewFlaggedIssue);

/**
 * @route   POST /api/admin/issues/:id/assign
 * @desc    Assign issue to user (admin only)
 * @access  Private (admin)
 */
router.post('/issues/:id/assign', assignIssue);

/**
 * @route   POST /api/admin/issues/bulk-update
 * @desc    Bulk update issues (admin only)
 * @access  Private (admin)
 */
router.post('/issues/bulk-update', bulkUpdateIssues);

/**
 * @route   GET /api/admin/stats
 * @desc    Get admin statistics (admin only)
 * @access  Private (admin)
 */
router.get('/stats', getAdminStats);

module.exports = router; 