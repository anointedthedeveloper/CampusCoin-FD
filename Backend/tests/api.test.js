const { test, before, after, mock } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { startTestDb, stopTestDb } = require('./setup');

let app;
let request;
let User;

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

async function registerUser(overrides = {}) {
  const email = overrides.email || `user${Date.now()}${Math.random().toString(36).slice(2)}@example.com`;
  const res = await request.post('/api/v1/auth/register').send({
    fullName: overrides.fullName || 'Test Student',
    email,
    password: overrides.password || 'password123',
    school: 'Test University',
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { email, password: overrides.password || 'password123', ...res.body.data };
}

before(async () => {
  await startTestDb();
  app = require('../server');
  request = require('supertest')(app);
});

after(async () => {
  await stopTestDb();
});

// ── AUTH ──────────────────────────────────────────────────────────────────

test('register: rejects missing fields', async () => {
  const res = await request.post('/api/v1/auth/register').send({ email: 'a@b.com' });
  assert.equal(res.status, 400);
});

test('register: rejects a short password', async () => {
  const res = await request.post('/api/v1/auth/register').send({
    fullName: 'Short Pw', email: 'shortpw@example.com', password: '123',
  });
  assert.equal(res.status, 400);
});

test('register: creates a user and never returns passwordHash', async () => {
  const { user, accessToken, refreshToken } = (await registerUser());
  assert.ok(user.id);
  assert.ok(accessToken);
  assert.ok(refreshToken);
  assert.equal(user.passwordHash, undefined);
});

test('register: rejects a duplicate email', async () => {
  const email = 'dupe@example.com';
  await registerUser({ email });
  const res = await request.post('/api/v1/auth/register').send({
    fullName: 'Dupe Two', email, password: 'password123',
  });
  assert.equal(res.status, 409);
});

test('login: rejects wrong password without revealing which field was wrong', async () => {
  const { email } = await registerUser();
  const res = await request.post('/api/v1/auth/login').send({ email, password: 'wrongpassword' });
  assert.equal(res.status, 401);
});

test('login: rejects an unknown email with the same message as a wrong password', async () => {
  const res1 = await request.post('/api/v1/auth/login').send({ email: 'nobody@example.com', password: 'password123' });
  const { email } = await registerUser();
  const res2 = await request.post('/api/v1/auth/login').send({ email, password: 'wrongpassword' });
  assert.equal(res1.status, 401);
  assert.equal(res2.status, 401);
  assert.equal(res1.body.message, res2.body.message);
});

test('login: succeeds with correct credentials', async () => {
  const { email, password } = await registerUser();
  const res = await request.post('/api/v1/auth/login').send({ email, password });
  assert.equal(res.status, 200);
  assert.ok(res.body.data.accessToken);
});

test('profile: rejects requests with no token', async () => {
  const res = await request.get('/api/v1/profile');
  assert.equal(res.status, 401);
  assert.equal(res.body.code, 'NO_TOKEN');
});

test('profile: rejects an invalid token', async () => {
  const res = await request.get('/api/v1/profile').set('Authorization', 'Bearer not-a-real-token');
  assert.equal(res.status, 401);
  assert.equal(res.body.code, 'INVALID_TOKEN');
});

test('profile: returns the authenticated user for a valid token', async () => {
  const { accessToken, email } = await registerUser();
  const res = await request.get('/api/v1/profile').set('Authorization', `Bearer ${accessToken}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.email, email);
});

test('forgot-password: does not reveal whether an email is registered', async () => {
  const res = await request.post('/api/v1/auth/forgot-password').send({ email: 'ghost@example.com' });
  assert.equal(res.status, 200);
});

test('forgot-password + reset-password: full round trip with a hashed, single-use token', async () => {
  const { email } = await registerUser();

  const warnCalls = [];
  const warnMock = mock.method(console, 'warn', (...args) => { warnCalls.push(args.join(' ')); });
  const forgotRes = await request.post('/api/v1/auth/forgot-password').send({ email });
  warnMock.mock.restore();
  assert.equal(forgotRes.status, 200);

  const logged = warnCalls.find((line) => line.includes('reset-password/'));
  assert.ok(logged, 'expected the dev fallback to log a reset link');
  const rawToken = logged.match(/reset-password\/([a-f0-9]+)/)[1];

  User = User || require('../src/models/User');
  const dbUser = await User.findOne({ email });
  assert.equal(dbUser.resetPasswordToken, hashToken(rawToken), 'token must be stored hashed, not raw');

  const badReset = await request.post('/api/v1/auth/reset-password').send({ token: 'wrong-token', newPassword: 'brandNewPassword1' });
  assert.equal(badReset.status, 400);

  const okReset = await request.post('/api/v1/auth/reset-password').send({ token: rawToken, newPassword: 'brandNewPassword1' });
  assert.equal(okReset.status, 200);

  // Token is single-use
  const reuseReset = await request.post('/api/v1/auth/reset-password').send({ token: rawToken, newPassword: 'anotherPassword2' });
  assert.equal(reuseReset.status, 400);

  const oldLogin = await request.post('/api/v1/auth/login').send({ email, password: 'password123' });
  assert.equal(oldLogin.status, 401);
  const newLogin = await request.post('/api/v1/auth/login').send({ email, password: 'brandNewPassword1' });
  assert.equal(newLogin.status, 200);
});

test('reset-password: rejects an expired token', async () => {
  const { email } = await registerUser();
  User = User || require('../src/models/User');
  const rawToken = 'expired-raw-token-for-test';
  await User.updateOne(
    { email },
    { resetPasswordToken: hashToken(rawToken), resetPasswordExpires: new Date(Date.now() - 1000) },
  );
  const res = await request.post('/api/v1/auth/reset-password').send({ token: rawToken, newPassword: 'somePassword1' });
  assert.equal(res.status, 400);
});

test('change-password: requires auth, requires the correct current password, then works', async () => {
  const noAuth = await request.patch('/api/v1/auth/change-password').send({ currentPassword: 'x', newPassword: 'newPassword12' });
  assert.equal(noAuth.status, 401);

  const { accessToken, email } = await registerUser();
  const wrongCurrent = await request.patch('/api/v1/auth/change-password')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ currentPassword: 'wrongone', newPassword: 'newPassword12' });
  assert.equal(wrongCurrent.status, 401);

  const ok = await request.patch('/api/v1/auth/change-password')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ currentPassword: 'password123', newPassword: 'newPassword12' });
  assert.equal(ok.status, 200);

  const login = await request.post('/api/v1/auth/login').send({ email, password: 'newPassword12' });
  assert.equal(login.status, 200);
});

// ── CATEGORIES ────────────────────────────────────────────────────────────

test('categories: seeds defaults including a fallback for both types', async () => {
  const { accessToken } = await registerUser();
  const res = await request.get('/api/v1/categories').set('Authorization', `Bearer ${accessToken}`);
  assert.equal(res.status, 200);
  const names = res.body.data.map((c) => c.name);
  assert.ok(names.includes('Other'));
  assert.ok(names.includes('Other Income'));
});

test('categories: rejects an invalid type on create', async () => {
  const { accessToken } = await registerUser();
  const res = await request.post('/api/v1/categories').set('Authorization', `Bearer ${accessToken}`)
    .send({ name: 'Weird', type: 'not-a-type' });
  assert.equal(res.status, 400);
});

test('categories: malformed :id returns 400, not 500', async () => {
  const { accessToken } = await registerUser();
  const res = await request.patch('/api/v1/categories/not-an-object-id').set('Authorization', `Bearer ${accessToken}`).send({ name: 'x' });
  assert.equal(res.status, 400);
});

test('categories: cannot delete the fallback category', async () => {
  const { accessToken } = await registerUser();
  const list = await request.get('/api/v1/categories').set('Authorization', `Bearer ${accessToken}`);
  const other = list.body.data.find((c) => c.name === 'Other');
  const res = await request.delete(`/api/v1/categories/${other.id}`).set('Authorization', `Bearer ${accessToken}`);
  assert.equal(res.status, 400);
  assert.equal(res.body.code, 'CANNOT_DELETE_FALLBACK');
});

test('categories: deleting a category in use reassigns its transactions to the fallback', async () => {
  const { accessToken } = await registerUser();
  const catRes = await request.post('/api/v1/categories').set('Authorization', `Bearer ${accessToken}`)
    .send({ name: 'Side Hustle', type: 'expense' });
  const category = catRes.body.data;

  const txRes = await request.post('/api/v1/transactions').set('Authorization', `Bearer ${accessToken}`).send({
    categoryId: category.id, type: 'expense', amount: 500, occurredAt: new Date().toISOString(),
  });
  assert.equal(txRes.status, 201);

  const delRes = await request.delete(`/api/v1/categories/${category.id}`).set('Authorization', `Bearer ${accessToken}`);
  assert.equal(delRes.status, 200);
  assert.equal(delRes.body.data.reassignedCount, 1);

  const txAfter = await request.get(`/api/v1/transactions/${txRes.body.data.id}`).set('Authorization', `Bearer ${accessToken}`);
  const categoriesAfter = await request.get('/api/v1/categories').set('Authorization', `Bearer ${accessToken}`);
  const fallback = categoriesAfter.body.data.find((c) => c.name === 'Other');
  assert.equal(txAfter.body.data.categoryId, fallback.id);
});

// ── TRANSACTIONS + OWNERSHIP ISOLATION ─────────────────────────────────────

test('transactions: validates required and malformed fields', async () => {
  const { accessToken } = await registerUser();
  const categories = await request.get('/api/v1/categories').set('Authorization', `Bearer ${accessToken}`);
  const cat = categories.body.data.find((c) => c.type === 'expense');

  const missing = await request.post('/api/v1/transactions').set('Authorization', `Bearer ${accessToken}`).send({});
  assert.equal(missing.status, 400);

  const badType = await request.post('/api/v1/transactions').set('Authorization', `Bearer ${accessToken}`).send({
    categoryId: cat.id, type: 'not-a-type', amount: 10, occurredAt: new Date().toISOString(),
  });
  assert.equal(badType.status, 400);

  const negativeAmount = await request.post('/api/v1/transactions').set('Authorization', `Bearer ${accessToken}`).send({
    categoryId: cat.id, type: 'expense', amount: -10, occurredAt: new Date().toISOString(),
  });
  assert.equal(negativeAmount.status, 400);

  const badId = await request.get('/api/v1/transactions/not-an-object-id').set('Authorization', `Bearer ${accessToken}`);
  assert.equal(badId.status, 400);
});

test('transactions: a user cannot read, update or delete another user\'s transaction', async () => {
  const userA = await registerUser();
  const userB = await registerUser();

  const categoriesA = await request.get('/api/v1/categories').set('Authorization', `Bearer ${userA.accessToken}`);
  const catA = categoriesA.body.data.find((c) => c.type === 'expense');

  const created = await request.post('/api/v1/transactions').set('Authorization', `Bearer ${userA.accessToken}`).send({
    categoryId: catA.id, type: 'expense', amount: 1200, occurredAt: new Date().toISOString(), description: 'Groceries',
  });
  assert.equal(created.status, 201);
  const txId = created.body.data.id;

  const readAsB = await request.get(`/api/v1/transactions/${txId}`).set('Authorization', `Bearer ${userB.accessToken}`);
  assert.equal(readAsB.status, 404);

  const updateAsB = await request.patch(`/api/v1/transactions/${txId}`).set('Authorization', `Bearer ${userB.accessToken}`).send({ amount: 1 });
  assert.equal(updateAsB.status, 404);

  const deleteAsB = await request.delete(`/api/v1/transactions/${txId}`).set('Authorization', `Bearer ${userB.accessToken}`);
  assert.equal(deleteAsB.status, 404);

  // The owner can still read it fine.
  const readAsA = await request.get(`/api/v1/transactions/${txId}`).set('Authorization', `Bearer ${userA.accessToken}`);
  assert.equal(readAsA.status, 200);

  // And user B's own transaction list is empty — no cross-user leakage.
  const listAsB = await request.get('/api/v1/transactions').set('Authorization', `Bearer ${userB.accessToken}`);
  assert.equal(listAsB.body.data.totalItems, 0);
});

test('transactions: full CRUD lifecycle', async () => {
  const { accessToken } = await registerUser();
  const categories = await request.get('/api/v1/categories').set('Authorization', `Bearer ${accessToken}`);
  const cat = categories.body.data.find((c) => c.type === 'expense');

  const created = await request.post('/api/v1/transactions').set('Authorization', `Bearer ${accessToken}`).send({
    categoryId: cat.id, type: 'expense', amount: 300, occurredAt: new Date().toISOString(), description: 'Lunch',
  });
  assert.equal(created.status, 201);

  const updated = await request.patch(`/api/v1/transactions/${created.body.data.id}`).set('Authorization', `Bearer ${accessToken}`).send({ amount: 350 });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.amount, 350);

  const deleted = await request.delete(`/api/v1/transactions/${created.body.data.id}`).set('Authorization', `Bearer ${accessToken}`);
  assert.equal(deleted.status, 200);

  const afterDelete = await request.get(`/api/v1/transactions/${created.body.data.id}`).set('Authorization', `Bearer ${accessToken}`);
  assert.equal(afterDelete.status, 404);
});

// ── BUDGETS + BUDGET-ALERT NOTIFICATIONS ──────────────────────────────────

test('budgets: create/read/update/delete, with spentAmount computed from real transactions', async () => {
  const { accessToken } = await registerUser();
  const categories = await request.get('/api/v1/categories').set('Authorization', `Bearer ${accessToken}`);
  const cat = categories.body.data.find((c) => c.name === 'Food & Drinks');
  const month = new Date().toISOString().slice(0, 7);

  const badLimit = await request.post('/api/v1/budgets').set('Authorization', `Bearer ${accessToken}`).send({ categoryId: cat.id, month, limitAmount: -5 });
  assert.equal(badLimit.status, 400);

  const created = await request.post('/api/v1/budgets').set('Authorization', `Bearer ${accessToken}`).send({ categoryId: cat.id, month, limitAmount: 1000 });
  assert.equal(created.status, 201);

  await request.post('/api/v1/transactions').set('Authorization', `Bearer ${accessToken}`).send({
    categoryId: cat.id, type: 'expense', amount: 400, occurredAt: new Date().toISOString(),
  });

  const list = await request.get(`/api/v1/budgets?month=${month}`).set('Authorization', `Bearer ${accessToken}`);
  assert.equal(list.status, 200);
  const budget = list.body.data.budgets.find((b) => b.categoryId === cat.id);
  assert.equal(budget.spentAmount, 400);

  const updated = await request.patch(`/api/v1/budgets/${created.body.data.id}`).set('Authorization', `Bearer ${accessToken}`).send({ limitAmount: 1200 });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.limitAmount, 1200);

  const removed = await request.delete(`/api/v1/budgets/${created.body.data.id}`).set('Authorization', `Bearer ${accessToken}`);
  assert.equal(removed.status, 200);
});

test('budgets: exceeding the limit fires a budget-exceeded notification exactly once', async () => {
  const { accessToken } = await registerUser();
  const categories = await request.get('/api/v1/categories').set('Authorization', `Bearer ${accessToken}`);
  const cat = categories.body.data.find((c) => c.name === 'Transport');
  const month = new Date().toISOString().slice(0, 7);

  await request.post('/api/v1/budgets').set('Authorization', `Bearer ${accessToken}`).send({ categoryId: cat.id, month, limitAmount: 100 });

  await request.post('/api/v1/transactions').set('Authorization', `Bearer ${accessToken}`).send({
    categoryId: cat.id, type: 'expense', amount: 150, occurredAt: new Date().toISOString(),
  });
  // A second expense past the threshold should NOT create a duplicate notification.
  await request.post('/api/v1/transactions').set('Authorization', `Bearer ${accessToken}`).send({
    categoryId: cat.id, type: 'expense', amount: 10, occurredAt: new Date().toISOString(),
  });

  const notifs = await request.get('/api/v1/notifications').set('Authorization', `Bearer ${accessToken}`);
  const budgetAlerts = notifs.body.data.filter((n) => n.type === 'budget-exceeded');
  assert.equal(budgetAlerts.length, 1, 'expected exactly one budget-exceeded notification, not a duplicate per transaction');
});

// ── REPORTS + DASHBOARD ────────────────────────────────────────────────────

test('reports: rejects a malformed month and computes totals for a valid one', async () => {
  const { accessToken } = await registerUser();
  const bad = await request.get('/api/v1/reports/monthly?month=not-a-month').set('Authorization', `Bearer ${accessToken}`);
  assert.equal(bad.status, 400);

  const categories = await request.get('/api/v1/categories').set('Authorization', `Bearer ${accessToken}`);
  const income = categories.body.data.find((c) => c.type === 'income');
  await request.post('/api/v1/transactions').set('Authorization', `Bearer ${accessToken}`).send({
    categoryId: income.id, type: 'income', amount: 5000, occurredAt: new Date().toISOString(),
  });

  const month = new Date().toISOString().slice(0, 7);
  const res = await request.get(`/api/v1/reports/monthly?month=${month}`).set('Authorization', `Bearer ${accessToken}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.totalIncome, 5000);
});

test('dashboard: budget totals reflect real budgets for the current month', async () => {
  const { accessToken } = await registerUser();
  const categories = await request.get('/api/v1/categories').set('Authorization', `Bearer ${accessToken}`);
  const cat = categories.body.data.find((c) => c.name === 'Housing');
  const month = new Date().toISOString().slice(0, 7);

  await request.post('/api/v1/budgets').set('Authorization', `Bearer ${accessToken}`).send({ categoryId: cat.id, month, limitAmount: 2000 });

  const res = await request.get('/api/v1/dashboard').set('Authorization', `Bearer ${accessToken}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.budget.totalBudgeted, 2000, 'dashboard must read budgets by userId/month string, matching the Budget schema');
});

// ── ADMIN + AUTHORIZATION ──────────────────────────────────────────────────

test('admin: a regular student cannot access admin routes', async () => {
  const { accessToken } = await registerUser();
  const res = await request.get('/api/v1/admin/users').set('Authorization', `Bearer ${accessToken}`);
  assert.equal(res.status, 403);
});

test('admin: an admin can list users and deleting one cascades their data', async () => {
  const admin = await registerUser();
  User = User || require('../src/models/User');
  await User.updateOne({ email: admin.email }, { role: 'admin' });
  const adminLogin = await request.post('/api/v1/auth/login').send({ email: admin.email, password: admin.password });
  const adminToken = adminLogin.body.data.accessToken;

  const target = await registerUser();
  const categories = await request.get('/api/v1/categories').set('Authorization', `Bearer ${target.accessToken}`);
  const cat = categories.body.data.find((c) => c.type === 'expense');
  await request.post('/api/v1/transactions').set('Authorization', `Bearer ${target.accessToken}`).send({
    categoryId: cat.id, type: 'expense', amount: 20, occurredAt: new Date().toISOString(),
  });

  const list = await request.get('/api/v1/admin/users').set('Authorization', `Bearer ${adminToken}`);
  assert.equal(list.status, 200);
  assert.ok(list.body.data.items.some((u) => u.email === target.email));

  const Transaction = require('../src/models/Transaction');
  const del = await request.delete(`/api/v1/admin/users/${target.user.id}`).set('Authorization', `Bearer ${adminToken}`);
  assert.equal(del.status, 200);
  const remaining = await Transaction.countDocuments({ userId: target.user.id });
  assert.equal(remaining, 0, 'deleting a user should cascade-delete their transactions');
});

// ── GENERAL ERROR HANDLING ─────────────────────────────────────────────────

test('unknown routes return a JSON 404', async () => {
  const res = await request.get('/api/v1/this-route-does-not-exist');
  assert.equal(res.status, 404);
});

test('malformed JSON body returns a clean 400, not an HTML error page', async () => {
  const res = await request.post('/api/v1/auth/login').set('Content-Type', 'application/json').send('{not json');
  assert.equal(res.status, 400);
  assert.equal(res.type, 'application/json');
});
