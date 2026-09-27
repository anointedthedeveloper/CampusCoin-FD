// Runs in its own process (node:test isolates each file) specifically so it
// can exercise the real rate limiter — api.test.js sets NODE_ENV=test, which
// the limiter deliberately skips (see src/middleware/rateLimit.js), so
// limiter behavior has to be proven here instead, with that skip off.
process.env.JWT_SECRET = 'test-jwt-secret-do-not-use-in-prod';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.NODE_ENV = 'development';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let request;

before(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  const app = require('../server');
  request = require('supertest')(app);
});

after(async () => {
  const mongoose = require('mongoose');
  await mongoose.disconnect().catch(() => {});
  if (mongod) await mongod.stop();
});

test('login is rate-limited after repeated attempts from the same client', async () => {
  let sawTooManyRequests = false;
  for (let i = 0; i < 25; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const res = await request.post('/api/v1/auth/login').send({ email: 'nobody@example.com', password: 'wrong' });
    if (res.status === 429) { sawTooManyRequests = true; break; }
    assert.equal(res.status, 401);
  }
  assert.ok(sawTooManyRequests, 'expected the auth rate limiter to eventually return 429');
});
