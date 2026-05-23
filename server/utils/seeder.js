require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');

const seed = async () => {
  await connectDB();
  await User.deleteMany({});

  const users = [
    {
      name: 'Admin User', email: 'admin@healthchat.com', password: 'Admin@123',
      role: 'admin', isVerified: true, isActive: true,
    },
    {
      name: 'Dr. Sarah Johnson', email: 'doctor1@healthchat.com', password: 'Doctor@123',
      role: 'doctor', specialization: 'Cardiology', licenseNumber: 'MD-12345',
      experience: 12, consultationFee: 150, isVerified: true,
      availableSlots: [
        { day: 'Mon', startTime: '09:00', endTime: '13:00' },
        { day: 'Wed', startTime: '14:00', endTime: '18:00' },
        { day: 'Fri', startTime: '09:00', endTime: '12:00' },
      ],
    },
    {
      name: 'Dr. Michael Chen', email: 'doctor2@healthchat.com', password: 'Doctor@123',
      role: 'doctor', specialization: 'Neurology', licenseNumber: 'MD-67890',
      experience: 8, consultationFee: 200, isVerified: true,
      availableSlots: [
        { day: 'Tue', startTime: '10:00', endTime: '15:00' },
        { day: 'Thu', startTime: '09:00', endTime: '17:00' },
      ],
    },
    {
      name: 'John Patient', email: 'patient@healthchat.com', password: 'Patient@123',
      role: 'patient', bloodGroup: 'O+', allergies: ['Penicillin'],
      medicalConditions: ['Hypertension'],
    },
  ];

  for (const userData of users) {
    await User.create(userData);
  }

  console.log('✅ Database seeded successfully!');
  console.log('\nCredentials:');
  console.log('  Admin:   admin@healthchat.com / Admin@123');
  console.log('  Doctor:  doctor1@healthchat.com / Doctor@123');
  console.log('  Patient: patient@healthchat.com / Patient@123\n');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
