const express = require('express');
const multer = require('multer');
const {
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
} = require('../controllers/issueController');

const {
  validateIssueCreation,
  validateIssueUpdate,
  validateIssueId,
  validateIssueFilters,
  validateComment,
  validateFlag
} = require('../middleware/validationMiddleware');

const { 
  authenticateToken, 
  optionalAuth,
  restrictTo 
} = require('../middleware/authMiddleware');

const { 
  validateAnonymousReporting, 
  applyAnonymousFiltering 
} = require('../middleware/anonymousMiddleware');

const {
  enforceDistanceRestrictions,
  validateUserLocation,
  filterIssuesByDistance,
  preventOutOfAreaAccess,
  enforceLocationRestrictions,
  addDistanceInfo
} = require('../middleware/distanceMiddleware');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
    files: parseInt(process.env.MAX_FILES_PER_ISSUE) || 5
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/webp'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'), false);
    }
  }
});

/**
 * @route   POST /api/issues
 * @desc    Create new issue
 * @access  Private/Public (anonymous reporting)
 */
router.post('/', 
  optionalAuth,
  upload.array('images', parseInt(process.env.MAX_FILES_PER_ISSUE) || 5),
  ...validateIssueCreation,
  validateAnonymousReporting,
  enforceLocationRestrictions,
  createIssue
);

/**
 * @route   GET /api/issues
 * @desc    Get all issues with filtering and pagination
 * @access  Public
 */
router.get('/', 
  ...validateIssueFilters, 
  enforceLocationRestrictions,
  validateUserLocation,
  enforceDistanceRestrictions,
  applyAnonymousFiltering,
  addDistanceInfo,
  getIssues
);

/**
 * @route   GET /api/issues/map
 * @desc    Get issues optimized for map display (Leaflet.js)
 * @access  Public
 */
router.get('/map', 
  ...validateIssueFilters, 
  enforceLocationRestrictions,
  validateUserLocation,
  enforceDistanceRestrictions,
  applyAnonymousFiltering,
  addDistanceInfo,
  getIssuesForMap
);

/**
 * @route   GET /api/issues/stats
 * @desc    Get issues statistics
 * @access  Private (admin)
 */
router.get('/stats', authenticateToken, restrictTo('admin'), getIssueStats);

/**
 * @route   GET /api/issues/:id
 * @desc    Get single issue by ID
 * @access  Public
 */
router.get('/:id', 
  validateIssueId, 
  enforceLocationRestrictions,
  validateUserLocation,
  preventOutOfAreaAccess,
  applyAnonymousFiltering,
  addDistanceInfo,
  getIssue
);

/**
 * @route   PATCH /api/issues/:id
 * @desc    Update issue
 * @access  Private (owner or admin)
 */
router.patch('/:id',
  authenticateToken,
  upload.array('images', parseInt(process.env.MAX_FILES_PER_ISSUE) || 5),
  ...validateIssueId,
  ...validateIssueUpdate,
  updateIssue
);

/**
 * @route   DELETE /api/issues/:id
 * @desc    Delete issue
 * @access  Private (owner or admin)
 */
router.delete('/:id',
  authenticateToken,
  ...validateIssueId,
  deleteIssue
);

/**
 * @route   PATCH /api/issues/:id/status
 * @desc    Update issue status
 * @access  Private (admin or assigned user)
 */
router.patch('/:id/status',
  authenticateToken,
  ...validateIssueId,
  updateIssueStatus
);

/**
 * @route   POST /api/issues/:id/comments
 * @desc    Add comment to issue
 * @access  Private
 */
router.post('/:id/comments',
  authenticateToken,
  ...validateIssueId,
  ...validateComment,
  addComment
);

/**
 * @route   POST /api/issues/:id/flag
 * @desc    Flag issue
 * @access  Private
 */
router.post('/:id/flag',
  authenticateToken,
  ...validateIssueId,
  ...validateFlag,
  flagIssue
);

/**
 * @route   DELETE /api/issues/:id/flag
 * @desc    Remove flag from issue
 * @access  Private
 */
router.delete('/:id/flag',
  authenticateToken,
  ...validateIssueId,
  removeFlag
);

/**
 * @route   POST /api/issues/:id/upvote
 * @desc    Upvote issue
 * @access  Private
 */
router.post('/:id/upvote',
  authenticateToken,
  ...validateIssueId,
  upvoteIssue
);

/**
 * @route   DELETE /api/issues/:id/upvote
 * @desc    Remove upvote from issue
 * @access  Private
 */
router.delete('/:id/upvote',
  authenticateToken,
  ...validateIssueId,
  removeUpvote
);

/**
 * @route   GET /api/issues/user/:userId
 * @desc    Get issues by user
 * @access  Private
 */
router.get('/user/:userId',
  authenticateToken,
  getUserIssues
);

module.exports = router; 