const zlib = require('zlib');
const mongoose = require('mongoose');
const Backup = require('../models/Backup');
const User = require('../models/User');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const MoneyRoutine = require('../models/MoneyRoutine');
const SavingsGoal = require('../models/SavingsGoal');
const Bookmark = require('../models/Bookmark');
const TipState = require('../models/TipState');

const FORMAT = 'campus-coin-backup';
const VERSION = 1;
const KEEP = { daily: 7, manual: 10, 'pre-restore': 3 };
const DAILY_INTERVAL_MS = 20 * 60 * 60 * 1000; // "daily", with slack for clock drift

// Everything a student owns, and the field linking each record to them.
const COLLECTIONS = {
  categories: { model: Category, owner: 'userId' },
  transactions: { model: Transaction, owner: 'userId' },
  budgets: { model: Budget, owner: 'userId' },
  recurring: { model: MoneyRoutine, owner: 'user' },
  savingsGoals: { model: SavingsGoal, owner: 'userId' },
  bookmarks: { model: Bookmark, owner: 'userId' },
  tipStates: { model: TipState, owner: 'userId' },
};

const PROFILE_FIELDS = ['fullName', 'school', 'academicYear', 'monthlyAllowanceBaseline', 'savingsGoalAmount', 'settings', 'onboarding'];

/** Builds the plain-JSON snapshot of one student's data. */
async function buildSnapshot(userId) {
  const user = await User.findById(userId).lean();
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
  const collections = {};
  await Promise.all(
    Object.entries(COLLECTIONS).map(async ([key, { model, owner }]) => {
      collections[key] = await model.find({ [owner]: userId }).lean();
    }),
  );
  const profile = {};
  for (const field of PROFILE_FIELDS) if (user[field] !== undefined) profile[field] = user[field];
  return {
    format: FORMAT,
    version: VERSION,
    createdAt: new Date().toISOString(),
    account: { email: user.email },
    profile,
    collections,
  };
}

function countsOf(snapshot) {
  return Object.fromEntries(Object.entries(snapshot.collections).map(([k, v]) => [k, v.length]));
}

async function pruneBackups(userId, kind) {
  const keep = KEEP[kind] ?? 5;
  const extra = await Backup.find({ userId, kind }).sort({ createdAt: -1 }).skip(keep).select('_id').lean();
  if (extra.length) await Backup.deleteMany({ _id: { $in: extra.map((b) => b._id) } });
}

/** Stores a compressed backup of the student's data. */
async function createBackup(userId, kind = 'manual') {
  const snapshot = await buildSnapshot(userId);
  const data = zlib.gzipSync(Buffer.from(JSON.stringify(snapshot)));
  const backup = await Backup.create({ userId, kind, data, sizeBytes: data.length, counts: countsOf(snapshot) });
  await pruneBackups(userId, kind);
  return backup;
}

const inFlight = new Map();

/**
 * Makes today's automatic backup if the last one is more than ~a day old.
 * Pages often load several endpoints at once, so concurrent calls share one
 * run, and any duplicate made by another server instance is removed.
 */
async function ensureDailyBackup(userId) {
  const key = String(userId);
  if (inFlight.has(key)) return inFlight.get(key);
  const run = (async () => {
    const since = new Date(Date.now() - DAILY_INTERVAL_MS);
    if (await Backup.exists({ userId, kind: 'daily', createdAt: { $gt: since } })) return null;
    const backup = await createBackup(userId, 'daily');
    const extras = await Backup.find({ userId, kind: 'daily', createdAt: { $gt: since }, _id: { $ne: backup._id } }).select('_id').lean();
    if (extras.length) await Backup.deleteMany({ _id: { $in: extras.map((b) => b._id) } });
    return backup;
  })().finally(() => inFlight.delete(key));
  inFlight.set(key, run);
  return run;
}

function readBackup(backup) {
  return JSON.parse(zlib.gunzipSync(backup.data).toString('utf8'));
}

function formatBackup(b) {
  return { id: String(b._id), kind: b.kind, sizeBytes: b.sizeBytes, counts: b.counts || {}, createdAt: b.createdAt };
}

/** Throws a 400-style error unless `snapshot` looks like one of our backups. */
function validateSnapshot(snapshot) {
  const bad = (message) => Object.assign(new Error(message), { status: 400 });
  if (!snapshot || typeof snapshot !== 'object' || snapshot.format !== FORMAT) throw bad('This file is not a Campus Coin backup.');
  if (Number(snapshot.version) > VERSION) throw bad('This backup was made by a newer version of Campus Coin.');
  if (!snapshot.collections || typeof snapshot.collections !== 'object') throw bad('The backup file is missing its data.');
  for (const key of Object.keys(COLLECTIONS)) {
    const list = snapshot.collections[key];
    if (list !== undefined && !Array.isArray(list)) throw bad(`The backup's ${key} section is damaged.`);
    if (Array.isArray(list) && list.length > 100_000) throw bad('The backup file is too large to restore.');
  }
}

