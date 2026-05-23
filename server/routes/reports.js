const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { MedicalReport } = require('../models/index');
const { upload } = require('../config/cloudinary');

router.use(protect);

// Upload report (patient only)
router.post('/', authorize('patient'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'File is required' });
  const report = await MedicalReport.create({
    patient:     req.user._id,
    title:       req.body.title,
    type:        req.body.type || 'other',
    fileUrl:     req.file.path,
    fileName:    req.file.originalname,
    fileSize:    req.file.size,
    mimeType:    req.file.mimetype,
    description: req.body.description,
  });
  res.status(201).json({ success: true, report });
});

// Get reports
// patient → own reports
// doctor  → reports shared with doctor
// admin   → ALL reports
router.get('/', async (req, res) => {
  let query = {};

  if (req.user.role === 'patient') {
    query = { patient: req.user._id };
  } else if (req.user.role === 'doctor') {
    query = { isSharedWithDoctor: true };
  }
  // admin → query stays {} → gets all reports

  const reports = await MedicalReport.find(query)
    .populate('patient', 'name email avatar phone')
    .sort({ createdAt: -1 });

  res.json({ success: true, reports, total: reports.length });
});

// Get single report
router.get('/:id', async (req, res) => {
  const report = await MedicalReport.findById(req.params.id)
    .populate('patient', 'name email avatar');

  if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

  // Only owner, doctor (if shared), or admin can view
  if (
    req.user.role !== 'admin' &&
    report.patient._id.toString() !== req.user._id.toString() &&
    !(req.user.role === 'doctor' && report.isSharedWithDoctor)
  ) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  res.json({ success: true, report });
});

// Delete report (owner or admin)
router.delete('/:id', async (req, res) => {
  const report = await MedicalReport.findById(req.params.id);
  if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

  if (
    req.user.role !== 'admin' &&
    report.patient.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  await MedicalReport.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Report deleted' });
});

// Share report with doctor (patient only)
router.put('/:id/share', authorize('patient'), async (req, res) => {
  const report = await MedicalReport.findById(req.params.id);
  if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

  if (report.patient.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  report.isSharedWithDoctor = !report.isSharedWithDoctor;
  await report.save();

  res.json({
    success: true,
    message: report.isSharedWithDoctor ? 'Report shared with doctors' : 'Report unshared',
    report,
  });
});

module.exports = router;
