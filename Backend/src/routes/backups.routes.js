const router = require('express').Router();
const express = require('express');
const rateLimit = require('express-rate-limit');
const Backup = require('../models/Backup');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const { validateIdParam } = require('../utils/objectId');
const { createBackup, ensureDailyBackup, readBackup, formatBackup, restoreSnapshot } = require('../services/backup.service');

router.use(protect);
router.param('id', validateIdParam);

// Backups are cheap but not free — stop a script from hammering them.
const backupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { message: 'Too many backup requests. Please try again later.' },
});

function sendError(res, err) {
  if (err.status) return res.status(err.status).json({ message: err.message });
  console.error(err);
  return res.status(500).json({ message: 'Server error' });
}

// GET /api/v1/backups — also makes today's automatic backup if it's due.
router.get('/', async (req, res) => {
  try {
    await ensureDailyBackup(req.user._id).catch((err) => console.error('Daily backup failed:', err.message));
    const backups = await Backup.find({ userId: req.user._id }).select('-data').sort({ createdAt: -1 }).lean();
    res.json({ data: backups.map(formatBackup) });
  } catch (err) {
    sendError(res, err);
  }
});

// POST /api/v1/backups — back up now.
router.post('/', backupLimiter, async (req, res) => {
  try {
    const backup = await createBackup(req.user._id, 'manual');
    res.status(201).json({ data: formatBackup(backup), message: 'Backup created' });
  } catch (err) {
    sendError(res, err);
  }
});

// GET /api/v1/backups/:id/download — the backup as a JSON file.
router.get('/:id/download', async (req, res) => {
  try {
    const backup = await Backup.findOne({ _id: req.params.id, userId: req.user._id });
    if (!backup) return res.status(404).json({ message: 'Backup not found' });
    const stamp = backup.createdAt.toISOString().slice(0, 16).replace(/[:T]/g, '-');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="campus-coin-backup-${stamp}.json"`);
    res.send(JSON.stringify(readBackup(backup), null, 2));
  } catch (err) {
    sendError(res, err);
  }
});

async function afterRestore(req, res, counts, label) {
  await Notification.create({
    userId: req.user._id,
    type: 'backup',
    title: 'Data restored',
    message: `Your data was restored from ${label}: ${counts.transactions} transactions, ${counts.categories} categories, ${counts.budgets} budgets and ${counts.savingsGoals} savings goals. A copy of what you had before was saved as a "pre-restore" backup.`,
    severity: 'info',
  }).catch(() => undefined);
  res.json({ data: counts, message: 'Your data was restored.' });
}

// POST /api/v1/backups/:id/restore
router.post('/:id/restore', backupLimiter, async (req, res) => {
  try {
    const backup = await Backup.findOne({ _id: req.params.id, userId: req.user._id });
    if (!backup) return res.status(404).json({ message: 'Backup not found' });
    const counts = await restoreSnapshot(req.user._id, readBackup(backup));
    await afterRestore(req, res, counts, `the ${backup.kind} backup of ${backup.createdAt.toDateString()}`);
  } catch (err) {
    sendError(res, err);
  }
});

// POST /api/v1/backups/restore-file — restore from a downloaded backup file
// (JSON body, the file's contents). Larger limit than the app default.
router.post('/restore-file', backupLimiter, express.json({ limit: '15mb' }), async (req, res) => {
  try {
    const counts = await restoreSnapshot(req.user._id, req.body);
    await afterRestore(req, res, counts, 'an uploaded backup file');
  } catch (err) {
    sendError(res, err);
  }
});

// DELETE /api/v1/backups/:id
router.delete('/:id', async (req, res) => {
  try {
    const backup = await Backup.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!backup) return res.status(404).json({ message: 'Backup not found' });
    res.json({ data: null, message: 'Backup deleted' });
  } catch (err) {
    sendError(res, err);
  }
});

module.exports = router;