const isId = (v) => v && mongoose.Types.ObjectId.isValid(String(v));

/**
 * Replaces the student's data with a backup. Every record gets a fresh id
 * (with category links re-pointed), so a backup can never collide with
 * another account's records. A "pre-restore" backup is taken first so the
 * restore itself can be undone.
 */
async function restoreSnapshot(userId, snapshot) {
  validateSnapshot(snapshot);
  await createBackup(userId, 'pre-restore');

  const c = snapshot.collections;
  const categoryIds = new Map();
  const newId = () => new mongoose.Types.ObjectId();
  const strip = (doc) => {
    const { _id, __v, createdAt, updatedAt, ...rest } = doc || {};
    return rest;
  };

  const categories = (c.categories || []).filter((d) => d && d.name && ['income', 'expense'].includes(d.type)).map((d) => {
    const id = newId();
    if (isId(d._id)) categoryIds.set(String(d._id), id);
    return { ...strip(d), _id: id, userId };
  });
  const mapCategory = (value) => categoryIds.get(String(value)) || null;

  const transactions = (c.transactions || [])
    .map((d) => ({ ...strip(d), _id: newId(), userId, categoryId: mapCategory(d.categoryId) }))
    .filter((d) => d.categoryId && ['income', 'expense'].includes(d.type) && Number.isFinite(Number(d.amount)) && d.occurredAt);
  const budgets = (c.budgets || [])
    .map((d) => ({ ...strip(d), _id: newId(), userId, categoryId: mapCategory(d.categoryId) }))
    .filter((d) => d.categoryId && /^\d{4}-\d{2}$/.test(d.month || ''));
  const recurring = (c.recurring || [])
    .map((d) => ({ ...strip(d), _id: newId(), user: userId, category: mapCategory(d.category) }))
    .filter((d) => d.category && d.frequency && d.startDate && d.nextRunAt);
  const savingsGoals = (c.savingsGoals || []).filter((d) => d && d.name && Number(d.targetAmount) > 0).map((d) => ({ ...strip(d), _id: newId(), userId }));
  const bookmarks = (c.bookmarks || []).filter((d) => d && isId(d.targetId)).map((d) => ({ ...strip(d), _id: newId(), userId }));
  const tipStates = (c.tipStates || []).filter((d) => d && d.tipKey).map((d) => ({ ...strip(d), _id: newId(), userId }));

  const next = { categories, transactions, budgets, recurring, savingsGoals, bookmarks, tipStates };
  for (const [key, { model, owner }] of Object.entries(COLLECTIONS)) {
    await model.deleteMany({ [owner]: userId });
    if (next[key].length) await model.insertMany(next[key], { ordered: false });
  }

  if (snapshot.profile && typeof snapshot.profile === 'object') {
    const update = {};
    for (const field of PROFILE_FIELDS) {
      if (field === 'fullName' && typeof snapshot.profile.fullName !== 'string') continue;
      if (snapshot.profile[field] !== undefined) update[field] = snapshot.profile[field];
    }
    if (Object.keys(update).length) await User.updateOne({ _id: userId }, { $set: update }, { runValidators: true }).catch(() => undefined);
  }

  return Object.fromEntries(Object.entries(next).map(([k, v]) => [k, v.length]));
}

/**
 * Runs the automatic daily backup for every active student who is due one,
 * stopping before `budgetMs` so a serverless function never times out
 * (anyone left over is picked up next run, or when they next open the app).
 */
async function runDailyBackups({ budgetMs = 50_000 } = {}) {
  const started = Date.now();
  const due = await User.aggregate([
    { $match: { isActive: true } },
    { $lookup: { from: Backup.collection.name, let: { uid: '$_id' }, pipeline: [
      { $match: { $expr: { $and: [{ $eq: ['$userId', '$$uid'] }, { $eq: ['$kind', 'daily'] }, { $gt: ['$createdAt', new Date(Date.now() - DAILY_INTERVAL_MS)] }] } } },
      { $limit: 1 },
      { $project: { _id: 1 } },
    ], as: 'recent' } },
    { $match: { recent: { $size: 0 } } },
    { $project: { _id: 1 } },
  ]);
  let done = 0;
  let failed = 0;
  for (const { _id } of due) {
    if (Date.now() - started > budgetMs) break;
    try {
      await createBackup(_id, 'daily');
      done += 1;
    } catch (err) {
      failed += 1;
      console.error('Daily backup failed for', String(_id), err.message);
    }
  }
  return { due: due.length, done, failed, remaining: due.length - done - failed, ms: Date.now() - started };
}

module.exports = {
  createBackup,
  ensureDailyBackup,
  readBackup,
  formatBackup,
  restoreSnapshot,
  validateSnapshot,
  runDailyBackups,
  buildSnapshot,
  FORMAT,
};
