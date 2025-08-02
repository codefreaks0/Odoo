const Issue = require('../models/Issue');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryService');
const { calculateDistance } = require('../utils/geoUtils');

/**
 * @desc    Create new issue
 * @route   POST /api/issues
 * @access  Private/Public (anonymous reporting)
 */
const createIssue = asyncHandler(async (req, res, next) => {
  const {
    title,
    description,
    category,
    location,
    isAnonymous = false,
    priority = 'Medium',
    severity = 'Moderate',
    affectedArea,
    weatherCondition = 'Clear',
    isUrgent = false
  } = req.body;

  // Handle image uploads if any
  let images = [];
  if (req.files && req.files.length > 0) {
    const uploadPromises = req.files.map(file => uploadToCloudinary(file.path));
    const uploadResults = await Promise.all(uploadPromises);
    
    images = uploadResults.map(result => ({
      url: result.secure_url,
      publicId: result.public_id,
      uploadedAt: new Date()
    }));
  }

  // Create issue data
  const issueData = {
    title,
    description,
    category,
    location,
    priority,
    severity,
    affectedArea,
    weatherCondition,
    isUrgent,
    images,
    isAnonymous
  };

  // Add reporter if user is authenticated
  if (req.user && !isAnonymous) {
    issueData.reportedBy = req.user._id;
    issueData.isAnonymous = false;
  } else {
    issueData.isAnonymous = true;
  }

  // Create the issue
  const issue = await Issue.create(issueData);

  // Add initial activity log
  const actorName = req.user ? req.user.username : 'Anonymous';
  await issue.addActivityLog('Created', 'Issue reported', req.user?._id, actorName);

  // Increment user's report count if authenticated
  if (req.user && !isAnonymous) {
    await req.user.incrementReportCount();
  }

  // Populate reporter details for response (but hide if anonymous)
  if (issue.reportedBy) {
    await issue.populate('reportedBy', 'username email');
  }

  res.status(201).json({
    status: 'success',
    data: {
      issue
    }
  });
});

/**
 * @desc    Get all issues with filtering and pagination (for map display)
 * @route   GET /api/issues
 * @access  Public
 */
const getIssues = asyncHandler(async (req, res, next) => {
  const {
    category,
    status,
    distance = process.env.DEFAULT_SEARCH_RADIUS,
    latitude,
    longitude,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    search,
    forMap = false // New parameter for map-specific filtering
  } = req.query;

  // STRICT DISTANCE ENFORCEMENT - Location is required
  if (!latitude || !longitude) {
    return next(new AppError('Location coordinates (latitude, longitude) are required for security and privacy', 400));
  }

  const userLat = parseFloat(latitude);
  const userLng = parseFloat(longitude);
  const maxAllowedDistance = parseInt(process.env.MAX_SEARCH_RADIUS) || 5;
  const requestedDistance = Math.min(parseFloat(distance), maxAllowedDistance);

  // Validate coordinates
  if (isNaN(userLat) || isNaN(userLng) || userLat < -90 || userLat > 90 || userLng < -180 || userLng > 180) {
    return next(new AppError('Invalid location coordinates provided', 400));
  }

  // Build filter object
  const filter = { isHidden: false };

  if (category) filter.category = category;
  if (status) filter.status = status;

  // Add search functionality
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { 'location.address': { $regex: search, $options: 'i' } }
    ];
  }

  // STRICT GEOSPATIAL FILTERING - Only issues within allowed distance
  const userLocation = [userLng, userLat];
  const maxDistanceMeters = requestedDistance * 1000; // Convert km to meters

  filter.location = {
    $near: {
      $geometry: {
        type: 'Point',
        coordinates: userLocation
      },
      $maxDistance: maxDistanceMeters
    }
  };

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Execute query
  const issues = await Issue.find(filter)
    .populate('reportedBy', 'username email')
    .populate('assignedTo', 'username')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  // Process issues for frontend display
  const processedIssues = issues.map(issue => {
    const processedIssue = { ...issue };
    
    // Handle anonymous reporting for frontend display
    if (issue.isAnonymous || !issue.reportedBy) {
      processedIssue.reportedBy = {
        _id: null,
        username: 'Anonymous',
        email: null
      };
      processedIssue.reporterName = 'Anonymous';
    } else {
      processedIssue.reporterName = issue.reportedBy.username;
    }

    // Calculate distances if user location provided
    if (latitude && longitude) {
      const userLocation = [parseFloat(latitude), parseFloat(longitude)];
      processedIssue.distance = calculateDistance(
        userLocation[0],
        userLocation[1],
        issue.location.coordinates[1],
        issue.location.coordinates[0]
      );
    }

    // For map display, include only necessary fields
    if (forMap === 'true') {
      return {
        _id: processedIssue._id,
        title: processedIssue.title,
        category: processedIssue.category,
        status: processedIssue.status,
        priority: processedIssue.priority,
        location: processedIssue.location,
        reporterName: processedIssue.reporterName,
        isAnonymous: processedIssue.isAnonymous,
        createdAt: processedIssue.createdAt,
        upvoteCount: processedIssue.upvoteCount,
        flagCount: processedIssue.flagCount,
        distance: processedIssue.distance,
        images: processedIssue.images?.slice(0, 1) || [] // Only first image for map
      };
    }

    return processedIssue;
  });

  // Get total count for pagination
  const total = await Issue.countDocuments(filter);

  res.status(200).json({
    status: 'success',
    results: processedIssues.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    data: {
      issues: processedIssues
    }
  });
});

