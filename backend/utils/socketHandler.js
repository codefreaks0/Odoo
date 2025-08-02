/**
 * Socket.IO handler for CivicTrack application
 * Handles real-time notifications, issue updates, and live communication
 */

/**
 * Initialize Socket.IO connection handling
 * @param {Object} io - Socket.IO server instance
 */
const socketHandler = (io) => {
  // Store connected users
  const connectedUsers = new Map();

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    /**
     * Handle user authentication
     */
    socket.on('authenticate', (userData) => {
      if (userData && userData.id) {
        connectedUsers.set(userData.id, {
          socketId: socket.id,
          user: userData,
          connectedAt: new Date()
        });
        
        // Join user to their personal room
        socket.join(`user_${userData.id}`);
        
        console.log(`User authenticated: ${userData.username} (${userData.id})`);
        
        // Send connection confirmation
        socket.emit('authenticated', {
          message: 'Successfully connected to CivicTrack',
          userId: userData.id
        });
      }
    });

    /**
     * Handle user joining location-based room
     */
    socket.on('joinLocation', (locationData) => {
      if (locationData && locationData.coordinates) {
        const { latitude, longitude } = locationData.coordinates;
        const roomName = `location_${Math.round(latitude * 100)}_${Math.round(longitude * 100)}`;
        
        socket.join(roomName);
        console.log(`User joined location room: ${roomName}`);
        
        socket.emit('locationJoined', {
          room: roomName,
          message: 'Joined location-based updates'
        });
      }
    });

    /**
     * Handle issue updates
     */
    socket.on('issueUpdate', (issueData) => {
      // Broadcast to users in the same location
      if (issueData.location && issueData.location.coordinates) {
        const { latitude, longitude } = issueData.location.coordinates;
        const roomName = `location_${Math.round(latitude * 100)}_${Math.round(longitude * 100)}`;
        
        socket.to(roomName).emit('issueUpdated', {
          issue: issueData,
          timestamp: new Date()
        });
      }
    });

    /**
     * Handle new issue creation
     */
    socket.on('newIssue', (issueData) => {
      // Broadcast to users in the same location
      if (issueData.location && issueData.location.coordinates) {
        const { latitude, longitude } = issueData.location.coordinates;
        const roomName = `location_${Math.round(latitude * 100)}_${Math.round(longitude * 100)}`;
        
        socket.to(roomName).emit('issueCreated', {
          issue: issueData,
          timestamp: new Date()
        });
      }
    });

    /**
     * Handle new comments
     */
    socket.on('newComment', (commentData) => {
      // Notify issue reporter and other followers
      if (commentData.issueId) {
        socket.to(`issue_${commentData.issueId}`).emit('commentAdded', {
          comment: commentData,
          timestamp: new Date()
        });
      }
    });

    /**
     * Handle user joining issue room
     */
    socket.on('joinIssue', (issueId) => {
      if (issueId) {
        socket.join(`issue_${issueId}`);
        console.log(`User joined issue room: ${issueId}`);
      }
    });

    /**
     * Handle user leaving issue room
     */
    socket.on('leaveIssue', (issueId) => {
      if (issueId) {
        socket.leave(`issue_${issueId}`);
        console.log(`User left issue room: ${issueId}`);
      }
    });

    /**
     * Handle typing indicators
     */
    socket.on('typing', (data) => {
      if (data.issueId) {
        socket.to(`issue_${data.issueId}`).emit('userTyping', {
          userId: data.userId,
          username: data.username,
          issueId: data.issueId
        });
      }
    });

    /**
     * Handle stop typing
     */
    socket.on('stopTyping', (data) => {
      if (data.issueId) {
        socket.to(`issue_${data.issueId}`).emit('userStoppedTyping', {
          userId: data.userId,
          issueId: data.issueId
        });
      }
    });

    /**
     * Handle user status updates
     */
    socket.on('statusUpdate', (statusData) => {
      // Update user status in connected users map
      const userEntry = Array.from(connectedUsers.values()).find(
        entry => entry.socketId === socket.id
      );
      
      if (userEntry) {
        userEntry.status = statusData.status;
        userEntry.lastActivity = new Date();
      }
    });

    /**
     * Handle private messages (admin to user)
     */
    socket.on('privateMessage', (messageData) => {
      const { recipientId, message, senderId } = messageData;
      
      // Send to specific user
      io.to(`user_${recipientId}`).emit('privateMessage', {
        senderId,
        message,
        timestamp: new Date()
      });
    });

    /**
     * Handle admin broadcasts
     */
    socket.on('adminBroadcast', (broadcastData) => {
      const { message, type, target } = broadcastData;
      
      switch (target) {
        case 'all':
          io.emit('adminBroadcast', {
            message,
            type,
            timestamp: new Date()
          });
          break;
        case 'location':
          // Broadcast to specific location
          if (broadcastData.location) {
            const { latitude, longitude } = broadcastData.location;
            const roomName = `location_${Math.round(latitude * 100)}_${Math.round(longitude * 100)}`;
            io.to(roomName).emit('adminBroadcast', {
              message,
              type,
              timestamp: new Date()
            });
          }
          break;
        default:
          break;
      }
    });

    /**
     * Handle user disconnection
     */
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
      
      // Remove user from connected users map
      for (const [userId, userData] of connectedUsers.entries()) {
        if (userData.socketId === socket.id) {
          connectedUsers.delete(userId);
          console.log(`User removed from connected users: ${userData.user.username}`);
          break;
        }
      }
    });

    /**
     * Handle error
     */
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // Return utility functions for external use
  return {
    /**
     * Send notification to specific user
     * @param {string} userId - User ID
     * @param {Object} notification - Notification data
     */
    sendNotification: (userId, notification) => {
      io.to(`user_${userId}`).emit('notification', {
        ...notification,
        timestamp: new Date()
      });
    },

    /**
     * Send notification to multiple users
     * @param {Array} userIds - Array of user IDs
     * @param {Object} notification - Notification data
     */
    sendNotificationToMultiple: (userIds, notification) => {
      userIds.forEach(userId => {
        io.to(`user_${userId}`).emit('notification', {
          ...notification,
          timestamp: new Date()
        });
      });
    },

    /**
     * Broadcast issue update to location
     * @param {Object} issue - Issue data
     */
    broadcastIssueUpdate: (issue) => {
      if (issue.location && issue.location.coordinates) {
        const { latitude, longitude } = issue.location.coordinates;
        const roomName = `location_${Math.round(latitude * 100)}_${Math.round(longitude * 100)}`;
        
        io.to(roomName).emit('issueUpdated', {
          issue,
          timestamp: new Date()
        });
      }
    },

    /**
     * Get connected users count
     * @returns {number} - Number of connected users
     */
    getConnectedUsersCount: () => {
      return connectedUsers.size;
    },

    /**
     * Get connected users list
     * @returns {Array} - Array of connected users
     */
    getConnectedUsers: () => {
      return Array.from(connectedUsers.values()).map(userData => ({
        id: userData.user.id,
        username: userData.user.username,
        connectedAt: userData.connectedAt,
        lastActivity: userData.lastActivity
      }));
    },

    /**
     * Check if user is online
     * @param {string} userId - User ID
     * @returns {boolean} - True if user is online
     */
    isUserOnline: (userId) => {
      return connectedUsers.has(userId);
    }
  };
};

module.exports = socketHandler; 