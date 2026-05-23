const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { createPaymentIntent } = require('../controllers/paymentController');

// Protected route to create a Stripe PaymentIntent
router.post('/create-intent', protect, createPaymentIntent);

module.exports = router;
