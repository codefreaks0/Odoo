const { body, param, query, validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

/**
 * Handle validation errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    return next(new AppError(errorMessages.join('. '), 400));
  }
  next();
};

/**
 * User registration validation
 */
const validateRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('phone')
    .matches(/^[0-9]{10}$/)
    .withMessage('Please provide a valid 10-digit phone number'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('location.coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Location coordinates must be an array with exactly 2 values')
    .custom((coords) => {
      const [lng, lat] = coords;
      return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
    })
    .withMessage('Invalid coordinates. Longitude must be between -180 and 180, latitude between -90 and 90'),
  
  body('location.address')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Address must be between 5 and 200 characters'),
  
  handleValidationErrors
];

/**
 * User login validation
 */
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

/**
 * Issue creation validation
 */
const validateIssueCreation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  
  body('category')
    .isIn(['Roads', 'Lighting', 'Water Supply', 'Cleanliness', 'Public Safety', 'Obstructions'])
    .withMessage('Invalid category. Must be one of: Roads, Lighting, Water Supply, Cleanliness, Public Safety, Obstructions'),
  
  body('location.coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Location coordinates must be an array with exactly 2 values')
    .custom((coords) => {
      const [lng, lat] = coords;
      return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
    })
    .withMessage('Invalid coordinates. Longitude must be between -180 and 180, latitude between -90 and 90'),
  
  body('location.address')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Address must be between 5 and 200 characters'),
  
  body('isAnonymous')
    .optional()
    .isBoolean()
    .withMessage('isAnonymous must be a boolean value'),
  
  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High', 'Critical'])
    .withMessage('Invalid priority. Must be one of: Low, Medium, High, Critical'),
  
  body('severity')
    .optional()
    .isIn(['Minor', 'Moderate', 'Major', 'Critical'])
    .withMessage('Invalid severity. Must be one of: Minor, Moderate, Major, Critical'),
  
  handleValidationErrors
];

/**
 * Issue update validation
 */
const validateIssueUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  
  body('status')
    .optional()
    .isIn(['Reported', 'In Progress', 'Resolved', 'Rejected'])
    .withMessage('Invalid status. Must be one of: Reported, In Progress, Resolved, Rejected'),
  
  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High', 'Critical'])
    .withMessage('Invalid priority. Must be one of: Low, Medium, High, Critical'),
  
  body('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID for assignment'),
  
  body('estimatedResolutionTime')
    .optional()
    .isISO8601()
    .withMessage('Estimated resolution time must be a valid date'),
  
  body('resolutionNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Resolution notes cannot exceed 1000 characters'),
  
  handleValidationErrors
];

/**
 * Issue ID validation
 */
const validateIssueId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid issue ID'),
  
  handleValidationErrors
];

/**
 * User ID validation
 */
const validateUserId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID'),
  
  handleValidationErrors
];

/**
 * Issue filtering validation
 */
const validateIssueFilters = [
  query('category')
    .optional()
    .isIn(['Roads', 'Lighting', 'Water Supply', 'Cleanliness', 'Public Safety', 'Obstructions'])
    .withMessage('Invalid category filter'),
  
  query('status')
    .optional()
    .isIn(['Reported', 'In Progress', 'Resolved', 'Rejected'])
    .withMessage('Invalid status filter'),
  
  query('distance')
    .optional()
    .isFloat({ min: 0.1, max: 50 })
    .withMessage('Distance must be between 0.1 and 50 kilometers'),
  
  query('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  
  query('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'priority', 'status', 'upvoteCount'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be either "asc" or "desc"'),
  
  handleValidationErrors
];

/**
 * Comment validation
 */
const validateComment = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Comment must be between 1 and 500 characters'),
  
  handleValidationErrors
];

/**
 * Flag validation
 */
const validateFlag = [
  body('reason')
    .isIn(['Spam', 'Inappropriate', 'Duplicate', 'False Information', 'Other'])
    .withMessage('Invalid flag reason'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Flag description cannot exceed 200 characters'),
  
  handleValidationErrors
];

/**
 * User profile update validation
 */
const validateProfileUpdate = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('phone')
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage('Please provide a valid 10-digit phone number'),
  
  body('location.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Location coordinates must be an array with exactly 2 values')
    .custom((coords) => {
      const [lng, lat] = coords;
      return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
    })
    .withMessage('Invalid coordinates. Longitude must be between -180 and 180, latitude between -90 and 90'),
  
  body('location.address')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Address must be between 5 and 200 characters'),
  
  body('notificationSettings.email')
    .optional()
    .isBoolean()
    .withMessage('Email notification setting must be a boolean'),
  
  body('notificationSettings.push')
    .optional()
    .isBoolean()
    .withMessage('Push notification setting must be a boolean'),
  
  body('notificationSettings.sms')
    .optional()
    .isBoolean()
    .withMessage('SMS notification setting must be a boolean'),
  
  handleValidationErrors
];

/**
 * Password change validation
 */
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      return value === req.body.newPassword;
    })
    .withMessage('Password confirmation does not match new password'),
  
  handleValidationErrors
];

/**
 * Admin user management validation
 */
const validateAdminUserUpdate = [
  body('role')
    .optional()
    .isIn(['user', 'moderator', 'admin'])
    .withMessage('Invalid role. Must be one of: user, moderator, admin'),
  
  body('isBanned')
    .optional()
    .isBoolean()
    .withMessage('isBanned must be a boolean value'),
  
  body('banReason')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Ban reason must be between 5 and 200 characters'),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateRegistration,
  validateLogin,
  validateIssueCreation,
  validateIssueUpdate,
  validateIssueId,
  validateUserId,
  validateIssueFilters,
  validateComment,
  validateFlag,
  validateProfileUpdate,
  validatePasswordChange,
  validateAdminUserUpdate
}; 