/**
 * @desc    Get issues for map display (optimized for Leaflet.js)
 * @route   GET /api/issues/map
 * @access  Public
 */
const getIssuesForMap = asyncHandler(async (req, res, next) => {
  const {
    category,
    status,
    distance = process.env.DEFAULT_SEARCH_RADIUS,
    latitude,
    longitude,
    bounds // Leaflet bounds: { north, south, east, west }
  } = req.query;

  // STRICT DISTANCE ENFORCEMENT - Location is required
  if (!latitude || !longitude) {
    return next(new AppError('Location coordinates (latitude, longitude) are required for map access', 400));
  }

  const userLat = parseFloat(latitude);
  const userLng = parseFloat(longitude);
  const maxAllowedDistance = parseInt(process.env.MAX_SEARCH_RADIUS) || 5;
  const requestedDistance = Math.min(parseFloat(distance), maxAllowedDistance);

  // Validate coordinates
  if (isNaN(userLat) || isNaN(userLng) || userLat < -90 || userLat > 90 || userLng < -180 || userLng > 180) {
    return next(new AppError('Invalid location coordinates provided', 400));
  }

  // Build filter object
  const filter = { isHidden: false };

  if (category) filter.category = category;
  if (status) filter.status = status;

  // STRICT GEOSPATIAL FILTERING - Only issues within allowed distance
  const userLocation = [userLng, userLat];
  const maxDistanceMeters = requestedDistance * 1000; // Convert km to meters

  filter.location = {
    $near: {
      $geometry: {
        type: 'Point',
        coordinates: userLocation
      },
      $maxDistance: maxDistanceMeters
    }
  };

  // Add bounds filter if provided (for map viewport)
  if (bounds) {
    try {
      const { north, south, east, west } = JSON.parse(bounds);
      filter.location = {
        $geoWithin: {
          $box: [
            [parseFloat(west), parseFloat(south)],
            [parseFloat(east), parseFloat(north)]
          ]
        }
      };
    } catch (error) {
      // If bounds parsing fails, continue without bounds filter
    }
  }

  // Execute query with map-optimized fields
  const issues = await Issue.find(filter)
    .select('title category status priority location isAnonymous createdAt upvoteCount flagCount images')
    .populate('reportedBy', 'username')
    .sort({ createdAt: -1 })
    .lean();

  // Process issues for map display
  const mapIssues = issues.map(issue => {
    const mapIssue = {
      _id: issue._id,
      title: issue.title,
      category: issue.category,
      status: issue.status,
      priority: issue.priority,
      location: issue.location,
      reporterName: issue.isAnonymous || !issue.reportedBy ? 'Anonymous' : issue.reportedBy.username,
      isAnonymous: issue.isAnonymous || !issue.reportedBy,
      createdAt: issue.createdAt,
      upvoteCount: issue.upvoteCount,
      flagCount: issue.flagCount,
      hasImages: issue.images && issue.images.length > 0,
      imageUrl: issue.images && issue.images.length > 0 ? issue.images[0].url : null
    };

    // Calculate distance if user location provided
    if (latitude && longitude) {
      const userLocation = [parseFloat(latitude), parseFloat(longitude)];
      mapIssue.distance = calculateDistance(
        userLocation[0],
        userLocation[1],
        issue.location.coordinates[1],
        issue.location.coordinates[0]
      );
    }

    return mapIssue;
  });

  res.status(200).json({
    status: 'success',
    results: mapIssues.length,
    data: {
      issues: mapIssues
    }
  });
});

