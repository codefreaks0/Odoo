const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

/**
 * Configure Cloudinary
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload file to Cloudinary
 * @param {Buffer|string} file - File buffer or path
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Upload result
 */
const uploadToCloudinary = async (file, options = {}) => {
  try {
    const uploadOptions = {
      folder: 'civictrack',
      resource_type: 'auto',
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ],
      ...options
    };

    let result;
    
    if (Buffer.isBuffer(file)) {
      // Convert buffer to stream
      const stream = Readable.from(file);
      result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.pipe(uploadStream);
      });
    } else {
      // Upload from file path
      result = await cloudinary.uploader.upload(file, uploadOptions);
    }

    return {
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Public ID of the file
 * @returns {Promise<Object>} - Delete result
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete image from Cloudinary');
  }
};

/**
 * Update file in Cloudinary
 * @param {string} publicId - Public ID of the file
 * @param {Object} options - Update options
 * @returns {Promise<Object>} - Update result
 */
const updateCloudinaryFile = async (publicId, options = {}) => {
  try {
    const result = await cloudinary.uploader.explicit(publicId, {
      type: 'upload',
      ...options
    });
    return result;
  } catch (error) {
    console.error('Cloudinary update error:', error);
    throw new Error('Failed to update image in Cloudinary');
  }
};

/**
 * Generate image URL with transformations
 * @param {string} publicId - Public ID of the file
 * @param {Object} transformations - Image transformations
 * @returns {string} - Transformed image URL
 */
const generateImageUrl = (publicId, transformations = {}) => {
  try {
    return cloudinary.url(publicId, {
      secure: true,
      ...transformations
    });
  } catch (error) {
    console.error('Cloudinary URL generation error:', error);
    throw new Error('Failed to generate image URL');
  }
};

/**
 * Upload multiple files to Cloudinary
 * @param {Array} files - Array of file buffers or paths
 * @param {Object} options - Upload options
 * @returns {Promise<Array>} - Array of upload results
 */
const uploadMultipleToCloudinary = async (files, options = {}) => {
  try {
    const uploadPromises = files.map(file => uploadToCloudinary(file, options));
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('Cloudinary multiple upload error:', error);
    throw new Error('Failed to upload multiple images to Cloudinary');
  }
};

/**
 * Delete multiple files from Cloudinary
 * @param {Array} publicIds - Array of public IDs
 * @returns {Promise<Array>} - Array of delete results
 */
const deleteMultipleFromCloudinary = async (publicIds) => {
  try {
    const deletePromises = publicIds.map(publicId => deleteFromCloudinary(publicId));
    const results = await Promise.all(deletePromises);
    return results;
  } catch (error) {
    console.error('Cloudinary multiple delete error:', error);
    throw new Error('Failed to delete multiple images from Cloudinary');
  }
};

/**
 * Get Cloudinary usage statistics
 * @returns {Promise<Object>} - Usage statistics
 */
const getCloudinaryUsage = async () => {
  try {
    const result = await cloudinary.api.usage();
    return result;
  } catch (error) {
    console.error('Cloudinary usage error:', error);
    throw new Error('Failed to get Cloudinary usage statistics');
  }
};

/**
 * Optimize image for web
 * @param {string} publicId - Public ID of the file
 * @returns {string} - Optimized image URL
 */
const optimizeImageForWeb = (publicId) => {
  return generateImageUrl(publicId, {
    quality: 'auto:good',
    fetch_format: 'auto',
    width: 800,
    crop: 'limit'
  });
};

/**
 * Generate thumbnail URL
 * @param {string} publicId - Public ID of the file
 * @param {number} width - Thumbnail width
 * @param {number} height - Thumbnail height
 * @returns {string} - Thumbnail URL
 */
const generateThumbnailUrl = (publicId, width = 200, height = 200) => {
  return generateImageUrl(publicId, {
    width,
    height,
    crop: 'fill',
    quality: 'auto:good'
  });
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  updateCloudinaryFile,
  generateImageUrl,
  uploadMultipleToCloudinary,
  deleteMultipleFromCloudinary,
  getCloudinaryUsage,
  optimizeImageForWeb,
  generateThumbnailUrl
}; 