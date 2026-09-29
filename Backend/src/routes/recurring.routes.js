const router = require('express').Router();
const { serverError } = require('../utils/httpErrors');

const MoneyRoutine = require('../models/MoneyRoutine');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const { protect } = require('../middleware/auth');
const { validateIdParam } = require('../utils/objectId');
const { checkBudgetAfterTransaction } = require('../services/budgetAlert.service');

router.use(protect);
router.param('id', validateIdParam);

function formatRecurring(item) {
  return {
    id: item._id.toString(),
    userId: item.user.toString(),
    categoryId: item.category.toString(),
    amount: item.amount,
    type: item.type,
    description: item.description,
    frequency: item.frequency,
    interval: item.interval,
    startDate: item.startDate,
    endDate: item.endDate,
    nextRunAt: item.nextRunAt,
    lastRunAt: item.lastRunAt,
    isActive: item.isActive,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function getNextRunDate(date, frequency, interval) {
  const next = new Date(date);

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + interval);
      break;
    case 'weekly':
      next.setDate(next.getDate() + interval * 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + interval);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + interval);
      break;
    default:
      throw new Error('Invalid recurrence frequency');
  }

  return next;
}

// GET /api/v1/money-routines
router.get('/', async (req, res) => {
  try {
    const items = await MoneyRoutine.find({
      user: req.user._id,
    }).sort({ nextRunAt: 1 });

    res.json({ data: items.map(formatRecurring) });
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/v1/money-routines
router.post('/', async (req, res) => {
  try {
    const {
      categoryId,
      amount,
      type,
      description,
      frequency,
      interval = 1,
      startDate,
      endDate = null,
    } = req.body;

    if (!categoryId || amount === undefined || !type || !frequency || !startDate) {
      return res.status(400).json({
        message: 'categoryId, amount, type, frequency and startDate are required',
      });
    }

    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ message: 'type must be income or expense' });
    }

    if (!['daily', 'weekly', 'monthly', 'yearly'].includes(frequency)) {
      return res.status(400).json({ message: 'Invalid frequency' });
    }

    if (Number(amount) < 0) {
      return res.status(400).json({ message: 'Amount cannot be negative' });
    }

    const category = await Category.findOne({
      _id: categoryId,
      $or: [{ userId: req.user._id }, { userId: null }],
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const firstRun = new Date(startDate);

    const recurring = await MoneyRoutine.create({
      user: req.user._id,
      category: categoryId,
      amount: Number(amount),
      type,
      description: description?.trim(),
      frequency,
      interval: Number(interval) || 1,
      startDate: firstRun,
      endDate: endDate ? new Date(endDate) : null,
      nextRunAt: firstRun,
      isActive: true,
    });

    res.status(201).json({ data: formatRecurring(recurring) });
  } catch (err) {
    return serverError(res, err);
  }
});

// PATCH /api/v1/money-routines/:id
router.patch('/:id', async (req, res) => {
  try {
    const recurring = await MoneyRoutine.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!recurring) {
      return res.status(404).json({ message: 'Recurring transaction not found' });
    }

    const allowedFields = [
      'amount', 'type', 'description', 'frequency', 'interval',
      'startDate', 'endDate', 'isActive',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) recurring[field] = req.body[field];
    });

    if (req.body.amount !== undefined) recurring.amount = Number(req.body.amount);
    if (req.body.interval !== undefined) recurring.interval = Number(req.body.interval);
    if (req.body.startDate !== undefined) recurring.startDate = new Date(req.body.startDate);
    if (req.body.endDate !== undefined) {
      recurring.endDate = req.body.endDate ? new Date(req.body.endDate) : null;
    }

    await recurring.save();

    res.json({ data: formatRecurring(recurring) });
  } catch (err) {
    return serverError(res, err);
  }
});

// DELETE /api/v1/money-routines/:id
router.delete('/:id', async (req, res) => {
  try {
    const recurring = await MoneyRoutine.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!recurring) {
      return res.status(404).json({ message: 'Recurring transaction not found' });
    }

    await recurring.deleteOne();

    res.json({ data: null, message: 'Recurring transaction deleted' });
  } catch (err) {
    return serverError(res, err);
  }
});

// ── Background processor (called by a cron / scheduled job) ──────────────────

