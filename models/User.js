const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * User Schema for CivicTrack application
 * Handles user authentication, profile management, and role-based access
 */
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  banReason: {
    type: String,
    default: null
  },
  profilePicture: {
    type: String,
    default: null
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true,
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
      required: [true, 'Address is required']
    }
  },
  notificationSettings: {
    email: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: false
    }
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  reportCount: {
    type: Number,
    default: 0
  },
  resolvedIssuesCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for geospatial queries
userSchema.index({ location: '2dsphere' });

// Index for email and username lookups
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

// Virtual for user's full profile
userSchema.virtual('fullProfile').get(function() {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    phone: this.phone,
    role: this.role,
    isVerified: this.isVerified,
    profilePicture: this.profilePicture,
    location: this.location,
    reportCount: this.reportCount,
    resolvedIssuesCount: this.resolvedIssuesCount,
    createdAt: this.createdAt
  };
});

/**
 * Hash password before saving
 */
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Hash password with cost of 12
    const hashedPassword = await bcrypt.hash(this.password, 12);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Compare password with hashed password
 * @param {string} candidatePassword - Password to compare
 * @returns {Promise<boolean>} - True if passwords match
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Generate JWT token for user
 * @returns {string} - JWT token
 */
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      id: this._id, 
      username: this.username, 
      email: this.email, 
      role: this.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

/**
 * Update user's last active timestamp
 */
userSchema.methods.updateLastActive = function() {
  this.lastActive = new Date();
  return this.save();
};

/**
 * Increment user's report count
 */
userSchema.methods.incrementReportCount = function() {
  this.reportCount += 1;
  return this.save();
};

/**
 * Increment user's resolved issues count
 */
userSchema.methods.incrementResolvedCount = function() {
  this.resolvedIssuesCount += 1;
  return this.save();
};

/**
 * Ban user with reason
 * @param {string} reason - Reason for banning
 */
userSchema.methods.banUser = function(reason) {
  this.isBanned = true;
  this.banReason = reason;
  return this.save();
};

/**
 * Unban user
 */
userSchema.methods.unbanUser = function() {
  this.isBanned = false;
  this.banReason = null;
  return this.save();
};

module.exports = mongoose.model('User', userSchema); 