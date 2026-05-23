const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Message = require('../models/Message');
const { Notification } = require('../models/index');

router.use(protect, authorize('admin'));

// Dashboard analytics
router.get('/analytics', async (req, res) => {
  const [totalUsers, totalDoctors, totalPatients, totalAppointments,
    pendingAppointments, completedAppointments, recentUsers] = await Promise.all([
    User.countDocuments({ isActive: true }),
    User.countDocuments({ role: 'doctor', isActive: true }),
    User.countDocuments({ role: 'patient', isActive: true }),
    Appointment.countDocuments(),
    Appointment.countDocuments({ status: 'pending' }),
    Appointment.countDocuments({ status: 'completed' }),
    User.find().sort({ createdAt: -1 }).limit(5).select('name email role createdAt avatar'),
  ]);

  // Monthly appointment trend
  const monthlyData = await Appointment.aggregate([
    { $group: { _id: { month: { $month: '$date' }, year: { $year: '$date' } }, count: { $sum: 1 } } },
    { $sort: { '_id.year': 1, '_id.month': 1 } }, { $limit: 12 },
  ]);

  res.json({
    success: true, analytics: {
      totalUsers, totalDoctors, totalPatients, totalAppointments,
      pendingAppointments, completedAppointments, recentUsers, monthlyData,
    },
  });
});

// Get all users
router.get('/users', async (req, res) => {
  const { role, search, page = 1, limit = 20 } = req.query;
  let query = {};
  if (role) query.role = role;
  if (search) query.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];
  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit)),
    User.countDocuments(query),
  ]);
  res.json({ success: true, users, total });
});

// Toggle user active status
router.put('/users/:id/toggle', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  user.isActive = !user.isActive;
  await user.save();
  res.json({ success: true, user });
});

// Verify doctor
router.put('/users/:id/verify', async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true });
  res.json({ success: true, user });
});

// All appointments
router.get('/appointments', async (req, res) => {
  const appointments = await Appointment.find()
    .populate('patient', 'name avatar email').populate('doctor', 'name specialization')
    .sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, appointments });
});

module.exports = router;
