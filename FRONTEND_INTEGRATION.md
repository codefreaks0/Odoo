# Frontend Integration Guide for CivicTrack

This guide provides comprehensive documentation for integrating the CivicTrack backend with frontend applications, specifically focusing on Leaflet.js map integration and anonymous reporting functionality.

## Table of Contents

1. [Map Integration with Leaflet.js](#map-integration-with-leafletjs)
2. [Anonymous Reporting Implementation](#anonymous-reporting-implementation)
3. [API Endpoints for Frontend](#api-endpoints-for-frontend)
4. [Data Restrictions and Privacy](#data-restrictions-and-privacy)
5. [Real-time Updates](#real-time-updates)
6. [Error Handling](#error-handling)
7. [Example Frontend Code](#example-frontend-code)

## Map Integration with Leaflet.js

### Overview

The backend provides optimized endpoints specifically designed for Leaflet.js map integration. These endpoints include proper data filtering, geospatial queries, and anonymous user handling.

### Key Map Endpoints

#### 1. Get Issues for Map Display
```javascript
GET /api/issues/map
```

**Query Parameters:**
- `latitude` (number): User's latitude
- `longitude` (number): User's longitude
- `distance` (number): Search radius in km (default: 5)
- `category` (string): Filter by category
- `status` (string): Filter by status
- `bounds` (string): Map bounds as JSON string

**Response Format:**
```json
{
  "status": "success",
  "results": 15,
  "data": {
    "issues": [
      {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
        "title": "Pothole on Main Street",
        "category": "Roads",
        "status": "Reported",
        "priority": "High",
        "location": {
          "type": "Point",
          "coordinates": [73.8567, 18.5204],
          "address": "Main Street, Pune"
        },
        "reporterName": "Anonymous",
        "isAnonymous": true,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "upvoteCount": 5,
        "flagCount": 0,
        "hasImages": true,
        "imageUrl": "https://res.cloudinary.com/...",
        "distance": 2.3
      }
    ]
  }
}
```

#### 2. Get All Issues (with map filtering)
```javascript
GET /api/issues?forMap=true&latitude=18.5204&longitude=73.8567&distance=3
```

### Map Data Processing

The backend automatically processes data for map display:

1. **Anonymous User Handling**: All anonymous reports show "Anonymous" as reporter name
2. **Distance Calculation**: Automatically calculates distance from user location
3. **Image Optimization**: Only includes first image URL for map markers
4. **Geospatial Filtering**: Filters issues based on user location and search radius

## Anonymous Reporting Implementation

### How Anonymous Reporting Works

1. **Database Storage**: Anonymous reports are stored with `isAnonymous: true` and `reportedBy: null`
2. **Frontend Display**: All anonymous reports show "Anonymous" as the reporter name
3. **Privacy Protection**: Sensitive user data is never exposed for anonymous reports

### Anonymous Report Creation

```javascript
// Create anonymous report (no authentication required)
POST /api/issues
Content-Type: multipart/form-data

{
  "title": "Broken Street Light",
  "description": "Street light not working for 3 days",
  "category": "Lighting",
  "location": {
    "coordinates": [73.8567, 18.5204],
    "address": "Park Street, Pune"
  },
  "isAnonymous": true,
  "images": [file1, file2] // Optional
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "issue": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "title": "Broken Street Light",
      "reporterName": "Anonymous",
      "isAnonymous": true,
      "reportedBy": {
        "_id": null,
        "username": "Anonymous",
        "email": null
      }
    }
  }
}
```

### Authenticated User Anonymous Reporting

Authenticated users can also choose to report anonymously:

```javascript
// Authenticated user choosing anonymous reporting
POST /api/issues
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "title": "Water Leak",
  "description": "Water leaking from main pipe",
  "category": "Water Supply",
  "location": {
    "coordinates": [73.8567, 18.5204],
    "address": "Residential Area, Pune"
  },
  "isAnonymous": true
}
```

## API Endpoints for Frontend

### Core Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/issues/map` | GET | Get issues for map display | No |
| `/api/issues` | GET | Get all issues with filtering | No |
| `/api/issues/:id` | GET | Get single issue details | No |
| `/api/issues` | POST | Create new issue | Optional |
| `/api/auth/register` | POST | User registration | No |
| `/api/auth/login` | POST | User login | No |

### Authentication Endpoints

```javascript
// Register new user
POST /api/auth/register
{
  "username": "john_doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "password": "securepassword123",
  "location": {
    "coordinates": [73.8567, 18.5204],
    "address": "Pune, Maharashtra"
  }
}

// Login user
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

### Issue Management Endpoints

```javascript
// Update issue status (admin/assigned user only)
PATCH /api/issues/:id/status
Authorization: Bearer <token>
{
  "status": "In Progress",
  "notes": "Work started on fixing the issue"
}

// Add comment to issue
POST /api/issues/:id/comments
Authorization: Bearer <token>
{
  "content": "This issue has been ongoing for weeks"
}

// Flag issue as inappropriate
POST /api/issues/:id/flag
Authorization: Bearer <token>
{
  "reason": "Spam",
  "description": "This appears to be a duplicate report"
}
```

## Data Restrictions and Privacy

### Anonymous Data Protection

The backend implements comprehensive data protection for anonymous reports:

1. **Reporter Information**: Always shows "Anonymous" for anonymous reports
2. **Email Protection**: Email addresses are never exposed for anonymous reports
3. **User ID Protection**: No user IDs are exposed for anonymous reports
4. **Activity Log Filtering**: Activity logs are sanitized for privacy

### Distance-Based Restrictions

```javascript
// Issues are automatically filtered by distance
GET /api/issues/map?latitude=18.5204&longitude=73.8567&distance=3

// Only issues within 3km radius will be returned
// Users cannot see issues outside their neighborhood
```

### Role-Based Access Control

- **Public Users**: Can view issues, create anonymous reports
- **Authenticated Users**: Can create named reports, comment, upvote, flag
- **Admin Users**: Can manage all issues, ban users, view analytics

## Real-time Updates

### Socket.IO Integration

The backend provides real-time updates via Socket.IO:

```javascript
// Connect to Socket.IO
const socket = io('http://localhost:5000');

// Authenticate user
socket.emit('authenticate', { token: 'your-jwt-token' });

// Join location-based room
socket.emit('joinLocation', {
  latitude: 18.5204,
  longitude: 73.8567,
  radius: 5
});

// Listen for new issues
socket.on('newIssue', (issue) => {
  console.log('New issue reported:', issue);
  // Add marker to map
});

// Listen for status updates
socket.on('statusUpdate', (data) => {
  console.log('Issue status updated:', data);
  // Update marker on map
});
```

## Error Handling

### Common Error Responses

```javascript
// 400 Bad Request
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    {
      "field": "title",
      "message": "Title is required"
    }
  ]
}

// 401 Unauthorized
{
  "status": "error",
  "message": "Authentication required"
}

// 403 Forbidden
{
  "status": "error",
  "message": "You can only update your own issues"
}

// 404 Not Found
{
  "status": "error",
  "message": "Issue not found"
}

// 429 Too Many Requests
{
  "status": "error",
  "message": "Rate limit exceeded"
}
```

### Frontend Error Handling

```javascript
async function fetchIssues(latitude, longitude, distance = 5) {
  try {
    const response = await fetch(
      `/api/issues/map?latitude=${latitude}&longitude=${longitude}&distance=${distance}`
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    
    const data = await response.json();
    return data.data.issues;
  } catch (error) {
    console.error('Error fetching issues:', error);
    // Handle error in UI
    showErrorMessage(error.message);
  }
}
```

## Example Frontend Code

### Basic Leaflet.js Integration

```html
<!DOCTYPE html>
<html>
<head>
    <title>CivicTrack Map</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
</head>
<body>
    <div id="map" style="height: 500px;"></div>
    
    <script>
        // Initialize map
        const map = L.map('map').setView([18.5204, 73.8567], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        // Fetch and display issues
        async function loadIssues() {
            try {
                const response = await fetch('/api/issues/map?latitude=18.5204&longitude=73.8567&distance=5');
                const data = await response.json();
                
                data.data.issues.forEach(issue => {
                    const marker = L.marker([
                        issue.location.coordinates[1],
                        issue.location.coordinates[0]
                    ]).addTo(map);
                    
                    const popupContent = `
                        <div>
                            <h4>${issue.title}</h4>
                            <p><strong>Category:</strong> ${issue.category}</p>
                            <p><strong>Status:</strong> ${issue.status}</p>
                            <p><strong>Reported by:</strong> ${issue.reporterName}</p>
                            <p><strong>Distance:</strong> ${issue.distance?.toFixed(2)} km</p>
                            <button onclick="viewDetails('${issue._id}')">View Details</button>
                        </div>
                    `;
                    
                    marker.bindPopup(popupContent);
                });
            } catch (error) {
                console.error('Error loading issues:', error);
            }
        }
        
        // Load issues when page loads
        loadIssues();
        
        // Function to view issue details
        function viewDetails(issueId) {
            window.open(`/issue/${issueId}`, '_blank');
        }
    </script>
</body>
</html>
```

### React Component Example

```jsx
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

const CivicTrackMap = () => {
  const [issues, setIssues] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  
  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });
          fetchIssues(latitude, longitude);
        },
        (error) => {
          console.error('Error getting location:', error);
          // Use default location
          fetchIssues(18.5204, 73.8567);
        }
      );
    }
  }, []);
  
  const fetchIssues = async (lat, lng) => {
    try {
      const response = await fetch(
        `/api/issues/map?latitude=${lat}&longitude=${lng}&distance=5`
      );
      const data = await response.json();
      setIssues(data.data.issues);
    } catch (error) {
      console.error('Error fetching issues:', error);
    }
  };
  
  return (
    <MapContainer
      center={userLocation ? [userLocation.latitude, userLocation.longitude] : [18.5204, 73.8567]}
      zoom={13}
      style={{ height: '500px', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='© OpenStreetMap contributors'
      />
      
      {issues.map(issue => (
        <Marker
          key={issue._id}
          position={[issue.location.coordinates[1], issue.location.coordinates[0]]}
        >
          <Popup>
            <div>
              <h4>{issue.title}</h4>
              <p><strong>Category:</strong> {issue.category}</p>
              <p><strong>Status:</strong> {issue.status}</p>
              <p><strong>Reported by:</strong> {issue.reporterName}</p>
              {issue.distance && (
                <p><strong>Distance:</strong> {issue.distance.toFixed(2)} km</p>
              )}
              <button onClick={() => window.open(`/issue/${issue._id}`, '_blank')}>
                View Details
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default CivicTrackMap;
```

### Anonymous Report Form

```jsx
import React, { useState } from 'react';

const ReportForm = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Roads',
    isAnonymous: true,
    images: []
  });
  
  const [location, setLocation] = useState(null);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!location) {
      alert('Please select a location on the map');
      return;
    }
    
    const formDataToSend = new FormData();
    formDataToSend.append('title', formData.title);
    formDataToSend.append('description', formData.description);
    formDataToSend.append('category', formData.category);
    formDataToSend.append('isAnonymous', formData.isAnonymous);
    formDataToSend.append('location', JSON.stringify(location));
    
    formData.images.forEach(image => {
      formDataToSend.append('images', image);
    });
    
    try {
      const response = await fetch('/api/issues', {
        method: 'POST',
        body: formDataToSend
      });
      
      if (response.ok) {
        alert('Issue reported successfully!');
        setFormData({
          title: '',
          description: '',
          category: 'Roads',
          isAnonymous: true,
          images: []
        });
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Error submitting report. Please try again.');
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Title:</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({...formData, title: e.target.value})}
          required
        />
      </div>
      
      <div>
        <label>Description:</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          required
        />
      </div>
      
      <div>
        <label>Category:</label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({...formData, category: e.target.value})}
        >
          <option value="Roads">Roads</option>
          <option value="Lighting">Lighting</option>
          <option value="Water Supply">Water Supply</option>
          <option value="Cleanliness">Cleanliness</option>
          <option value="Public Safety">Public Safety</option>
          <option value="Obstructions">Obstructions</option>
        </select>
      </div>
      
      <div>
        <label>
          <input
            type="checkbox"
            checked={formData.isAnonymous}
            onChange={(e) => setFormData({...formData, isAnonymous: e.target.checked})}
          />
          Report Anonymously
        </label>
      </div>
      
      <div>
        <label>Images (optional):</label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => setFormData({...formData, images: Array.from(e.target.files)})}
        />
      </div>
      
      <button type="submit">Submit Report</button>
    </form>
  );
};

export default ReportForm;
```

## Security Considerations

### Frontend Security Best Practices

1. **Input Validation**: Always validate user input on frontend
2. **HTTPS**: Use HTTPS for all API calls
3. **Token Storage**: Store JWT tokens securely (httpOnly cookies recommended)
4. **XSS Prevention**: Sanitize user input before displaying
5. **CSRF Protection**: Include CSRF tokens in requests

### Privacy Protection

1. **Location Privacy**: Only request location when necessary
2. **Data Minimization**: Only collect required data
3. **User Consent**: Get explicit consent for location access
4. **Data Retention**: Inform users about data retention policies

## Performance Optimization

### Map Performance Tips

1. **Clustering**: Use marker clustering for large datasets
2. **Lazy Loading**: Load issues as map bounds change
3. **Image Optimization**: Use compressed images for markers
4. **Caching**: Cache issue data locally
5. **Debouncing**: Debounce map move events

### API Optimization

1. **Pagination**: Use pagination for large datasets
2. **Filtering**: Use query parameters for filtering
3. **Caching**: Implement client-side caching
4. **Compression**: Enable gzip compression

This integration guide provides everything needed to build a robust frontend application that works seamlessly with the CivicTrack backend, ensuring proper handling of anonymous reporting and map integration. 