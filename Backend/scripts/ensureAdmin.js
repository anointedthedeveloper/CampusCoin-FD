// Ensures the default admin account exists. Safe to run multiple times —
// if the account already exists it exits silently. Called by start.bat.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const { seedDefaultCategories } = require('../src/services/defaultCategories.service');

const ADMIN_EMAIL = 'admin@campuscoin.tw7';
const ADMIN_PASS  = 'C@mpMaster76#';
const ADMIN_NAME  = 'Campus Coin Admin';

(async () => {
  if (!(await connectDB())) {
    console.error('ensureAdmin: Could not connect to MongoDB.');
    process.exit(1);
  }

  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log('Admin account already exists: ' + ADMIN_EMAIL);
  } else {
    const hash = await bcrypt.hash(ADMIN_PASS, 12);
    const user = await User.create({
      fullName: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash: hash,
      role: 'admin',
      onboarding: { status: 'completed', currentStep: 5 },
    });
    await seedDefaultCategories(user._id);
    console.log('Admin account created: ' + ADMIN_EMAIL);
  }

  await disconnectDB();
  process.exit(0);
})().catch((err) => {
  console.error('ensureAdmin error:', err.message);
  process.exit(1);
});
