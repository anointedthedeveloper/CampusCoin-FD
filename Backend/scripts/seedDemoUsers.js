require('dotenv').config();

const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');

const demoUsers = [
  { fullName: 'Campus Coin Admin', email: 'admin@campuscoin.test', password: 'Admin@123', role: 'admin' },
  { fullName: 'Campus Coin Student 1', email: 'student1@campuscoin.test', password: 'Student@123', role: 'student' },
  { fullName: 'Campus Coin Student 2', email: 'student2@campuscoin.test', password: 'Student@123', role: 'student' },
];

async function seedDemoUsers() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri || !['localhost', '127.0.0.1'].includes(new URL(mongoUri).hostname)) {
    throw new Error('Demo accounts can only be seeded into a local MongoDB. Set MONGO_URI to localhost or 127.0.0.1.');
  }

  if (!(await connectDB())) throw new Error('Could not connect to MongoDB. Start the local MongoDB service first.');

  for (const { password, ...userData } of demoUsers) {
    const passwordHash = await bcrypt.hash(password, 12);
    await User.findOneAndUpdate(
      { email: userData.email },
      { $set: { ...userData, passwordHash, isActive: true } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
  }

  console.log('Demo accounts are ready: admin@campuscoin.test, student1@campuscoin.test, student2@campuscoin.test');
}

seedDemoUsers()
  .catch((error) => {
    console.error(`Demo account seeding skipped: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(disconnectDB);