async function processDueRecurringTransactions() {
  const now = new Date();

  const dueItems = await MoneyRoutine.find({
    isActive: true,
    nextRunAt: { $lte: now },
    $or: [{ endDate: null }, { endDate: { $gte: now } }],
  });

  for (const recurring of dueItems) {
    const tx = await Transaction.create({
      userId: recurring.user,
      categoryId: recurring.category,
      amount: recurring.amount,
      type: recurring.type,
      description: recurring.description,
      source: 'recurring',
      occurredAt: recurring.nextRunAt,
    });

    // Fire budget alert if it's an expense
    if (tx.type === 'expense') {
      await checkBudgetAfterTransaction(recurring.user, recurring.category, tx.occurredAt);
    }

    recurring.lastRunAt = tx.occurredAt;

    const nextRun = getNextRunDate(recurring.nextRunAt, recurring.frequency, recurring.interval);
    recurring.nextRunAt = nextRun;

    if (recurring.endDate && nextRun > recurring.endDate) {
      recurring.isActive = false;
    }

    await recurring.save();
  }

  return dueItems.length;
}

const MAX_CATCH_UP_RUNS = 62;

// Posts every occurrence that has come due (catching up if the student
// hasn't opened the app for a while). Each occurrence is claimed atomically
// by advancing nextRunAt first, so two parallel requests can never post the
// same occurrence twice.
async function processDueRecurringTransactionsForUser(userId) {
  const now = new Date();
  const dueItems = await MoneyRoutine.find({
    user: userId,
    isActive: true,
    nextRunAt: { $lte: now },
  });

  let processed = 0;
  for (const item of dueItems) {
    let runAt = item.nextRunAt;
    for (let i = 0; i < MAX_CATCH_UP_RUNS && runAt <= now; i += 1) {
      if (item.endDate && runAt > item.endDate) break;
      const nextRun = getNextRunDate(runAt, item.frequency, item.interval);
      const finished = Boolean(item.endDate && nextRun > item.endDate);
      const claimed = await MoneyRoutine.findOneAndUpdate(
        { _id: item._id, nextRunAt: runAt, isActive: true },
        { $set: { nextRunAt: nextRun, lastRunAt: runAt, ...(finished ? { isActive: false } : {}) } },
        { returnDocument: 'after' },
      );
      if (!claimed) break; // another request already posted this occurrence

      const tx = await Transaction.create({
        userId: item.user,
        categoryId: item.category,
        amount: item.amount,
        type: item.type,
        description: item.description,
        source: 'recurring',
        occurredAt: runAt,
      });
      if (tx.type === 'expense') {
        await checkBudgetAfterTransaction(item.user, item.category, tx.occurredAt).catch(() => undefined);
      }
      processed += 1;
      if (finished) break;
      runAt = nextRun;
    }
    // An end date that has already passed with nothing left to post.
    if (item.endDate && item.endDate < now) {
      await MoneyRoutine.updateOne({ _id: item._id, nextRunAt: { $gt: item.endDate } }, { $set: { isActive: false } });
    }
  }
  return processed;
}

// Called from the student's main data endpoints (transactions, dashboard,
// budgets, reports) so recurring entries post on time without a cron job —
// the API runs serverless. Throttled per user per warm instance.
const lastProcessedAt = new Map();
const PROCESS_THROTTLE_MS = 60 * 1000;
async function ensureRecurringProcessed(userId) {
  const key = userId.toString();
  const last = lastProcessedAt.get(key) ?? 0;
  if (Date.now() - last < PROCESS_THROTTLE_MS) return;
  lastProcessedAt.set(key, Date.now());
  try {
    await processDueRecurringTransactionsForUser(userId);
  } catch (err) {
    console.error('Recurring processing failed:', err.message);
  }
}

// POST /api/v1/money-routines/process
// Manually trigger processing for the authenticated user (useful for testing)
router.post('/process', async (req, res) => {
  try {
    const processed = await processDueRecurringTransactionsForUser(req.user._id);
    res.json({ data: { processed }, message: 'Recurring transactions processed' });
  } catch (err) {
    return serverError(res, err);
  }
});

module.exports = {
  router,
  processDueRecurringTransactions,
  processDueRecurringTransactionsForUser,
  ensureRecurringProcessed,
};
