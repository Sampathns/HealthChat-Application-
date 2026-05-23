const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { Notification } = require('../models/index');

// @desc   Book appointment
// @route  POST /api/appointments
// @access Private (patient)
exports.bookAppointment = async (req, res) => {
  const { doctorId, date, startTime, reason, symptoms, type } = req.body;

  const doctor = await User.findById(doctorId);
  if (!doctor || doctor.role !== 'doctor') {
    return res.status(404).json({ success: false, message: 'Doctor not found' });
  }

  // Check for conflicts
  const conflict = await Appointment.findOne({
    doctor: doctorId,
    date: new Date(date),
    startTime,
    status: { $in: ['pending', 'approved'] },
  });
  if (conflict) {
    return res.status(400).json({ success: false, message: 'This time slot is already booked' });
  }

  const appointment = await Appointment.create({
    patient: req.user._id,
    doctor: doctorId,
    date: new Date(date),
    startTime,
    reason,
    symptoms: symptoms || [],
    type: type || 'in-person',
    consultationFee: doctor.consultationFee,
  });

  await appointment.populate('patient', 'name avatar email phone');
  await appointment.populate('doctor', 'name avatar specialization');

  // Notify doctor
  await Notification.create({
    recipient: doctorId,
    sender: req.user._id,
    type: 'appointment',
    title: 'New Appointment Request',
    body: `${req.user.name} has requested an appointment on ${new Date(date).toDateString()} at ${startTime}`,
    data: { appointmentId: appointment._id },
  });

  req.io.to(doctorId).emit('new_appointment', appointment);

  res.status(201).json({ success: true, appointment });
};

// @desc   Get appointments
// @route  GET /api/appointments
// @access Private
exports.getAppointments = async (req, res) => {
  const { status, date, page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  let query = {};
  if (req.user.role === 'patient') query.patient = req.user._id;
  else if (req.user.role === 'doctor') query.doctor = req.user._id;

  if (status) query.status = status;
  if (date) {
    const d = new Date(date);
    query.date = { $gte: new Date(d.setHours(0, 0, 0, 0)), $lte: new Date(d.setHours(23, 59, 59, 999)) };
  }

  const [appointments, total] = await Promise.all([
    Appointment.find(query)
      .populate('patient', 'name avatar phone bloodGroup')
      .populate('doctor', 'name avatar specialization consultationFee')
      .sort({ date: 1, startTime: 1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Appointment.countDocuments(query),
  ]);

  res.json({ success: true, appointments, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
};

// @desc   Get single appointment
// @route  GET /api/appointments/:id
// @access Private
exports.getAppointment = async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate('patient', 'name avatar phone bloodGroup allergies')
    .populate('doctor', 'name avatar specialization consultationFee');

  if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

  res.json({ success: true, appointment });
};

// @desc   Update appointment status
// @route  PUT /api/appointments/:id/status
// @access Private (doctor/admin)
exports.updateAppointmentStatus = async (req, res) => {
  const { status, doctorNotes, videoLink, cancellationReason } = req.body;

  const appointment = await Appointment.findById(req.params.id)
    .populate('patient', 'name')
    .populate('doctor', 'name');

  if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

  if (req.user.role === 'doctor' && appointment.doctor._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  appointment.status = status;
  if (doctorNotes) appointment.doctorNotes = doctorNotes;
  if (videoLink) appointment.videoLink = videoLink;
  if (cancellationReason) appointment.cancellationReason = cancellationReason;
  if (status === 'cancelled') appointment.cancelledBy = req.user._id;

  await appointment.save();

  // Notify patient
  const notifMsg = {
    approved: `Your appointment on ${appointment.date.toDateString()} has been approved`,
    cancelled: `Your appointment on ${appointment.date.toDateString()} has been cancelled`,
    completed: `Your appointment with Dr. ${appointment.doctor.name} is marked as completed`,
  };

  if (notifMsg[status]) {
    await Notification.create({
      recipient: appointment.patient._id,
      sender: req.user._id,
      type: 'appointment',
      title: `Appointment ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      body: notifMsg[status],
      data: { appointmentId: appointment._id },
    });
    req.io.to(appointment.patient._id.toString()).emit('appointment_updated', appointment);
  }

  res.json({ success: true, appointment });
};

// @desc   Cancel appointment (patient)
// @route  PUT /api/appointments/:id/cancel
// @access Private (patient)
exports.cancelAppointment = async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

  if (appointment.patient.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  if (['completed', 'cancelled'].includes(appointment.status)) {
    return res.status(400).json({ success: false, message: 'Cannot cancel this appointment' });
  }

  appointment.status = 'cancelled';
  appointment.cancelledBy = req.user._id;
  appointment.cancellationReason = req.body.reason || 'Cancelled by patient';
  await appointment.save();

  await Notification.create({
    recipient: appointment.doctor,
    sender: req.user._id,
    type: 'appointment',
    title: 'Appointment Cancelled',
    body: `${req.user.name} has cancelled the appointment on ${appointment.date.toDateString()}`,
    data: { appointmentId: appointment._id },
  });

  req.io.to(appointment.doctor.toString()).emit('appointment_updated', appointment);

  res.json({ success: true, message: 'Appointment cancelled', appointment });
};

// @desc   Get available slots for a doctor
// @route  GET /api/appointments/slots/:doctorId
// @access Private
exports.getAvailableSlots = async (req, res) => {
  const { date } = req.query;
  const doctor = await User.findById(req.params.doctorId);
  if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

  const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
  const daySlots = doctor.availableSlots?.filter(s => s.day === dayName) || [];

  const bookedSlots = await Appointment.find({
    doctor: req.params.doctorId,
    date: new Date(date),
    status: { $in: ['pending', 'approved'] },
  }).select('startTime');

  const bookedTimes = bookedSlots.map(s => s.startTime);

  const allSlots = generateTimeSlots(daySlots);
  const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));

  res.json({ success: true, slots: availableSlots, booked: bookedTimes });
};

function generateTimeSlots(daySlots) {
  const slots = [];
  daySlots.forEach(slot => {
    let [sh, sm] = slot.startTime.split(':').map(Number);
    let [eh, em] = slot.endTime.split(':').map(Number);
    while (sh * 60 + sm < eh * 60 + em) {
      slots.push(`${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`);
      sm += 30;
      if (sm >= 60) { sh++; sm -= 60; }
    }
  });
  return slots;
}
