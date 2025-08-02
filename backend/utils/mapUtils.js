/**
 * Utility functions for frontend map integration and Leaflet.js compatibility
 * Provides helper functions for map data formatting and restrictions
 */

/**
 * Format issue data for Leaflet.js map markers
 * @param {Object} issue - Issue object from database
 * @param {Object} options - Formatting options
 * @returns {Object} - Formatted issue for map display
 */
const formatIssueForMap = (issue, options = {}) => {
  const {
    showAnonymous = true,
    includeDetails = false,
    userLocation = null
  } = options;

  const mapIssue = {
    id: issue._id,
    title: issue.title,
    category: issue.category,
    status: issue.status,
    priority: issue.priority,
    coordinates: issue.location.coordinates,
    address: issue.location.address,
    createdAt: issue.createdAt,
    upvoteCount: issue.upvoteCount || 0,
    flagCount: issue.flagCount || 0,
    hasImages: issue.images && issue.images.length > 0,
    imageUrl: issue.images && issue.images.length > 0 ? issue.images[0].url : null
  };

  // Handle anonymous reporting
  if (issue.isAnonymous || !issue.reportedBy) {
    mapIssue.reporterName = 'Anonymous';
    mapIssue.isAnonymous = true;
  } else {
    mapIssue.reporterName = issue.reportedBy.username;
    mapIssue.isAnonymous = false;
  }

  // Calculate distance if user location provided
  if (userLocation && issue.location.coordinates) {
    const { calculateDistance } = require('./geoUtils');
    mapIssue.distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      issue.location.coordinates[1],
      issue.location.coordinates[0]
    );
  }

  // Include additional details if requested
  if (includeDetails) {
    mapIssue.description = issue.description;
    mapIssue.severity = issue.severity;
    mapIssue.affectedArea = issue.affectedArea;
    mapIssue.weatherCondition = issue.weatherCondition;
    mapIssue.isUrgent = issue.isUrgent;
    mapIssue.images = issue.images || [];
    mapIssue.comments = issue.comments || [];
    mapIssue.activityLog = issue.activityLog || [];
  }

  return mapIssue;
};

/**
 * Format multiple issues for map display
 * @param {Array} issues - Array of issue objects
 * @param {Object} options - Formatting options
 * @returns {Array} - Array of formatted issues
 */
const formatIssuesForMap = (issues, options = {}) => {
  return issues.map(issue => formatIssueForMap(issue, options));
};

/**
 * Generate map marker icon based on issue category
 * @param {String} category - Issue category
 * @param {String} status - Issue status
 * @returns {Object} - Icon configuration for Leaflet
 */
