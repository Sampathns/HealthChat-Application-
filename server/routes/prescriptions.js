const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { Prescription, Notification } = require('../models/index');

router.use(protect);

// Create prescription (doctor)
router.post('/', authorize('doctor'), async (req, res) => {
  const { patientId, appointmentId, diagnosis, medicines, labTests, advice, followUpDate } = req.body;
  const prescription = await Prescription.create({
    patient: patientId, doctor: req.user._id, appointment: appointmentId,
    diagnosis, medicines, labTests, advice, followUpDate,
  });
  await prescription.populate('patient', 'name avatar');
  await prescription.populate('doctor', 'name specialization');

  await Notification.create({
    recipient: patientId, sender: req.user._id, type: 'prescription',
    title: 'New Prescription', body: `Dr. ${req.user.name} has issued a new prescription for ${diagnosis}`,
    data: { prescriptionId: prescription._id },
  });
  req.io.to(patientId).emit('new_prescription', prescription);
  res.status(201).json({ success: true, prescription });
});

// Get prescriptions
router.get('/', async (req, res) => {
  let query = {};
  if (req.user.role === 'patient') query.patient = req.user._id;
  else if (req.user.role === 'doctor') query.doctor = req.user._id;
  const prescriptions = await Prescription.find(query)
    .populate('patient', 'name avatar dateOfBirth').populate('doctor', 'name specialization')
    .sort({ createdAt: -1 });
  res.json({ success: true, prescriptions });
});

// Get single prescription
router.get('/:id', async (req, res) => {
  const prescription = await Prescription.findById(req.params.id)
    .populate('patient', 'name avatar dateOfBirth bloodGroup allergies')
    .populate('doctor', 'name specialization licenseNumber');
  if (!prescription) return res.status(404).json({ success: false, message: 'Prescription not found' });
  res.json({ success: true, prescription });
});

module.exports = router;
