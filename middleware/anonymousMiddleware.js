/**
 * Middleware for handling anonymous user restrictions and data filtering
 * Ensures proper data visibility and privacy for anonymous reports
 */

/**
 * Filter issue data to hide sensitive information for anonymous reports
 * @param {Object} issue - Issue object
 * @param {Object} user - Current user (optional)
 * @returns {Object} - Filtered issue object
 */
const filterAnonymousData = (issue, user = null) => {
  const filteredIssue = { ...issue };

  // Handle anonymous reporting
  if (issue.isAnonymous || !issue.reportedBy) {
    filteredIssue.reportedBy = {
      _id: null,
      username: 'Anonymous',
      email: null
    };
    filteredIssue.reporterName = 'Anonymous';
    filteredIssue.isAnonymous = true;
  } else {
    filteredIssue.reporterName = issue.reportedBy.username;
    filteredIssue.isAnonymous = false;
  }

  // Filter comments to hide anonymous users
  if (filteredIssue.comments) {
    filteredIssue.comments = filteredIssue.comments.map(comment => ({
      ...comment,
      username: comment.username || 'Anonymous',
      user: comment.user ? {
        _id: comment.user._id,
        username: comment.username || 'Anonymous'
      } : null
    }));
  }

  // Filter activity log to hide sensitive information
  if (filteredIssue.activityLog) {
    filteredIssue.activityLog = filteredIssue.activityLog.map(log => ({
      ...log,
      actorName: log.actorName || 'System',
      actor: log.actor ? {
        _id: log.actor._id,
        username: log.actorName || 'System'
      } : null
    }));
  }

  return filteredIssue;
};

/**
 * Filter multiple issues for anonymous data
 * @param {Array} issues - Array of issue objects
 * @param {Object} user - Current user (optional)
 * @returns {Array} - Filtered issues array
 */
const filterMultipleIssues = (issues, user = null) => {
  return issues.map(issue => filterAnonymousData(issue, user));
};

/**
 * Middleware to apply anonymous filtering to response
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const applyAnonymousFiltering = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    if (data && data.data) {
      if (Array.isArray(data.data.issues)) {
        data.data.issues = filterMultipleIssues(data.data.issues, req.user);
      } else if (data.data.issue) {
        data.data.issue = filterAnonymousData(data.data.issue, req.user);
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Middleware to check if user can view sensitive data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const canViewSensitiveData = (req, res, next) => {
  // Admin can view all data
  if (req.user && req.user.role === 'admin') {
    req.canViewSensitive = true;
    return next();
  }

  // Issue owner can view their own data
  if (req.user && req.params.id) {
    // This will be checked in the controller
    req.canViewSensitive = false;
    return next();
  }

  req.canViewSensitive = false;
  next();
};

/**
 * Middleware to restrict data based on user permissions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const restrictDataAccess = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    if (data && data.data) {
      // Apply restrictions based on user role and ownership
      if (req.user && req.user.role === 'admin') {
        // Admin can see everything
        return originalJson.call(this, data);
      }
      
      if (data.data.issues) {
        data.data.issues = data.data.issues.map(issue => {
          // Hide sensitive data for non-admin users
          if (issue.reportedBy && issue.reportedBy._id) {
            const isOwner = req.user && issue.reportedBy._id.toString() === req.user._id.toString();
            if (!isOwner) {
              return filterAnonymousData(issue, req.user);
            }
          }
          return issue;
        });
      }
      
      if (data.data.issue) {
        const issue = data.data.issue;
        if (issue.reportedBy && issue.reportedBy._id) {
          const isOwner = req.user && issue.reportedBy._id.toString() === req.user._id.toString();
          if (!isOwner) {
            data.data.issue = filterAnonymousData(issue, req.user);
          }
        }
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Middleware to validate anonymous reporting permissions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateAnonymousReporting = (req, res, next) => {
  const { isAnonymous } = req.body;
  
  // If user is not authenticated, force anonymous reporting
  if (!req.user && isAnonymous !== true) {
    req.body.isAnonymous = true;
  }
  
  // If user is authenticated, they can choose to report anonymously
  if (req.user && isAnonymous === true) {
    // Allow anonymous reporting for authenticated users
    req.body.isAnonymous = true;
  }
  
  next();
};

/**
 * Middleware to sanitize user data in responses
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const sanitizeUserData = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    if (data && data.data && data.data.user) {
      const user = data.data.user;
      
      // Remove sensitive fields for non-admin users
      if (!req.user || req.user.role !== 'admin') {
        delete user.password;
        delete user.passwordResetToken;
        delete user.passwordResetExpires;
        delete user.emailVerificationToken;
        delete user.emailVerificationExpires;
      }
      
      // Hide email for anonymous users
      if (user.isAnonymous) {
        user.email = null;
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

module.exports = {
  filterAnonymousData,
  filterMultipleIssues,
  applyAnonymousFiltering,
  canViewSensitiveData,
  restrictDataAccess,
  validateAnonymousReporting,
  sanitizeUserData
}; 