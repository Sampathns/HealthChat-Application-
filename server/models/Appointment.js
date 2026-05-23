const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String },
  status: {
    type: String,
    enum: ['pending', 'approved', 'cancelled', 'completed', 'no-show'],
    default: 'pending',
  },
  type: { type: String, enum: ['in-person', 'video', 'phone'], default: 'in-person' },
  reason: { type: String, required: true },
  symptoms: [String],
  notes: { type: String, default: '' },
  doctorNotes: { type: String, default: '' },
  consultationFee: { type: Number, default: 0 },
  isPaid: { type: Boolean, default: false },
  paymentMethod: { type: String, enum: ['cash', 'card', 'insurance', ''], default: '' },
  videoLink: { type: String, default: '' },
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancellationReason: { type: String, default: '' },
  reminderSent: { type: Boolean, default: false },
  followUp: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
}, { timestamps: true });

appointmentSchema.index({ patient: 1, date: -1 });
appointmentSchema.index({ doctor: 1, date: -1 });
appointmentSchema.index({ status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
