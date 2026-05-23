const express = require('express');
const router = express.Router();
const { getConversations, getMessages, sendMessage, deleteMessage, getChatUsers } = require('../controllers/chatController');
const { protect } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

router.use(protect);
router.get('/conversations', getConversations);
router.get('/users', getChatUsers);
router.get('/messages/:userId', getMessages);
router.post('/messages', upload.single('file'), sendMessage);
router.delete('/messages/:id', deleteMessage);

module.exports = router;
