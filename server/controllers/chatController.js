const Message = require('../models/Message');
const User = require('../models/User');
const { Notification } = require('../models/index');

const getConversationId = (id1, id2) => {
  return [id1, id2].sort().join('_');
};

// @desc   Get conversations list
// @route  GET /api/chat/conversations
// @access Private
exports.getConversations = async (req, res) => {
  const userId = req.user._id.toString();

  // Get all unique conversations involving this user
  const messages = await Message.aggregate([
    {
      $match: {
        $or: [
          { sender: req.user._id },
          { receiver: req.user._id },
        ],
        isDeleted: false,
      },
    },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$conversationId',
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$isRead', false] }, { $eq: ['$receiver', req.user._id] }] },
              1,
              0,
            ],
          },
        },
      },
    },
    { $sort: { 'lastMessage.createdAt': -1 } },
  ]);

  // Populate user details for each conversation
  const conversations = await Promise.all(
    messages.map(async (conv) => {
      const ids = conv._id.split('_');
      const otherId = ids.find(id => id !== userId);
      const otherUser = await User.findById(otherId).select('name avatar role isOnline lastSeen specialization');
      await Message.populate(conv.lastMessage, [
        { path: 'sender', select: 'name avatar' },
        { path: 'receiver', select: 'name avatar' },
      ]);
      return {
        conversationId: conv._id,
        participant: otherUser,
        lastMessage: conv.lastMessage,
        unreadCount: conv.unreadCount,
      };
    })
  );

  res.json({ success: true, conversations });
};

// @desc   Get messages in a conversation
// @route  GET /api/chat/messages/:userId
// @access Private
exports.getMessages = async (req, res) => {
  const conversationId = getConversationId(req.user._id.toString(), req.params.userId);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  const messages = await Message.find({ conversationId, isDeleted: false })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('sender', 'name avatar')
    .populate('receiver', 'name avatar')
    .populate('replyTo', 'content sender');

  // Mark messages as read
  await Message.updateMany(
    { conversationId, receiver: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  // Notify sender via socket
  req.io.to(req.params.userId).emit('messages_read', { conversationId });

  const total = await Message.countDocuments({ conversationId, isDeleted: false });

  res.json({
    success: true,
    messages: messages.reverse(),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};

// @desc   Send a message
// @route  POST /api/chat/messages
// @access Private
exports.sendMessage = async (req, res) => {
  const { receiverId, content, type, replyTo } = req.body;

  const receiver = await User.findById(receiverId);
  if (!receiver) {
    return res.status(404).json({ success: false, message: 'Recipient not found' });
  }

  const conversationId = getConversationId(req.user._id.toString(), receiverId);

  const messageData = {
    conversationId,
    sender: req.user._id,
    receiver: receiverId,
    content,
    type: type || 'text',
  };

  if (req.file) {
    const { getFileData } = require('../utils/fileUtils');
    const f = getFileData(req.file);
    if (f) {
      messageData.fileUrl = f.url;
      messageData.fileName = f.name;
      messageData.fileSize = f.size;
      messageData.mimeType = f.mimeType;
      messageData.type = (f.mimeType || '').startsWith('image/') ? 'image' : 'file';
    }
  }

  if (replyTo) messageData.replyTo = replyTo;

  const message = await Message.create(messageData);
  await message.populate('sender', 'name avatar');
  await message.populate('receiver', 'name avatar');

  // Emit socket event to receiver
  req.io.to(receiverId).emit('new_message', message);
  req.io.to(req.user._id.toString()).emit('new_message', message);

  // Create notification if receiver is offline
  if (!receiver.isOnline) {
    await Notification.create({
      recipient: receiverId,
      sender: req.user._id,
      type: 'message',
      title: `New message from ${req.user.name}`,
      body: content || 'Sent an attachment',
      data: { conversationId, senderId: req.user._id },
    });
    req.io.to(receiverId).emit('new_notification', {
      type: 'message',
      from: req.user.name,
    });
  }

  res.status(201).json({ success: true, message });
};

// @desc   Delete a message
// @route  DELETE /api/chat/messages/:id
// @access Private
exports.deleteMessage = async (req, res) => {
  const message = await Message.findById(req.params.id);
  if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

  if (message.sender.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  message.isDeleted = true;
  message.content = 'This message was deleted';
  await message.save();

  req.io.to(message.conversationId.split('_').find(id => id !== req.user._id.toString()))
    .emit('message_deleted', { messageId: message._id });

  res.json({ success: true, message: 'Message deleted' });
};

// @desc   Get online users (for patient: doctors, for doctor: patients)
// @route  GET /api/chat/users
// @access Private
exports.getChatUsers = async (req, res) => {
  let query = { _id: { $ne: req.user._id }, isActive: true };

  if (req.user.role === 'patient') query.role = 'doctor';
  else if (req.user.role === 'doctor') query.role = 'patient';
  else query.role = { $in: ['patient', 'doctor'] };

  const users = await User.find(query)
    .select('name avatar role specialization isOnline lastSeen')
    .sort({ isOnline: -1, name: 1 });

  res.json({ success: true, users });
};
