const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError, asyncHandler } = require('./errorHandler');

/**
 * Verify JWT token and attach user to request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateToken = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    // Check for token in cookies
    token = req.cookies.token;
  }

  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    // Check if user changed password after the token was issued
    if (currentUser.passwordChangedAt) {
      const changedTimestamp = parseInt(currentUser.passwordChangedAt.getTime() / 1000, 10);
      if (decoded.iat < changedTimestamp) {
        return next(new AppError('User recently changed password! Please log in again.', 401));
      }
    }

    // Check if user is banned
    if (currentUser.isBanned) {
      return next(new AppError('Your account has been banned. Please contact support.', 403));
    }

    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (error) {
    return next(new AppError('Invalid token. Please log in again!', 401));
  }
});

/**
 * Restrict access to specific roles
 * @param {...string} roles - Allowed roles
 * @returns {Function} - Middleware function
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('You must be logged in to access this resource.', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }

    next();
  };
};

/**
 * Check if user is admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('You must be logged in to access this resource.', 401));
  }

  if (req.user.role !== 'admin') {
    return next(new AppError('Admin access required.', 403));
  }

  next();
};

/**
 * Check if user is moderator or admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requireModerator = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('You must be logged in to access this resource.', 401));
  }

  if (!['admin', 'moderator'].includes(req.user.role)) {
    return next(new AppError('Moderator access required.', 403));
  }

  next();
};

/**
 * Optional authentication - doesn't fail if no token provided
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    // Check for token in cookies
    token = req.cookies.token;
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser || currentUser.isBanned) {
      req.user = null;
      return next();
    }

    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
});

/**
 * Check if user owns the resource or is admin
 * @param {string} resourceUserIdField - Field name containing user ID in resource
 * @returns {Function} - Middleware function
 */
const checkOwnership = (resourceUserIdField = 'reportedBy') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('You must be logged in to access this resource.', 401));
    }

    // Admin can access any resource
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    if (resourceUserId && resourceUserId.toString() !== req.user._id.toString()) {
      return next(new AppError('You can only access your own resources.', 403));
    }

    next();
  };
};

/**
 * Rate limiting for authentication attempts
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authRateLimit = (req, res, next) => {
  // This would typically be implemented with a rate limiting library
  // For now, we'll just pass through
  next();
};

/**
 * Update user's last active timestamp
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const updateLastActive = asyncHandler(async (req, res, next) => {
  if (req.user) {
    await req.user.updateLastActive();
  }
  next();
});

module.exports = {
  authenticateToken,
  restrictTo,
  requireAdmin,
  requireModerator,
  optionalAuth,
  checkOwnership,
  authRateLimit,
  updateLastActive
}; 