// Spins up an in-memory MongoDB before any test requires the app, so the
// full stack (routes -> Mongoose models -> a real database) is exercised
// exactly like production, without needing a real Atlas cluster.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-do-not-use-in-prod';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.NODE_ENV = 'test';

const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

async function startTestDb() {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
}

async function stopTestDb() {
  const mongoose = require('mongoose');
  await mongoose.disconnect().catch(() => {});
  if (mongod) await mongod.stop();
}

module.exports = { startTestDb, stopTestDb };
