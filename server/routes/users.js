// routes/users.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Get all doctors (for patients to browse)
router.get('/doctors', async (req, res) => {
  const { specialization, search } = req.query;
  let query = { role: 'doctor', isActive: true };
  if (specialization) query.specialization = new RegExp(specialization, 'i');
  if (search) query.$or = [{ name: new RegExp(search, 'i') }, { specialization: new RegExp(search, 'i') }];
  const doctors = await User.find(query).select('name avatar specialization experience rating totalReviews consultationFee isOnline');
  res.json({ success: true, doctors });
});

// Get doctor profile
router.get('/doctors/:id', async (req, res) => {
  const doctor = await User.findById(req.params.id).select('-password');
  if (!doctor || doctor.role !== 'doctor') return res.status(404).json({ success: false, message: 'Doctor not found' });
  res.json({ success: true, doctor });
});

module.exports = router;
