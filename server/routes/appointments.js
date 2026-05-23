// ── routes/appointments.js ───────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/', ctrl.getAppointments);
router.get('/slots/:doctorId', ctrl.getAvailableSlots);
router.get('/:id', ctrl.getAppointment);
router.post('/', authorize('patient'), ctrl.bookAppointment);
router.put('/:id/status', authorize('doctor', 'admin'), ctrl.updateAppointmentStatus);
router.put('/:id/cancel', authorize('patient'), ctrl.cancelAppointment);

module.exports = router;
