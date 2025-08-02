# Security Implementation & Distance Restrictions

This document outlines the comprehensive security measures and distance-based restrictions implemented in the CivicTrack backend.

## Table of Contents

1. [Route Protection Overview](#route-protection-overview)
2. [Distance-Based Restrictions](#distance-based-restrictions)
3. [Authentication & Authorization](#authentication--authorization)
4. [Anonymous Reporting Security](#anonymous-reporting-security)
5. [Geospatial Security](#geospatial-security)
6. [API Security Measures](#api-security-measures)
7. [Frontend Integration Security](#frontend-integration-security)

## Route Protection Overview

### Protected Routes Structure

```
/api/auth/*          - Public (Registration, Login, Password Reset)
/api/issues/*        - Distance-Protected (Location Required)
/api/users/*         - Authentication Required
/api/admin/*         - Admin Authentication Required
/health              - Public (Health Check)
```

### Route Protection Levels

| Route Type | Protection Level | Requirements |
|------------|------------------|--------------|
| `/api/auth/*` | Public | None |
| `/api/issues/*` | Distance-Protected | Location coordinates required |
| `/api/users/*` | Authenticated | Valid JWT token |
| `/api/admin/*` | Admin | Valid JWT token + Admin role |
| `/health` | Public | None |

## Distance-Based Restrictions

### Core Principle
**Users can ONLY access issues within 5km of their location. This is enforced at multiple levels:**

### 1. Database Level (MongoDB Geospatial Queries)
```javascript
// All issue queries include strict geospatial filtering
filter.location = {
  $near: {
    $geometry: {
      type: 'Point',
      coordinates: [userLng, userLat]
    },
    $maxDistance: maxDistanceMeters // Maximum 5km
  }
};
```

### 2. Middleware Level (Pre-Request Validation)
```javascript
// enforceDistanceRestrictions middleware
const enforceDistanceRestrictions = asyncHandler(async (req, res, next) => {
  const { latitude, longitude, distance } = req.query;
  const maxAllowedDistance = 5; // 5km maximum

  if (distance && parseFloat(distance) > maxAllowedDistance) {
    return next(new AppError(`Distance cannot exceed ${maxAllowedDistance}km for security reasons`, 400));
  }
  // ... coordinate validation
});
```

### 3. Controller Level (Post-Request Filtering)
```javascript
// Additional filtering after database query
const filterIssuesByDistance = asyncHandler(async (req, res, next) => {
  res.json = function(data) {
    if (data && data.data && data.data.issues) {
      data.data.issues = data.data.issues.filter(issue => {
        const calculatedDistance = calculateDistance(userLat, userLng, issueLat, issueLng);
        return calculatedDistance <= maxDistance;
      });
    }
    return originalJson.call(this, data);
  };
});
```

### 4. Individual Issue Access Control
```javascript
// preventOutOfAreaAccess middleware
const preventOutOfAreaAccess = asyncHandler(async (req, res, next) => {
  const issue = await Issue.findById(req.params.id);
  const distance = calculateDistance(userLat, userLng, issueLat, issueLng);
  
  if (distance > 5) {
    return next(new AppError('This issue is outside your allowed area. You can only access issues within 5km of your location.', 403));
  }
});
```

## Authentication & Authorization

### JWT Token Security
```javascript
// Token generation with secure settings
const token = jwt.sign(
  { id: user._id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN }
);

// Token verification with role checking
const authenticateToken = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return next(new AppError('Access token required', 401));
  }
  
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);
  
  if (!user || user.isBanned) {
    return next(new AppError('Invalid or banned user', 401));
  }
  
  req.user = user;
  next();
});
```

### Role-Based Access Control
```javascript
// Admin-only routes
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(new AppError('Admin access required', 403));
  }
  next();
};

// User ownership verification
const checkOwnership = (req, res, next) => {
  if (req.user.role === 'admin') return next();
  if (req.resource.userId.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only access your own resources', 403));
  }
  next();
};
```

## Anonymous Reporting Security

### Data Protection for Anonymous Reports
```javascript
// Anonymous data filtering
const filterAnonymousData = (issue, user = null) => {
  if (issue.isAnonymous || !issue.reportedBy) {
    return {
      ...issue,
      reportedBy: {
        _id: null,
        username: 'Anonymous',
        email: null
      },
      reporterName: 'Anonymous',
      isAnonymous: true
    };
  }
  return issue;
};
```

### Anonymous Report Creation
```javascript
// Anonymous report validation
const validateAnonymousReporting = (req, res, next) => {
  const { isAnonymous } = req.body;
  
  // Force anonymous for unauthenticated users
  if (!req.user && isAnonymous !== true) {
    req.body.isAnonymous = true;
  }
  
  next();
};
```

## Geospatial Security

### Coordinate Validation
```javascript
// Strict coordinate validation
const validateCoordinates = (latitude, longitude) => {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  
  if (isNaN(lat) || isNaN(lng) || 
      lat < -90 || lat > 90 || 
      lng < -180 || lng > 180) {
    return false;
  }
  return true;
};
```

### Distance Calculation Security
```javascript
// Haversine formula for accurate distance calculation
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};
```

## API Security Measures

### Rate Limiting
```javascript
// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);
```

### Input Validation
```javascript
// Comprehensive input validation
const validateIssueCreation = [
  body('title').trim().isLength({ min: 5, max: 100 }).withMessage('Title must be between 5 and 100 characters'),
  body('description').trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be between 10 and 1000 characters'),
  body('category').isIn(['Roads', 'Lighting', 'Water Supply', 'Cleanliness', 'Public Safety', 'Obstructions']).withMessage('Invalid category'),
  body('location.coordinates').isArray({ min: 2, max: 2 }).withMessage('Location coordinates required'),
  handleValidationErrors
];
```

### Security Headers
```javascript
// Helmet security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
```

### CORS Configuration
```javascript
// CORS security
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## Frontend Integration Security

### Required Parameters for All Issue Endpoints
```javascript
// All issue endpoints require location parameters
GET /api/issues?latitude=18.5204&longitude=73.8567&distance=5
GET /api/issues/map?latitude=18.5204&longitude=73.8567&distance=3
GET /api/issues/:id?latitude=18.5204&longitude=73.8567
```

### Error Responses for Security Violations
```javascript
// Distance violation
{
  "status": "error",
  "message": "This issue is outside your allowed area. You can only access issues within 5km of your location."
}

// Missing location
{
  "status": "error", 
  "message": "Location coordinates (latitude, longitude) are required for security"
}

// Invalid coordinates
{
  "status": "error",
  "message": "Invalid location coordinates provided"
}

// Distance limit exceeded
{
  "status": "error",
  "message": "Distance cannot exceed 5km for security reasons"
}
```

### Frontend Security Checklist

#### Required Implementation:
1. **Location Permission**: Request and validate user location
2. **Parameter Validation**: Always include latitude/longitude in requests
3. **Error Handling**: Handle security error responses gracefully
4. **Distance Display**: Show distance information to users
5. **Boundary Respect**: Don't allow users to view areas beyond 5km

#### Example Frontend Implementation:
```javascript
// Get user location and validate
async function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        resolve({ latitude, longitude });
      },
      (error) => {
        reject(new Error('Location access denied'));
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  });
}

// Fetch issues with location validation
async function fetchIssues(latitude, longitude, distance = 5) {
  // Enforce maximum distance
  const maxDistance = Math.min(distance, 5);
  
  const response = await fetch(
    `/api/issues/map?latitude=${latitude}&longitude=${longitude}&distance=${maxDistance}`
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  return response.json();
}
```

## Security Testing

### Test Cases for Distance Restrictions

1. **Valid Location Test**
   ```javascript
   // Should return issues within 5km
   GET /api/issues?latitude=18.5204&longitude=73.8567&distance=5
   ```

2. **Invalid Location Test**
   ```javascript
   // Should return 400 error
   GET /api/issues?latitude=200&longitude=200
   ```

3. **Missing Location Test**
   ```javascript
   // Should return 400 error
   GET /api/issues
   ```

4. **Distance Limit Test**
   ```javascript
   // Should return 400 error
   GET /api/issues?latitude=18.5204&longitude=73.8567&distance=10
   ```

5. **Out of Area Issue Test**
   ```javascript
   // Should return 403 error
   GET /api/issues/issueId?latitude=18.5204&longitude=73.8567
   // Where issueId is more than 5km away
   ```

## Environment Variables for Security

```env
# Security Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
MAX_SEARCH_RADIUS=5
DEFAULT_SEARCH_RADIUS=5

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload Security
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/jpg,image/webp
MAX_FILES_PER_ISSUE=5
```

## Summary

The CivicTrack backend implements comprehensive security measures:

1. **Distance Restrictions**: Users can only access issues within 5km
2. **Route Protection**: All routes are properly protected based on requirements
3. **Authentication**: JWT-based authentication with role-based access
4. **Anonymous Security**: Proper data protection for anonymous reports
5. **Input Validation**: Comprehensive validation for all inputs
6. **Rate Limiting**: Protection against abuse
7. **Security Headers**: Protection against common attacks

This ensures that users cannot access issues outside their neighborhood and all sensitive data is properly protected. 