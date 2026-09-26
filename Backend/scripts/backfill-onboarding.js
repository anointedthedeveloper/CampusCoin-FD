// One-time migration: accounts created before the onboarding feature shipped
// would otherwise read as onboarding.status "not_started" (the schema
// default for any user missing the field) and get funneled into the setup
// flow on their next login. This marks every such existing account as
// already configured so only genuinely new signups go through onboarding.
//
// Usage: node scripts/backfill-onboarding.js   (or `npm run migrate:onboarding`)
require('dotenv').config();
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');

async function run() {
  const connected = await connectDB();
  if (!connected) {
    console.error('Could not connect to MongoDB. Check MONGO_URI in your environment.');
    process.exit(1);
  }

  const result = await User.updateMany(
    { 'onboarding.status': { $exists: false } },
    {
      $set: {
        'onboarding.status': 'completed',
        'onboarding.currentStep': 5,
        'onboarding.completedAt': new Date(),
      },
    },
  );

  console.log(`Marked ${result.modifiedCount} existing user(s) as onboarding-completed.`);
  await disconnectDB();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
