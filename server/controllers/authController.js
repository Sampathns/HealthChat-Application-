const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { getFileData } = require('../utils/fileUtils');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { name, email, password, role, specialization, licenseNumber } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'Email already registered' });
  }

  const userData = { name, email, password, role: role || 'patient' };
  if (role === 'doctor') {
    userData.specialization = specialization;
    userData.licenseNumber = licenseNumber;
  }

  const user = await User.create(userData);
  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    token,
    user,
  });
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password' });
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  if (!user.isActive) {
    return res.status(401).json({ success: false, message: 'Account has been deactivated' });
  }

  user.isOnline = true;
  user.lastSeen = new Date();
  await user.save({ validateBeforeSave: false });

  const token = generateToken(user._id);

  res.json({
    success: true,
    message: 'Login successful',
    token,
    user,
  });
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, user });
};

// @desc    Update profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  const allowedFields = ['name', 'phone', 'dateOfBirth', 'gender', 'address',
    'specialization', 'experience', 'consultationFee', 'availableSlots',
    'bloodGroup', 'allergies', 'medicalConditions', 'emergencyContact',
    'notificationPreferences'];

  const updates = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  // 👇 Fix: Frontend එකෙන් stringify වෙලා එන availableSlots එක array එකක් බවට parse කිරීම
  if (updates.availableSlots && typeof updates.availableSlots === 'string') {
    try {
      updates.availableSlots = JSON.parse(updates.availableSlots);
    } catch (e) {
      console.error("❌ JSON parsing error for availableSlots:", e);
      return res.status(400).json({ success: false, message: 'Invalid format for availableSlots' });
    }
  }

  if (req.file) {
    const f = getFileData(req.file);
    if (f && f.url) updates.avatar = f.url;
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true, runValidators: true,
  });

  res.json({ success: true, user });
};

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect' });
  }

  user.password = newPassword;
  await user.save();

  res.json({ success: true, message: 'Password updated successfully' });
};

// @desc    Logout
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    isOnline: false,
    lastSeen: new Date(),
    socketId: '',
  });
  res.json({ success: true, message: 'Logged out successfully' });
};