/**
 * @desc    Get single issue by ID
 * @route   GET /api/issues/:id
 * @access  Public
 */
const getIssue = asyncHandler(async (req, res, next) => {
  const { latitude, longitude } = req.query;

  // STRICT DISTANCE ENFORCEMENT - Location is required
  if (!latitude || !longitude) {
    return next(new AppError('Location coordinates (latitude, longitude) are required for security', 400));
  }

  const userLat = parseFloat(latitude);
  const userLng = parseFloat(longitude);
  const maxAllowedDistance = parseInt(process.env.MAX_SEARCH_RADIUS) || 5;

  // Validate coordinates
  if (isNaN(userLat) || isNaN(userLng) || userLat < -90 || userLat > 90 || userLng < -180 || userLng > 180) {
    return next(new AppError('Invalid location coordinates provided', 400));
  }

  const issue = await Issue.findById(req.params.id)
    .populate('reportedBy', 'username email')
    .populate('assignedTo', 'username email')
    .populate('comments.user', 'username')
    .populate('flags.user', 'username')
    .populate('upvotes', 'username');

  if (!issue) {
    return next(new AppError('Issue not found', 404));
  }

  // Check if issue is hidden and user is not admin
  if (issue.isHidden && (!req.user || req.user.role !== 'admin')) {
    return next(new AppError('Issue not found', 404));
  }

  // STRICT DISTANCE CHECK - Verify user can access this issue
  if (issue.location && issue.location.coordinates) {
    const [issueLng, issueLat] = issue.location.coordinates;
    const distance = calculateDistance(userLat, userLng, issueLat, issueLng);

    if (distance > maxAllowedDistance) {
      return next(new AppError(`This issue is outside your allowed area. You can only access issues within ${maxAllowedDistance}km of your location.`, 403));
    }
  }

  // Process issue for frontend display
  const processedIssue = issue.toObject();

  // Handle anonymous reporting
  if (issue.isAnonymous || !issue.reportedBy) {
    processedIssue.reportedBy = {
      _id: null,
      username: 'Anonymous',
      email: null
    };
    processedIssue.reporterName = 'Anonymous';
  } else {
    processedIssue.reporterName = issue.reportedBy.username;
  }

  // Process comments to hide anonymous users
  if (processedIssue.comments) {
    processedIssue.comments = processedIssue.comments.map(comment => ({
      ...comment,
      username: comment.username || 'Anonymous'
    }));
  }

  // Calculate distance if user location provided
  if (req.query.latitude && req.query.longitude) {
    const userLocation = [parseFloat(req.query.latitude), parseFloat(req.query.longitude)];
    processedIssue.distance = calculateDistance(
      userLocation[0],
      userLocation[1],
      issue.location.coordinates[1],
      issue.location.coordinates[0]
    );
  }

  res.status(200).json({
    status: 'success',
    data: {
      issue: processedIssue
    }
  });
});

/**
 * @desc    Update issue
 * @route   PATCH /api/issues/:id
 * @access  Private (owner or admin)
 */
