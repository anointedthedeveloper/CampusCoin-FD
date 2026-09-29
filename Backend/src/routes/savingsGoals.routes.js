const router = require('express').Router();
const { serverError } = require('../utils/httpErrors');
const SavingsGoal = require('../models/SavingsGoal');
const { protect } = require('../middleware/auth');
const { validateIdParam } = require('../utils/objectId');

router.use(protect);
router.param('id', validateIdParam);

const MAX_GOALS = 50;

/**
 * Validates a create/update body. Returns { value } with only the allowed,
 * cleaned fields, or { error } describing the first problem.
 */
function parseGoal(body, { partial = false } = {}) {
  const value = {};
  const src = body && typeof body === 'object' ? body : {};

  if (src.name !== undefined || !partial) {
    const name = typeof src.name === 'string' ? src.name.trim() : '';
    if (!name) return { error: 'Give the goal a name', field: 'name' };
    value.name = name.slice(0, 80);
  }
  if (src.description !== undefined) {
    value.description = typeof src.description === 'string' ? src.description.trim().slice(0, 300) : '';
  }
  if (src.targetAmount !== undefined || !partial) {
    const n = Number(src.targetAmount);
    if (!Number.isFinite(n) || n <= 0 || n > 1e12) return { error: 'Target amount must be a positive number', field: 'targetAmount' };
    value.targetAmount = Math.round(n * 100) / 100;
  }
  if (src.savedAmount !== undefined) {
    const n = Number(src.savedAmount);
    if (!Number.isFinite(n) || n < 0 || n > 1e12) return { error: 'Saved amount must be zero or more', field: 'savedAmount' };
    value.savedAmount = Math.round(n * 100) / 100;
  }
  if (src.targetDate !== undefined) {
    if (src.targetDate === null || src.targetDate === '') value.targetDate = null;
    else {
      const d = new Date(src.targetDate);
      if (Number.isNaN(d.getTime())) return { error: 'Target date is not a valid date', field: 'targetDate' };
      value.targetDate = d;
    }
  }
  if (src.color !== undefined) {
    if (!SavingsGoal.COLORS.includes(src.color)) return { error: 'Unknown colour', field: 'color' };
    value.color = src.color;
  }
  if (src.icon !== undefined) {
    if (!SavingsGoal.ICONS.includes(src.icon)) return { error: 'Unknown icon', field: 'icon' };
    value.icon = src.icon;
  }
  return { value };
}

function badRequest(res, parsed) {
  return res.status(400).json({ message: parsed.error, fieldErrors: { [parsed.field]: parsed.error } });
}

// GET /api/v1/savings-goals
router.get('/', async (req, res) => {
  try {
    const goals = await SavingsGoal.find({ userId: req.user._id }).sort({ createdAt: 1 });
    res.json({ data: goals.map((g) => g.toPublic()) });
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/v1/savings-goals
router.post('/', async (req, res) => {
  try {
    const parsed = parseGoal(req.body);
    if (parsed.error) return badRequest(res, parsed);
    if ((await SavingsGoal.countDocuments({ userId: req.user._id })) >= MAX_GOALS) {
      return res.status(400).json({ message: `You can have up to ${MAX_GOALS} goals. Delete one to add another.` });
    }
    const goal = await SavingsGoal.create({ ...parsed.value, userId: req.user._id });
    res.status(201).json({ data: goal.toPublic() });
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/v1/savings-goals/import — one-time move of goals that older
// versions kept only in this browser. Skips ones that already exist by name.
router.post('/import', async (req, res) => {
  try {
    const list = Array.isArray(req.body?.goals) ? req.body.goals.slice(0, MAX_GOALS) : [];
    const existing = await SavingsGoal.find({ userId: req.user._id }).select('name').lean();
    const names = new Set(existing.map((g) => g.name.toLowerCase()));
    const docs = [];
    for (const raw of list) {
      const parsed = parseGoal(raw);
      if (parsed.error || names.has(parsed.value.name.toLowerCase())) continue;
      names.add(parsed.value.name.toLowerCase());
      const milestones = Array.isArray(raw.celebratedMilestones) ? raw.celebratedMilestones.filter((m) => [25, 50, 75, 100].includes(m)) : [];
      docs.push({ ...parsed.value, userId: req.user._id, celebratedMilestones: milestones });
    }
    const room = Math.max(0, MAX_GOALS - existing.length);
    if (docs.length && room) await SavingsGoal.insertMany(docs.slice(0, room));
    const goals = await SavingsGoal.find({ userId: req.user._id }).sort({ createdAt: 1 });
    res.json({ data: goals.map((g) => g.toPublic()), meta: { imported: Math.min(docs.length, room) } });
  } catch (err) {
    return serverError(res, err);
  }
});

// PATCH /api/v1/savings-goals/:id
router.patch('/:id', async (req, res) => {
  try {
    const parsed = parseGoal(req.body, { partial: true });
    if (parsed.error) return badRequest(res, parsed);
    const goal = await SavingsGoal.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, parsed.value, { new: true, runValidators: true });
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    res.json({ data: goal.toPublic() });
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/v1/savings-goals/:id/adjust  { delta } — add (+) or withdraw (−).
router.post('/:id/adjust', async (req, res) => {
  try {
    const delta = Number(req.body?.delta);
    if (!Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 1e12) {
      return res.status(400).json({ message: 'Enter an amount to add or withdraw' });
    }
    const goal = await SavingsGoal.findOne({ _id: req.params.id, userId: req.user._id });
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    goal.savedAmount = Math.max(0, Math.round((goal.savedAmount + delta) * 100) / 100);
    await goal.save();
    res.json({ data: goal.toPublic() });
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/v1/savings-goals/:id/milestones  { milestone } — remembers that
// a 25/50/75/100% celebration was shown so it only fires once.
router.post('/:id/milestones', async (req, res) => {
  try {
    const milestone = Number(req.body?.milestone);
    if (![25, 50, 75, 100].includes(milestone)) return res.status(400).json({ message: 'Milestone must be 25, 50, 75 or 100' });
    const goal = await SavingsGoal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $addToSet: { celebratedMilestones: milestone } },
      { new: true },
    );
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    res.json({ data: goal.toPublic() });
  } catch (err) {
    return serverError(res, err);
  }
});

// DELETE /api/v1/savings-goals/:id
router.delete('/:id', async (req, res) => {
  try {
    const goal = await SavingsGoal.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    res.json({ data: null, message: 'Goal deleted' });
  } catch (err) {
    return serverError(res, err);
  }
});

module.exports = router;
