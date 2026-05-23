const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getUploadSignature } = require('../controllers/cloudinaryController');


router.get('/sign', protect, getUploadSignature);
module.exports = router;
