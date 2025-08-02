/**
 * Geographical utilities for CivicTrack application
 * Handles distance calculations, location validation, and geospatial operations
 */

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} - Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

/**
 * Convert degrees to radians
 * @param {number} degrees - Degrees to convert
 * @returns {number} - Radians
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Convert radians to degrees
 * @param {number} radians - Radians to convert
 * @returns {number} - Degrees
 */
const toDegrees = (radians) => {
  return radians * (180 / Math.PI);
};

/**
 * Validate coordinates
 * @param {number} latitude - Latitude to validate
 * @param {number} longitude - Longitude to validate
 * @returns {boolean} - True if coordinates are valid
 */
const validateCoordinates = (latitude, longitude) => {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    latitude >= -90 && latitude <= 90 &&
    longitude >= -180 && longitude <= 180
  );
};

/**
 * Check if a point is within a specified radius of another point
 * @param {number} centerLat - Center latitude
 * @param {number} centerLon - Center longitude
 * @param {number} pointLat - Point latitude
 * @param {number} pointLon - Point longitude
 * @param {number} radiusKm - Radius in kilometers
 * @returns {boolean} - True if point is within radius
 */
const isWithinRadius = (centerLat, centerLon, pointLat, pointLon, radiusKm) => {
  const distance = calculateDistance(centerLat, centerLon, pointLat, pointLon);
  return distance <= radiusKm;
};

/**
 * Calculate bounding box for a given center point and radius
 * @param {number} centerLat - Center latitude
 * @param {number} centerLon - Center longitude
 * @param {number} radiusKm - Radius in kilometers
 * @returns {Object} - Bounding box coordinates
 */
const calculateBoundingBox = (centerLat, centerLon, radiusKm) => {
  const latDelta = radiusKm / 111.32; // Approximate km per degree latitude
  const lonDelta = radiusKm / (111.32 * Math.cos(toRadians(centerLat)));

  return {
    minLat: centerLat - latDelta,
    maxLat: centerLat + latDelta,
    minLon: centerLon - lonDelta,
    maxLon: centerLon + lonDelta
  };
};

/**
 * Format distance for display
 * @param {number} distanceKm - Distance in kilometers
 * @returns {string} - Formatted distance string
 */
const formatDistance = (distanceKm) => {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters}m`;
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)}km`;
  } else {
    return `${Math.round(distanceKm)}km`;
  }
};

/**
 * Parse location string to coordinates
 * @param {string} locationString - Location string (e.g., "lat,lng" or "lat, lng")
 * @returns {Object|null} - Parsed coordinates or null if invalid
 */
const parseLocationString = (locationString) => {
  try {
    const coords = locationString.split(',').map(coord => parseFloat(coord.trim()));
    if (coords.length === 2 && validateCoordinates(coords[0], coords[1])) {
      return { latitude: coords[0], longitude: coords[1] };
    }
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Generate MongoDB geospatial query for nearby locations
 * @param {number} latitude - Center latitude
 * @param {number} longitude - Center longitude
 * @param {number} maxDistanceKm - Maximum distance in kilometers
 * @returns {Object} - MongoDB geospatial query
 */
const generateNearbyQuery = (latitude, longitude, maxDistanceKm) => {
  return {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude] // MongoDB uses [lng, lat] order
        },
        $maxDistance: maxDistanceKm * 1000 // Convert to meters
      }
    }
  };
};

/**
 * Sort locations by distance from a center point
 * @param {Array} locations - Array of location objects
 * @param {number} centerLat - Center latitude
 * @param {number} centerLon - Center longitude
 * @returns {Array} - Sorted locations with distance property
 */
const sortByDistance = (locations, centerLat, centerLon) => {
  return locations
    .map(location => ({
      ...location,
      distance: calculateDistance(
        centerLat,
        centerLon,
        location.latitude || location.coordinates[1],
        location.longitude || location.coordinates[0]
      )
    }))
    .sort((a, b) => a.distance - b.distance);
};

/**
 * Calculate the center point of multiple locations
 * @param {Array} locations - Array of location objects with coordinates
 * @returns {Object} - Center point coordinates
 */
const calculateCenterPoint = (locations) => {
  if (!locations || locations.length === 0) {
    return null;
  }

  const totalLat = locations.reduce((sum, loc) => {
    const lat = loc.latitude || loc.coordinates[1];
    return sum + lat;
  }, 0);

  const totalLon = locations.reduce((sum, loc) => {
    const lon = loc.longitude || loc.coordinates[0];
    return sum + lon;
  }, 0);

  return {
    latitude: totalLat / locations.length,
    longitude: totalLon / locations.length
  };
};

/**
 * Convert address to coordinates using geocoding (placeholder for future implementation)
 * @param {string} address - Address to geocode
 * @returns {Promise<Object|null>} - Coordinates or null if geocoding fails
 */
const geocodeAddress = async (address) => {
  // This would typically use a geocoding service like Google Maps, OpenStreetMap, etc.
  // For now, return null as placeholder
  console.log('Geocoding not implemented yet');
  return null;
};

/**
 * Reverse geocode coordinates to address (placeholder for future implementation)
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Promise<string|null>} - Address or null if reverse geocoding fails
 */
const reverseGeocode = async (latitude, longitude) => {
  // This would typically use a reverse geocoding service
  // For now, return null as placeholder
  console.log('Reverse geocoding not implemented yet');
  return null;
};

module.exports = {
  calculateDistance,
  toRadians,
  toDegrees,
  validateCoordinates,
  isWithinRadius,
  calculateBoundingBox,
  formatDistance,
  parseLocationString,
  generateNearbyQuery,
  sortByDistance,
  calculateCenterPoint,
  geocodeAddress,
  reverseGeocode
}; 