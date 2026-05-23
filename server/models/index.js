const mongoose = require('mongoose');

// ─── Prescription ───────────────────────────────────────────────────────────
const prescriptionSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  diagnosis: { type: String, required: true },
  medicines: [{
    name: { type: String, required: true },
    dosage: { type: String, required: true },
    frequency: { type: String, required: true },
    duration: { type: String, required: true },
    instructions: String,
    timing: { type: String, enum: ['before-meal', 'after-meal', 'with-meal', 'anytime'], default: 'anytime' },
  }],
  labTests: [String],
  advice: { type: String, default: '' },
  followUpDate: { type: Date },
  isActive: { type: Boolean, default: true },
  fileUrl: { type: String, default: '' },
}, { timestamps: true });

// ─── Notification ────────────────────────────────────────────────────────────
const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: ['appointment', 'message', 'prescription', 'report', 'reminder', 'ai_alert', 'system'],
    required: true,
  },
  title: { type: String, required: true },
  body: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  link: { type: String, default: '' },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

// ─── Medical Report ──────────────────────────────────────────────────────────
const medicalReportSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  title: { type: String, required: true },
  type: {
    type: String,
    enum: ['lab', 'xray', 'mri', 'ultrasound', 'ecg', 'blood', 'urine', 'other'],
    default: 'other',
  },
  fileUrl: { type: String, required: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number },
  mimeType: { type: String },
  description: { type: String, default: '' },
  ocrText: { type: String, default: '' },
  aiSummary: { type: String, default: '' },
  tags: [String],
  isSharedWithDoctor: { type: Boolean, default: false },
}, { timestamps: true });

medicalReportSchema.index({ patient: 1, createdAt: -1 });

module.exports = {
  Prescription: mongoose.model('Prescription', prescriptionSchema),
  Notification: mongoose.model('Notification', notificationSchema),
  MedicalReport: mongoose.model('MedicalReport', medicalReportSchema),
};
