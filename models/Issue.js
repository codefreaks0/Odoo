const mongoose = require('mongoose');

/**
 * Issue Schema for CivicTrack application
 * Handles civic issue reporting, tracking, and management
 */
const issueSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Issue title is required'],
    trim: true,
    minlength: [5, 'Title must be at least 5 characters long'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Issue description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters long'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Issue category is required'],
    enum: {
      values: ['Roads', 'Lighting', 'Water Supply', 'Cleanliness', 'Public Safety', 'Obstructions'],
      message: 'Category must be one of: Roads, Lighting, Water Supply, Cleanliness, Public Safety, Obstructions'
    }
  },
  status: {
    type: String,
    required: true,
    enum: {
      values: ['Reported', 'In Progress', 'Resolved', 'Rejected'],
      message: 'Status must be one of: Reported, In Progress, Resolved, Rejected'
    },
    default: 'Reported'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: [true, 'Location coordinates are required'],
      validate: {
        validator: function(coords) {
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 && 
                 coords[1] >= -90 && coords[1] <= 90;
        },
        message: 'Invalid coordinates. Longitude must be between -180 and 180, latitude between -90 and 90.'
      }
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true
    }
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Allow anonymous reporting
    default: null
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedAt: {
    type: Date,
    default: null
  },
  estimatedResolutionTime: {
    type: Date,
    default: null
  },
  actualResolutionTime: {
    type: Date,
    default: null
  },
  activityLog: [{
    action: {
      type: String,
      required: true,
      enum: ['Created', 'Status Updated', 'Assigned', 'Comment Added', 'Image Added', 'Flagged', 'Resolved']
    },
    details: {
      type: String,
      required: true
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    actorName: {
      type: String,
      default: 'System'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    isEdited: {
      type: Boolean,
      default: false
    }
  }],
  flags: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reason: {
      type: String,
      required: true,
      enum: ['Spam', 'Inappropriate', 'Duplicate', 'False Information', 'Other']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Flag description cannot exceed 200 characters']
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  flagCount: {
    type: Number,
    default: 0
  },
  isHidden: {
    type: Boolean,
    default: false
  },
  hiddenReason: {
    type: String,
    default: null
  },
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  upvoteCount: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  severity: {
    type: String,
    enum: ['Minor', 'Moderate', 'Major', 'Critical'],
    default: 'Moderate'
  },
  affectedArea: {
    type: String,
    trim: true,
    maxlength: [200, 'Affected area description cannot exceed 200 characters']
  },
  weatherCondition: {
    type: String,
    enum: ['Clear', 'Rainy', 'Snowy', 'Foggy', 'Other'],
    default: 'Clear'
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  resolutionNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Resolution notes cannot exceed 1000 characters']
  },
  costEstimate: {
    type: Number,
    min: [0, 'Cost estimate cannot be negative']
  },
  department: {
    type: String,
    trim: true,
    maxlength: [100, 'Department name cannot exceed 100 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
issueSchema.index({ location: '2dsphere' });
issueSchema.index({ status: 1, category: 1 });
issueSchema.index({ reportedBy: 1 });
issueSchema.index({ assignedTo: 1 });
issueSchema.index({ createdAt: -1 });
issueSchema.index({ flagCount: -1 });
issueSchema.index({ upvoteCount: -1 });
issueSchema.index({ isHidden: 1 });

// Virtual for issue summary
issueSchema.virtual('summary').get(function() {
  return {
    id: this._id,
    title: this.title,
    category: this.category,
    status: this.status,
    priority: this.priority,
    location: this.location,
    flagCount: this.flagCount,
    upvoteCount: this.upvoteCount,
    createdAt: this.createdAt,
    isHidden: this.isHidden
  };
});

// Virtual for calculating issue age
issueSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for checking if issue is overdue
issueSchema.virtual('isOverdue').get(function() {
  if (!this.estimatedResolutionTime) return false;
  return new Date() > this.estimatedResolutionTime && this.status !== 'Resolved';
});

/**
 * Add activity log entry
 * @param {string} action - The action performed
 * @param {string} details - Details about the action
 * @param {ObjectId} actor - User who performed the action
 * @param {string} actorName - Name of the actor
 */
issueSchema.methods.addActivityLog = function(action, details, actor = null, actorName = 'System') {
  this.activityLog.push({
    action,
    details,
    actor,
    actorName,
    timestamp: new Date()
  });
  return this.save();
};

/**
 * Update issue status
 * @param {string} newStatus - New status
 * @param {ObjectId} actor - User updating the status
 * @param {string} actorName - Name of the actor
 * @param {string} notes - Additional notes
 */
issueSchema.methods.updateStatus = function(newStatus, actor = null, actorName = 'System', notes = '') {
  const oldStatus = this.status;
  this.status = newStatus;
  
  if (newStatus === 'Resolved') {
    this.actualResolutionTime = new Date();
  }
  
  const details = `Status changed from ${oldStatus} to ${newStatus}${notes ? ` - ${notes}` : ''}`;
  this.addActivityLog('Status Updated', details, actor, actorName);
  
  return this.save();
};

/**
 * Add flag to issue
 * @param {ObjectId} userId - User flagging the issue
 * @param {string} reason - Reason for flagging
 * @param {string} description - Additional description
 */
issueSchema.methods.addFlag = function(userId, reason, description = '') {
  // Check if user already flagged this issue
  const existingFlag = this.flags.find(flag => flag.user.toString() === userId.toString());
  if (existingFlag) {
    throw new Error('User has already flagged this issue');
  }
  
  this.flags.push({
    user: userId,
    reason,
    description,
    timestamp: new Date()
  });
  
  this.flagCount = this.flags.length;
  
  // Auto-hide if flag count exceeds threshold
  if (this.flagCount >= parseInt(process.env.SPAM_FLAG_THRESHOLD) && !this.isHidden) {
    this.isHidden = true;
    this.hiddenReason = 'Auto-hidden due to multiple flags';
  }
  
  this.addActivityLog('Flagged', `Issue flagged as ${reason}`, userId, 'User');
  
  return this.save();
};

/**
 * Remove flag from issue
 * @param {ObjectId} userId - User whose flag to remove
 */
issueSchema.methods.removeFlag = function(userId) {
  this.flags = this.flags.filter(flag => flag.user.toString() !== userId.toString());
  this.flagCount = this.flags.length;
  
  // Unhide if flag count drops below threshold
  if (this.flagCount < parseInt(process.env.SPAM_FLAG_THRESHOLD) && this.isHidden && this.hiddenReason === 'Auto-hidden due to multiple flags') {
    this.isHidden = false;
    this.hiddenReason = null;
  }
  
  return this.save();
};

/**
 * Add upvote to issue
 * @param {ObjectId} userId - User upvoting the issue
 */
issueSchema.methods.addUpvote = function(userId) {
  if (!this.upvotes.includes(userId)) {
    this.upvotes.push(userId);
    this.upvoteCount = this.upvotes.length;
  }
  return this.save();
};

/**
 * Remove upvote from issue
 * @param {ObjectId} userId - User removing upvote
 */
issueSchema.methods.removeUpvote = function(userId) {
  this.upvotes = this.upvotes.filter(id => id.toString() !== userId.toString());
  this.upvoteCount = this.upvotes.length;
  return this.save();
};

/**
 * Add comment to issue
 * @param {ObjectId} userId - User adding comment
 * @param {string} username - Username of commenter
 * @param {string} content - Comment content
 */
issueSchema.methods.addComment = function(userId, username, content) {
  this.comments.push({
    user: userId,
    username,
    content,
    timestamp: new Date()
  });
  
  this.addActivityLog('Comment Added', `Comment added by ${username}`, userId, username);
  
  return this.save();
};

/**
 * Assign issue to user
 * @param {ObjectId} userId - User to assign issue to
 * @param {ObjectId} actor - User making the assignment
 * @param {string} actorName - Name of the actor
 */
issueSchema.methods.assignTo = function(userId, actor = null, actorName = 'System') {
  this.assignedTo = userId;
  this.assignedAt = new Date();
  
  this.addActivityLog('Assigned', `Issue assigned to user ${userId}`, actor, actorName);
  
  return this.save();
};

module.exports = mongoose.model('Issue', issueSchema); 