const updateIssue = asyncHandler(async (req, res, next) => {
  const issue = await Issue.findById(req.params.id);

  if (!issue) {
    return next(new AppError('Issue not found', 404));
  }

  // Check ownership or admin access
  if (req.user.role !== 'admin' && 
      (!issue.reportedBy || issue.reportedBy.toString() !== req.user._id.toString())) {
    return next(new AppError('You can only update your own issues', 403));
  }

  // Handle image uploads if any
  if (req.files && req.files.length > 0) {
    const uploadPromises = req.files.map(file => uploadToCloudinary(file.path));
    const uploadResults = await Promise.all(uploadPromises);
    
    const newImages = uploadResults.map(result => ({
      url: result.secure_url,
      publicId: result.public_id,
      uploadedAt: new Date()
    }));

    req.body.images = [...issue.images, ...newImages];
  }

  // Update the issue
  const updatedIssue = await Issue.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('reportedBy', 'username email');

  // Process for response
  const processedIssue = updatedIssue.toObject();
  if (updatedIssue.isAnonymous || !updatedIssue.reportedBy) {
    processedIssue.reportedBy = {
      _id: null,
      username: 'Anonymous',
      email: null
    };
  }

  res.status(200).json({
    status: 'success',
    data: {
      issue: processedIssue
    }
  });
});

/**
 * @desc    Delete issue
 * @route   DELETE /api/issues/:id
 * @access  Private (owner or admin)
 */
const deleteIssue = asyncHandler(async (req, res, next) => {
  const issue = await Issue.findById(req.params.id);

  if (!issue) {
    return next(new AppError('Issue not found', 404));
  }

  // Check ownership or admin access
  if (req.user.role !== 'admin' && 
      (!issue.reportedBy || issue.reportedBy.toString() !== req.user._id.toString())) {
    return next(new AppError('You can only delete your own issues', 403));
  }

  // Delete images from Cloudinary
  if (issue.images && issue.images.length > 0) {
    const deletePromises = issue.images.map(image => 
      deleteFromCloudinary(image.publicId)
    );
    await Promise.all(deletePromises);
  }

  await Issue.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null
  });
});

/**
 * @desc    Update issue status
 * @route   PATCH /api/issues/:id/status
 * @access  Private (admin or assigned user)
 */
const updateIssueStatus = asyncHandler(async (req, res, next) => {
  const { status, notes } = req.body;
  const issue = await Issue.findById(req.params.id);

  if (!issue) {
    return next(new AppError('Issue not found', 404));
  }

  // Check permissions
  if (req.user.role !== 'admin' && 
      (!issue.assignedTo || issue.assignedTo.toString() !== req.user._id.toString())) {
    return next(new AppError('You can only update status of issues assigned to you', 403));
  }

  // Update status
  await issue.updateStatus(status, req.user._id, req.user.username, notes);

  // Send notification to reporter if issue is resolved (only if not anonymous)
  if (status === 'Resolved' && issue.reportedBy && !issue.isAnonymous) {
    await Notification.createIssueUpdateNotification(
      issue.reportedBy,
      issue._id,
      status,
      req.user._id
    );
  }

  const updatedIssue = await Issue.findById(req.params.id)
    .populate('reportedBy', 'username email')
    .populate('assignedTo', 'username email');

  // Process for response
  const processedIssue = updatedIssue.toObject();
  if (updatedIssue.isAnonymous || !updatedIssue.reportedBy) {
    processedIssue.reportedBy = {
      _id: null,
      username: 'Anonymous',
      email: null
    };
  }

  res.status(200).json({
    status: 'success',
    data: {
      issue: processedIssue
    }
  });
});

/**
 * @desc    Add comment to issue
 * @route   POST /api/issues/:id/comments
 * @access  Private
 */
const addComment = asyncHandler(async (req, res, next) => {
  const { content } = req.body;
  const issue = await Issue.findById(req.params.id);

  if (!issue) {
    return next(new AppError('Issue not found', 404));
  }

  // Add comment
  await issue.addComment(req.user._id, req.user.username, content);

  // Send notification to issue reporter (if not the same user and not anonymous)
  if (issue.reportedBy && 
      issue.reportedBy.toString() !== req.user._id.toString() && 
      !issue.isAnonymous) {
    await Notification.createCommentNotification(
      issue.reportedBy,
      issue._id,
      req.user.username,
      req.user._id
    );
  }

  const updatedIssue = await Issue.findById(req.params.id)
    .populate('reportedBy', 'username email')
    .populate('comments.user', 'username');

  // Process for response
  const processedIssue = updatedIssue.toObject();
  if (updatedIssue.isAnonymous || !updatedIssue.reportedBy) {
    processedIssue.reportedBy = {
      _id: null,
      username: 'Anonymous',
      email: null
    };
  }

  res.status(201).json({
    status: 'success',
    data: {
      issue: processedIssue
    }
  });
});

