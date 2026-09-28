// Creates an administrator account, or promotes an existing account to admin.
//
//   npm run create-admin -- <email> <password> "<Full Name>"
//
// Uses MONGO_URI from Backend/.env (or the environment). Run it once against
// your production database to get into the admin console at /adlg.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const { seedDefaultCategories } = require('../src/services/defaultCategories.service');

async function main() {
  const [email, password, ...nameParts] = process.argv.slice(2);
  const fullName = nameParts.join(' ').trim() || 'Campus Coin Admin';
  if (!email || !password || password.length < 8) {
    console.error('Usage: npm run create-admin -- <email> <password (min 8 chars)> "<Full Name>"');
    process.exit(1);
  }
  if (!(await connectDB())) {
    console.error('Could not connect to MongoDB. Check MONGO_URI.');
    process.exit(1);
  }

  const normalizedEmail = email.toLowerCase().trim();
  const passwordHash = await bcrypt.hash(password, 12);
  let user = await User.findOne({ email: normalizedEmail });
  if (user) {
    user.role = 'admin';
    user.isActive = true;
    user.passwordHash = passwordHash;
    await user.save();
    console.log(`Promoted existing account ${normalizedEmail} to admin and set its password.`);
  } else {
    user = await User.create({
      fullName,
      email: normalizedEmail,
      passwordHash,
      role: 'admin',
      onboarding: { status: 'completed', currentStep: 5 },
    });
    await seedDefaultCategories(user._id);
    console.log(`Created admin ${normalizedEmail}.`);
  }
  console.log('Sign in at /adlg on the frontend.');
  await disconnectDB();
  await mongoose.disconnect().catch(() => undefined);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
