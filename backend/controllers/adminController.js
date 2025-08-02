const User = require('../models/User');
const Issue = require('../models/Issue');
const Notification = require('../models/Notification');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

/**
 * @desc    Get all users (admin only)
 * @route   GET /api/admin/users
 * @access  Private (admin)
 */
const getAllUsers = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20, role, isBanned, search } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const filter = {};
  if (role) filter.role = role;
  if (isBanned !== undefined) filter.isBanned = isBanned === 'true';
  if (search) {
    filter.$or = [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const users = await User.find(filter)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await User.countDocuments(filter);

  res.status(200).json({
    status: 'success',
    results: users.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    data: {
      users
    }
  });
});

/**
 * @desc    Get user by ID (admin only)
 * @route   GET /api/admin/users/:id
 * @access  Private (admin)
 */
const getUserById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Get user's issues
  const issues = await Issue.find({ reportedBy: req.params.id })
    .select('title category status createdAt')
    .sort({ createdAt: -1 })
    .limit(10);

  res.status(200).json({
    status: 'success',
    data: {
      user,
      recentIssues: issues
    }
  });
});

/**
 * @desc    Update user (admin only)
 * @route   PATCH /api/admin/users/:id
 * @access  Private (admin)
 */
const updateUser = asyncHandler(async (req, res, next) => {
  const { role, isBanned, banReason } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Update user
  if (role) user.role = role;
  if (isBanned !== undefined) {
    user.isBanned = isBanned;
    user.banReason = isBanned ? banReason : null;
  }

  await user.save();

  res.status(200).json({
    status: 'success',
    data: {
      user: user.fullProfile
    }
  });
});

/**
 * @desc    Delete user (admin only)
 * @route   DELETE /api/admin/users/:id
 * @access  Private (admin)
 */
const deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Delete user's issues
  await Issue.deleteMany({ reportedBy: req.params.id });

  // Delete user's notifications
  await Notification.deleteMany({ recipient: req.params.id });

  // Delete user
  await User.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null
  });
});

/**
 * @desc    Ban user (admin only)
 * @route   POST /api/admin/users/:id/ban
 * @access  Private (admin)
 */
const banUser = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  await user.banUser(reason);

  res.status(200).json({
    status: 'success',
    message: 'User banned successfully',
    data: {
      user: user.fullProfile
    }
  });
});

/**
 * @desc    Unban user (admin only)
 * @route   POST /api/admin/users/:id/unban
 * @access  Private (admin)
 */
const unbanUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  await user.unbanUser();

  res.status(200).json({
    status: 'success',
    message: 'User unbanned successfully',
    data: {
      user: user.fullProfile
    }
  });
});

/**
 * @desc    Get flagged issues (admin/moderator)
 * @route   GET /api/admin/issues/flagged
 * @access  Private (admin/moderator)
 */
const getFlaggedIssues = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20, minFlags } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const filter = { flagCount: { $gt: 0 } };
  if (minFlags) filter.flagCount = { $gte: parseInt(minFlags) };

  const issues = await Issue.find(filter)
    .populate('reportedBy', 'username')
    .populate('flags.user', 'username')
    .sort({ flagCount: -1, createdAt: -1 })
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
 * @desc    Review flagged issue (admin/moderator)
 * @route   PATCH /api/admin/issues/:id/review
 * @access  Private (admin/moderator)
 */
const reviewFlaggedIssue = asyncHandler(async (req, res, next) => {
  const { action, reason } = req.body; // action: 'hide', 'unhide', 'delete'

  const issue = await Issue.findById(req.params.id);
  if (!issue) {
    return next(new AppError('Issue not found', 404));
  }

  switch (action) {
    case 'hide':
      issue.isHidden = true;
      issue.hiddenReason = reason || 'Hidden by moderator';
      break;
    case 'unhide':
      issue.isHidden = false;
      issue.hiddenReason = null;
      break;
    case 'delete':
      await Issue.findByIdAndDelete(req.params.id);
      return res.status(200).json({
        status: 'success',
        message: 'Issue deleted successfully'
      });
    default:
      return next(new AppError('Invalid action', 400));
  }

  await issue.save();

  res.status(200).json({
    status: 'success',
    message: `Issue ${action}ed successfully`,
    data: {
      issue
    }
  });
});

/**
 * @desc    Assign issue to user (admin only)
 * @route   POST /api/admin/issues/:id/assign
 * @access  Private (admin)
 */
const assignIssue = asyncHandler(async (req, res, next) => {
  const { userId } = req.body;

  const issue = await Issue.findById(req.params.id);
  if (!issue) {
    return next(new AppError('Issue not found', 404));
  }

  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  await issue.assignTo(userId, req.user._id, req.user.username);

  res.status(200).json({
    status: 'success',
    message: 'Issue assigned successfully',
    data: {
      issue
    }
  });
});

/**
 * @desc    Bulk update issues (admin only)
 * @route   POST /api/admin/issues/bulk-update
 * @access  Private (admin)
 */
const bulkUpdateIssues = asyncHandler(async (req, res, next) => {
  const { issueIds, updates } = req.body;

  if (!issueIds || !Array.isArray(issueIds) || issueIds.length === 0) {
    return next(new AppError('Issue IDs are required', 400));
  }

  const result = await Issue.updateMany(
    { _id: { $in: issueIds } },
    updates
  );

  res.status(200).json({
    status: 'success',
    message: `${result.modifiedCount} issues updated successfully`,
    data: {
      modifiedCount: result.modifiedCount
    }
  });
});

/**
 * @desc    Get admin statistics (admin only)
 * @route   GET /api/admin/stats
 * @access  Private (admin)
 */
const getAdminStats = asyncHandler(async (req, res, next) => {
  // User statistics
  const userStats = await User.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        verifiedUsers: { $sum: { $cond: ['$isVerified', 1, 0] } },
        bannedUsers: { $sum: { $cond: ['$isBanned', 1, 0] } },
        activeUsers: {
          $sum: {
            $cond: [
              { $gte: ['$lastActive', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);

  // Issue statistics
  const issueStats = await Issue.aggregate([
    {
      $group: {
        _id: null,
        totalIssues: { $sum: 1 },
        hiddenIssues: { $sum: { $cond: ['$isHidden', 1, 0] } },
        flaggedIssues: { $sum: { $cond: [{ $gt: ['$flagCount', 0] }, 1, 0] } },
        anonymousIssues: { $sum: { $cond: ['$isAnonymous', 1, 0] } }
      }
    }
  ]);

  // Category statistics
  const categoryStats = await Issue.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } }
      }
    },
    { $sort: { count: -1 } }
  ]);

  // Recent activity
  const recentIssues = await Issue.find()
    .populate('reportedBy', 'username')
    .sort({ createdAt: -1 })
    .limit(10);

  const recentUsers = await User.find()
    .select('username email createdAt')
    .sort({ createdAt: -1 })
    .limit(10);

  res.status(200).json({
    status: 'success',
    data: {
      users: userStats[0] || {},
      issues: issueStats[0] || {},
      categories: categoryStats,
      recentActivity: {
        issues: recentIssues,
        users: recentUsers
      }
    }
  });
});

module.exports = {
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
}; 