const getMarkerIcon = (category, status = 'Reported') => {
  const iconConfig = {
    Roads: {
      iconUrl: '/images/markers/road.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    },
    Lighting: {
      iconUrl: '/images/markers/lighting.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    },
    'Water Supply': {
      iconUrl: '/images/markers/water.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    },
    Cleanliness: {
      iconUrl: '/images/markers/cleanliness.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    },
    'Public Safety': {
      iconUrl: '/images/markers/safety.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    },
    Obstructions: {
      iconUrl: '/images/markers/obstruction.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    }
  };

  // Add status-based styling
  const baseIcon = iconConfig[category] || iconConfig.Roads;
  
  // Add status color coding
  const statusColors = {
    'Reported': '#ff6b6b',
    'In Progress': '#4ecdc4',
    'Resolved': '#45b7d1',
    'Rejected': '#96ceb4'
  };

  return {
    ...baseIcon,
    className: `marker-${category.toLowerCase().replace(' ', '-')}-${status.toLowerCase().replace(' ', '-')}`
  };
};

/**
 * Generate popup content for map markers
 * @param {Object} issue - Formatted issue object
 * @param {Object} options - Popup options
 * @returns {String} - HTML content for popup
 */
const generatePopupContent = (issue, options = {}) => {
  const {
    showFullDetails = false,
    showActions = false,
    currentUser = null
  } = options;

  let popupContent = `
    <div class="map-popup">
      <h4>${issue.title}</h4>
      <p><strong>Category:</strong> ${issue.category}</p>
      <p><strong>Status:</strong> <span class="status-${issue.status.toLowerCase().replace(' ', '-')}">${issue.status}</span></p>
      <p><strong>Priority:</strong> ${issue.priority}</p>
      <p><strong>Reported by:</strong> ${issue.reporterName}</p>
      <p><strong>Date:</strong> ${new Date(issue.createdAt).toLocaleDateString()}</p>
  `;

  if (issue.distance) {
    popupContent += `<p><strong>Distance:</strong> ${issue.distance.toFixed(2)} km</p>`;
  }

  if (issue.hasImages) {
    popupContent += `<p><strong>Has Images:</strong> Yes</p>`;
  }

  if (showFullDetails && issue.description) {
    popupContent += `<p><strong>Description:</strong> ${issue.description}</p>`;
  }

  popupContent += `
      <div class="popup-stats">
        <span class="upvotes">👍 ${issue.upvoteCount}</span>
        <span class="flags">🚩 ${issue.flagCount}</span>
      </div>
  `;

  if (showActions && currentUser) {
    popupContent += `
      <div class="popup-actions">
        <button onclick="viewIssueDetails('${issue.id}')" class="btn btn-primary btn-sm">View Details</button>
        <button onclick="upvoteIssue('${issue.id}')" class="btn btn-success btn-sm">👍 Upvote</button>
      </div>
    `;
  }

  popupContent += '</div>';

  return popupContent;
};

/**
 * Filter issues based on map bounds and user restrictions
 * @param {Array} issues - Array of issues
 * @param {Object} bounds - Map bounds { north, south, east, west }
 * @param {Object} userLocation - User location { latitude, longitude }
 * @param {Number} maxDistance - Maximum distance in km
 * @returns {Array} - Filtered issues
 */
const filterIssuesForMap = (issues, bounds, userLocation, maxDistance = 5) => {
  const { calculateDistance } = require('./geoUtils');

  return issues.filter(issue => {
    const [lng, lat] = issue.location.coordinates;

    // Check if within map bounds
    if (bounds) {
      if (lat < bounds.south || lat > bounds.north || 
          lng < bounds.west || lng > bounds.east) {
        return false;
      }
    }

    // Check distance from user
    if (userLocation && maxDistance) {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        lat,
        lng
      );
      return distance <= maxDistance;
    }

    return true;
  });
};

/**
 * Generate map layer groups by category
 * @param {Array} issues - Array of formatted issues
 * @returns {Object} - Layer groups organized by category
 */
const generateLayerGroups = (issues) => {
  const layerGroups = {};

  issues.forEach(issue => {
    if (!layerGroups[issue.category]) {
      layerGroups[issue.category] = [];
    }
    layerGroups[issue.category].push(issue);
  });

  return layerGroups;
};

/**
 * Validate map bounds
 * @param {Object} bounds - Map bounds object
 * @returns {Boolean} - Whether bounds are valid
 */
const validateMapBounds = (bounds) => {
  if (!bounds) return false;

  const { north, south, east, west } = bounds;

  return (
    typeof north === 'number' && north <= 90 && north >= -90 &&
    typeof south === 'number' && south <= 90 && south >= -90 &&
    typeof east === 'number' && east <= 180 && east >= -180 &&
    typeof west === 'number' && west <= 180 && west >= -180 &&
    north > south &&
    east > west
  );
};

/**
 * Calculate optimal map center and zoom
 * @param {Array} issues - Array of issues with coordinates
 * @param {Object} userLocation - User location
 * @returns {Object} - Map center and zoom level
 */
const calculateMapView = (issues, userLocation = null) => {
  if (issues.length === 0) {
    return {
      center: userLocation || { lat: 0, lng: 0 },
      zoom: 13
    };
  }

  const lats = issues.map(issue => issue.location.coordinates[1]);
  const lngs = issues.map(issue => issue.location.coordinates[0]);

  const center = {
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
    lng: (Math.min(...lngs) + Math.max(...lngs)) / 2
  };

  // Calculate zoom level based on spread
  const latDiff = Math.max(...lats) - Math.min(...lats);
  const lngDiff = Math.max(...lngs) - Math.min(...lngs);
  const maxDiff = Math.max(latDiff, lngDiff);

  let zoom = 13;
  if (maxDiff > 0.1) zoom = 10;
  if (maxDiff > 0.5) zoom = 8;
  if (maxDiff > 1) zoom = 6;
  if (maxDiff > 5) zoom = 4;

  return { center, zoom };
};

/**
 * Generate map legend data
 * @returns {Array} - Legend items for map
 */
const generateMapLegend = () => {
  return [
    { category: 'Roads', color: '#ff6b6b', icon: '🛣️' },
    { category: 'Lighting', color: '#4ecdc4', icon: '💡' },
    { category: 'Water Supply', color: '#45b7d1', icon: '💧' },
    { category: 'Cleanliness', color: '#96ceb4', icon: '🧹' },
    { category: 'Public Safety', color: '#feca57', icon: '⚠️' },
    { category: 'Obstructions', color: '#ff9ff3', icon: '🚧' }
  ];
};

module.exports = {
  formatIssueForMap,
  formatIssuesForMap,
  getMarkerIcon,
  generatePopupContent,
  filterIssuesForMap,
  generateLayerGroups,
  validateMapBounds,
  calculateMapView,
  generateMapLegend
}; 