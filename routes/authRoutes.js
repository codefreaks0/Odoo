const express = require('express');
const {
  register,
  login,
  logout,
  getMe,
  updatePassword,
  forgotPassword,
  resetPassword,
  refreshToken,
  verifyEmail,
  resendVerification
} = require('../controllers/authController');

const {
  validateRegistration,
  validateLogin,
  validatePasswordChange
} = require('../middleware/validationMiddleware');

const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', validateRegistration, register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', validateLogin, login);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticateToken, logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticateToken, getMe);

/**
 * @route   PATCH /api/auth/update-password
 * @desc    Update current user password
 * @access  Private
 */
router.patch('/update-password', authenticateToken, validatePasswordChange, updatePassword);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Forgot password
 * @access  Public
 */
router.post('/forgot-password', forgotPassword);

/**
 * @route   PATCH /api/auth/reset-password/:token
 * @desc    Reset password
 * @access  Public
 */
router.patch('/reset-password/:token', resetPassword);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh token
 * @access  Private
 */
router.post('/refresh', authenticateToken, refreshToken);

/**
 * @route   GET /api/auth/verify-email/:token
 * @desc    Verify email
 * @access  Public
 */
router.get('/verify-email/:token', verifyEmail);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend verification email
 * @access  Private
 */
router.post('/resend-verification', authenticateToken, resendVerification);

module.exports = router; 