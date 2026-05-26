require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');

// Demo accounts created by seeder.js
const DEMO_EMAILS = [
  'admin@healthchat.com',
  'doctor1@healthchat.com',
  'doctor2@healthchat.com',
  'patient@healthchat.com',
];

const unseed = async () => {
  await connectDB();

  const result = await User.deleteMany({ email: { $in: DEMO_EMAILS } });

  if (result.deletedCount === 0) {
    console.log('⚠️  No demo accounts found. Nothing was deleted.');
  } else {
    console.log(`✅ Successfully removed ${result.deletedCount} demo account(s):`);
    DEMO_EMAILS.forEach(email => console.log(`   - ${email}`));
  }

  process.exit(0);
};

unseed().catch(err => { console.error('❌ Error:', err); process.exit(1); });
