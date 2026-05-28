const jwt = require('jsonwebtoken');
const User = require('../models/User');

const onlineUsers = new Map(); // userId -> socketId

const initSocket = (io) => {
  // Auth middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`🔌 User connected: ${socket.user.name} (${userId})`);

    // Register online status
    onlineUsers.set(userId, socket.id);
    socket.join(userId); // Personal room

    // Update DB
    await User.findByIdAndUpdate(userId, { isOnline: true, socketId: socket.id, lastSeen: new Date() });

    // Broadcast online status
    socket.broadcast.emit('user_online', { userId, timestamp: new Date() });

    // Send current online users list to newly connected user
    const onlineUserIds = Array.from(onlineUsers.keys());
    socket.emit('online_users_list', { userIds: onlineUserIds });

    // ── Typing events ──────────────────────────────────────────────────────
    socket.on('typing_start', ({ receiverId }) => {
      io.to(receiverId).emit('typing_start', { senderId: userId });
    });

    socket.on('typing_stop', ({ receiverId }) => {
      io.to(receiverId).emit('typing_stop', { senderId: userId });
    });

    // ── Message read ────────────────────────────────────────────────────────
    socket.on('mark_read', ({ conversationId, senderId }) => {
      io.to(senderId).emit('messages_read', { conversationId });
    });

    // ── Video call signaling ────────────────────────────────────────────────
    socket.on('call_invite', ({ targetUserId, appointmentId, callType }) => {
      io.to(targetUserId).emit('incoming_call', {
        from: { _id: userId, id: userId, name: socket.user.name, avatar: socket.user.avatar },
        appointmentId, callType,
      });
    });

    socket.on('call_accept', ({ targetUserId }) => {
      io.to(targetUserId).emit('call_accepted', { from: userId });
    });

    socket.on('call_reject', ({ targetUserId }) => {
      io.to(targetUserId).emit('call_rejected', { from: userId });
    });

    socket.on('call_end', ({ targetUserId }) => {
      io.to(targetUserId).emit('call_ended', { from: userId });
    });

    // WebRTC signaling
    socket.on('webrtc_offer', ({ targetUserId, offer }) => {
      io.to(targetUserId).emit('webrtc_offer', { from: userId, offer });
    });

    socket.on('webrtc_answer', ({ targetUserId, answer }) => {
      io.to(targetUserId).emit('webrtc_answer', { from: userId, answer });
    });

    socket.on('webrtc_ice_candidate', ({ targetUserId, candidate }) => {
      io.to(targetUserId).emit('webrtc_ice_candidate', { from: userId, candidate });
    });

    // ── Disconnect ──────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`🔌 User disconnected: ${socket.user.name}`);
      onlineUsers.delete(userId);
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date(), socketId: '' });
      socket.broadcast.emit('user_offline', { userId, lastSeen: new Date() });
    });
  });
};

module.exports = { initSocket, onlineUsers };