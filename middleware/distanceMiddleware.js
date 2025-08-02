/**
 * Middleware for enforcing distance-based restrictions
 * Ensures users can only access issues within their allowed radius
 */

const { AppError, asyncHandler } = require('./errorHandler');
const { calculateDistance } = require('../utils/geoUtils');

/**
 * Middleware to enforce maximum distance restrictions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const enforceDistanceRestrictions = asyncHandler(async (req, res, next) => {
  const { latitude, longitude, distance } = req.query;
  const maxAllowedDistance = parseInt(process.env.MAX_SEARCH_RADIUS) || 5; // 5km maximum

  // If distance is specified, enforce maximum limit
  if (distance && parseFloat(distance) > maxAllowedDistance) {
    return next(new AppError(`Distance cannot exceed ${maxAllowedDistance}km for security reasons`, 400));
  }

  // If coordinates are provided, validate them
  if (latitude && longitude) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    // Validate coordinate ranges
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return next(new AppError('Invalid coordinates provided', 400));
    }

    // Store validated coordinates for use in controllers
    req.validatedLocation = { latitude: lat, longitude: lng };
  }

  next();
});

/**
 * Middleware to validate user location for distance-based access
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateUserLocation = asyncHandler(async (req, res, next) => {
  const { latitude, longitude } = req.query;

  // For issue-related endpoints, require location
  if (req.path.includes('/issues') && !req.path.includes('/stats')) {
    if (!latitude || !longitude) {
      return next(new AppError('Location coordinates (latitude, longitude) are required for security', 400));
    }
  }

  next();
});

/**
 * Middleware to filter issues by distance after database query
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const filterIssuesByDistance = asyncHandler(async (req, res, next) => {
  const originalJson = res.json;
  const { latitude, longitude, distance = 5 } = req.query;
  const maxDistance = Math.min(parseFloat(distance), parseInt(process.env.MAX_SEARCH_RADIUS) || 5);

  res.json = function(data) {
    if (data && data.data && data.data.issues && latitude && longitude) {
      const userLat = parseFloat(latitude);
      const userLng = parseFloat(longitude);

      // Filter issues by distance
      data.data.issues = data.data.issues.filter(issue => {
        if (!issue.location || !issue.location.coordinates) return false;

        const [issueLng, issueLat] = issue.location.coordinates;
        const calculatedDistance = calculateDistance(userLat, userLng, issueLat, issueLng);

        return calculatedDistance <= maxDistance;
      });

      // Update results count
      data.results = data.data.issues.length;
    }

    return originalJson.call(this, data);
  };

  next();
});

/**
 * Middleware to prevent access to issues outside user's area
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const preventOutOfAreaAccess = asyncHandler(async (req, res, next) => {
  const { latitude, longitude } = req.query;
  const issueId = req.params.id;

  if (issueId && latitude && longitude) {
    const Issue = require('../models/Issue');
    const issue = await Issue.findById(issueId);

    if (issue && issue.location && issue.location.coordinates) {
      const userLat = parseFloat(latitude);
      const userLng = parseFloat(longitude);
      const [issueLng, issueLat] = issue.location.coordinates;
      const distance = calculateDistance(userLat, userLng, issueLat, issueLng);
      const maxDistance = parseInt(process.env.MAX_SEARCH_RADIUS) || 5;

      if (distance > maxDistance) {
        return next(new AppError('This issue is outside your allowed area. You can only access issues within 5km of your location.', 403));
      }
    }
  }

  next();
});

/**
 * Middleware to enforce location-based restrictions for all issue endpoints
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const enforceLocationRestrictions = asyncHandler(async (req, res, next) => {
  // Skip for admin routes and stats
  if (req.path.includes('/admin') || req.path.includes('/stats')) {
    return next();
  }

  // For issue creation, validate location
  if (req.method === 'POST' && req.path === '/') {
    const { location } = req.body;
    
    if (!location || !location.coordinates) {
      return next(new AppError('Location coordinates are required for issue reporting', 400));
    }

    const [lng, lat] = location.coordinates;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return next(new AppError('Invalid location coordinates provided', 400));
    }
  }

  // For GET requests, require location parameters
  if (req.method === 'GET' && !req.path.includes('/stats')) {
    const { latitude, longitude } = req.query;
    
    if (!latitude || !longitude) {
      return next(new AppError('Location coordinates (latitude, longitude) are required for security and privacy', 400));
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return next(new AppError('Invalid location coordinates provided', 400));
    }
  }

  next();
});

/**
 * Middleware to add distance information to responses
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const addDistanceInfo = asyncHandler(async (req, res, next) => {
  const originalJson = res.json;
  const { latitude, longitude } = req.query;

  res.json = function(data) {
    if (data && data.data && latitude && longitude) {
      const userLat = parseFloat(latitude);
      const userLng = parseFloat(longitude);

      // Add distance to issues
      if (data.data.issues) {
        data.data.issues.forEach(issue => {
          if (issue.location && issue.location.coordinates) {
            const [issueLng, issueLat] = issue.location.coordinates;
            issue.distance = calculateDistance(userLat, userLng, issueLat, issueLng);
          }
        });
      }

      // Add distance to single issue
      if (data.data.issue && data.data.issue.location && data.data.issue.location.coordinates) {
        const [issueLng, issueLat] = data.data.issue.location.coordinates;
        data.data.issue.distance = calculateDistance(userLat, userLng, issueLat, issueLng);
      }

      // Add user location info
      data.userLocation = {
        latitude: userLat,
        longitude: userLng,
        maxAllowedDistance: parseInt(process.env.MAX_SEARCH_RADIUS) || 5
      };
    }

    return originalJson.call(this, data);
  };

  next();
});

module.exports = {
  enforceDistanceRestrictions,
  validateUserLocation,
  filterIssuesByDistance,
  preventOutOfAreaAccess,
  enforceLocationRestrictions,
  addDistanceInfo
}; 