/**
 * @desc    Flag issue
 * @route   POST /api/issues/:id/flag
 * @access  Private
 */
const flagIssue = asyncHandler(async (req, res, next) => {
  const { reason, description } = req.body;
  const issue = await Issue.findById(req.params.id);

  if (!issue) {
    return next(new AppError('Issue not found', 404));
  }

  // Add flag
  await issue.addFlag(req.user._id, reason, description);

  res.status(200).json({
    status: 'success',
    message: 'Issue flagged successfully'
  });
});

/**
 * @desc    Remove flag from issue
 * @route   DELETE /api/issues/:id/flag
 * @access  Private
 */
const removeFlag = asyncHandler(async (req, res, next) => {
  const issue = await Issue.findById(req.params.id);

  if (!issue) {
    return next(new AppError('Issue not found', 404));
  }

  // Remove flag
  await issue.removeFlag(req.user._id);

  res.status(200).json({
    status: 'success',
    message: 'Flag removed successfully'
  });
});

/**
 * @desc    Upvote issue
 * @route   POST /api/issues/:id/upvote
 * @access  Private
 */
const upvoteIssue = asyncHandler(async (req, res, next) => {
  const issue = await Issue.findById(req.params.id);

  if (!issue) {
    return next(new AppError('Issue not found', 404));
  }

  await issue.addUpvote(req.user._id);

  res.status(200).json({
    status: 'success',
    message: 'Issue upvoted successfully'
  });
});

/**
 * @desc    Remove upvote from issue
 * @route   DELETE /api/issues/:id/upvote
 * @access  Private
 */
const removeUpvote = asyncHandler(async (req, res, next) => {
  const issue = await Issue.findById(req.params.id);

  if (!issue) {
    return next(new AppError('Issue not found', 404));
  }

  await issue.removeUpvote(req.user._id);

  res.status(200).json({
    status: 'success',
    message: 'Upvote removed successfully'
  });
});

/**
 * @desc    Get issues by user
 * @route   GET /api/issues/user/:userId
 * @access  Private
 */
const getUserIssues = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const issues = await Issue.find({ 
    reportedBy: req.params.userId,
    isHidden: false 
  })
    .populate('reportedBy', 'username')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Process issues for response
  const processedIssues = issues.map(issue => {
    const processedIssue = issue.toObject();
    if (issue.isAnonymous || !issue.reportedBy) {
      processedIssue.reportedBy = {
        _id: null,
        username: 'Anonymous'
      };
    }
    return processedIssue;
  });

  const total = await Issue.countDocuments({ 
    reportedBy: req.params.userId,
    isHidden: false 
  });

  res.status(200).json({
    status: 'success',
    results: processedIssues.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    data: {
      issues: processedIssues
    }
  });
});

/**
 * @desc    Get issues statistics
 * @route   GET /api/issues/stats
 * @access  Private (admin)
 */
const getIssueStats = asyncHandler(async (req, res, next) => {
  const stats = await Issue.aggregate([
    {
      $group: {
        _id: null,
        totalIssues: { $sum: 1 },
        reportedIssues: {
          $sum: { $cond: [{ $eq: ['$status', 'Reported'] }, 1, 0] }
        },
        inProgressIssues: {
          $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] }
        },
        resolvedIssues: {
          $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] }
        },
        rejectedIssues: {
          $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] }
        }
      }
    }
  ]);

  const categoryStats = await Issue.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  const monthlyStats = await Issue.aggregate([
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } },
    { $limit: 12 }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      overall: stats[0] || {},
      byCategory: categoryStats,
      byMonth: monthlyStats
    }
  });
});

module.exports = {
  createIssue,
  getIssues,
  getIssuesForMap,
  getIssue,
  updateIssue,
  deleteIssue,
  updateIssueStatus,
  addComment,
  flagIssue,
  removeFlag,
  upvoteIssue,
  removeUpvote,
  getUserIssues,
  getIssueStats
}; 