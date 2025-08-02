# CivicTrack Backend

A comprehensive backend API for CivicTrack - a civic issue reporting and tracking application that empowers citizens to report and track local community issues.

## 🚀 Features

### Core Features
- **User Authentication & Authorization** - JWT-based authentication with role-based access control
- **Issue Reporting** - Create, update, and track civic issues with photos and location data
- **Geospatial Queries** - Find issues within specified radius using GPS coordinates
- **Real-time Notifications** - Socket.IO integration for live updates
- **File Upload** - Cloudinary integration for image storage and optimization
- **Moderation System** - Flag inappropriate content with auto-hiding capabilities
- **Admin Dashboard** - Comprehensive admin panel with analytics and user management

### Issue Categories
- 🛣️ Roads (potholes, obstructions)
- 💡 Lighting (broken or flickering lights)
- 💧 Water Supply (leaks, low pressure)
- 🗑️ Cleanliness (overflowing bins, garbage)
- 🚨 Public Safety (open manholes, exposed wiring)
- 🌳 Obstructions (fallen trees, debris)

### User Roles
- **User** - Report issues, comment, upvote, flag content
- **Moderator** - Review flagged content, manage issues
- **Admin** - Full system access, user management, analytics

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: Cloudinary
- **Real-time**: Socket.IO
- **Validation**: Express-validator, Joi
- **Security**: Helmet, CORS, Rate Limiting
- **Email**: Nodemailer

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account
- Cloudinary account
- Email service (Gmail, SendGrid, etc.)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd civictrack-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `config.env` file in the root directory:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # MongoDB Configuration
   MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/civictrack

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRES_IN=7d

   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

   # Email Configuration
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password

   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100

   # File Upload Configuration
   MAX_FILE_SIZE=5242880
   ALLOWED_FILE_TYPES=image/jpeg,image/png,image/jpg,image/webp
   MAX_FILES_PER_ISSUE=5

   # Distance Configuration
   DEFAULT_SEARCH_RADIUS=5
   MAX_SEARCH_RADIUS=10

   # Spam Detection
   SPAM_FLAG_THRESHOLD=3
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "password": "SecurePass123",
  "location": {
    "coordinates": [72.8777, 19.0760],
    "address": "Mumbai, Maharashtra, India"
  }
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <jwt_token>
```

### Issue Endpoints

#### Create Issue
```http
POST /api/issues
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

{
  "title": "Pothole on Main Street",
  "description": "Large pothole causing traffic issues",
  "category": "Roads",
  "location": {
    "coordinates": [72.8777, 19.0760],
    "address": "Main Street, Mumbai"
  },
  "isAnonymous": false,
  "images": [file1, file2]
}
```

#### Get Issues (with filtering)
```http
GET /api/issues?category=Roads&status=Reported&distance=5&latitude=19.0760&longitude=72.8777&page=1&limit=20
```

#### Get Single Issue
```http
GET /api/issues/:id
```

#### Update Issue
```http
PATCH /api/issues/:id
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "status": "In Progress",
  "priority": "High"
}
```

#### Add Comment
```http
POST /api/issues/:id/comments
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "content": "This issue has been reported to the authorities"
}
```

#### Flag Issue
```http
POST /api/issues/:id/flag
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "reason": "Spam",
  "description": "Duplicate issue"
}
```

### User Endpoints

#### Get User Profile
```http
GET /api/users/profile
Authorization: Bearer <jwt_token>
```

#### Update Profile
```http
PATCH /api/users/profile
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "username": "new_username",
  "phone": "9876543210"
}
```

#### Get User's Issues
```http
GET /api/users/issues?page=1&limit=20&status=Reported
Authorization: Bearer <jwt_token>
```

### Admin Endpoints

#### Get All Users
```http
GET /api/admin/users?page=1&limit=20&role=user&search=john
Authorization: Bearer <jwt_token>
```

#### Get Flagged Issues
```http
GET /api/admin/issues/flagged?page=1&limit=20&minFlags=3
Authorization: Bearer <jwt_token>
```

#### Review Flagged Issue
```http
PATCH /api/admin/issues/:id/review
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "action": "hide",
  "reason": "Inappropriate content"
}
```

#### Get Admin Statistics
```http
GET /api/admin/stats
Authorization: Bearer <jwt_token>
```

## 🔐 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcryptjs for password security
- **Input Validation** - Comprehensive request validation
- **Rate Limiting** - Protection against brute force attacks
- **CORS Protection** - Cross-origin resource sharing security
- **Helmet** - Security headers middleware
- **SQL Injection Protection** - MongoDB with parameterized queries
- **File Upload Security** - File type and size validation

## 📊 Database Schema

### User Schema
```javascript
{
  username: String (unique),
  email: String (unique),
  phone: String,
  password: String (hashed),
  role: String (user/moderator/admin),
  location: {
    coordinates: [Number, Number],
    address: String
  },
  isVerified: Boolean,
  isBanned: Boolean,
  notificationSettings: Object,
  reportCount: Number,
  resolvedIssuesCount: Number
}
```

### Issue Schema
```javascript
{
  title: String,
  description: String,
  category: String,
  status: String,
  location: {
    coordinates: [Number, Number],
    address: String
  },
  images: [{
    url: String,
    publicId: String
  }],
  reportedBy: ObjectId (ref: User),
  isAnonymous: Boolean,
  activityLog: [Object],
  comments: [Object],
  flags: [Object],
  upvotes: [ObjectId],
  priority: String,
  severity: String
}
```

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=6000
MONGODB_URL=your_production_mongodb_url
JWT_SECRET=your_secure_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
EMAIL_HOST=your_email_host
EMAIL_USER=your_email_user
EMAIL_PASS=your_email_password
```

### Deployment Platforms
- **Heroku** - Easy deployment with Git integration
- **Vercel** - Serverless deployment
- **AWS EC2** - Traditional server deployment
- **DigitalOcean** - Droplet deployment

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📝 API Response Format

### Success Response
```json
{
  "status": "success",
  "data": {
    // Response data
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Error Response
```json
{
  "status": "error",
  "message": "Error description"
}
```

## 🔧 Configuration

### File Upload Limits
- **Max File Size**: 5MB per file
- **Max Files**: 5 files per issue
- **Allowed Types**: JPEG, PNG, JPG, WebP

### Distance Settings
- **Default Search Radius**: 5km
- **Max Search Radius**: 10km
- **Distance Calculation**: Haversine formula

### Spam Protection
- **Flag Threshold**: 3 flags to auto-hide
- **Rate Limiting**: 100 requests per 15 minutes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact: support@civictrack.com
- Documentation: [docs.civictrack.com](https://docs.civictrack.com)

## 🔄 Version History

- **v1.0.0** - Initial release with core features
- **v1.1.0** - Added real-time notifications
- **v1.2.0** - Enhanced admin dashboard
- **v1.3.0** - Improved geospatial queries

---

**CivicTrack** - Empowering citizens to make their communities better! 🏘️✨ 
