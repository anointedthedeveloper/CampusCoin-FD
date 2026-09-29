const router = require('express').Router();
const { serverError } = require('../utils/httpErrors');
const { checkBudgetAfterTransaction } = require('../services/budgetAlert.service');
const Category = require('../models/Category');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');
const { ensureRecurringProcessed } = require('./recurring.routes');
const { validateIdParam, isValidObjectId } = require('../utils/objectId');

router.use(protect);
router.param('id', validateIdParam);

const MONTH_RE = /^\d{4}-\d{2}$/;

function formatBudget(b, spentAmount = 0) {
  return {
    id: b._id.toString(),
    userId: b.userId.toString(),
    categoryId: b.categoryId.toString(),
    month: b.month,
    limitAmount: b.limitAmount,
    spentAmount,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

async function getSpentAmounts(userId, month, categoryIds) {
  const [year, mon] = month.split('-').map(Number);
  const start = new Date(year, mon - 1, 1);
  const end = new Date(year, mon, 1);

  const agg = await Transaction.aggregate([
    { $match: { userId, type: 'expense', categoryId: { $in: categoryIds }, occurredAt: { $gte: start, $lt: end } } },
    { $group: { _id: '$categoryId', total: { $sum: '$amount' } } },
  ]);

  const map = {};
  agg.forEach((a) => { map[a._id.toString()] = a.total; });
  return map;
}

// GET /api/v1/budgets?month=YYYY-MM
router.get('/', async (req, res) => {
  try {
    await ensureRecurringProcessed(req.user._id);
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    if (!MONTH_RE.test(month)) return res.status(400).json({ message: 'month must be in YYYY-MM format' });
    const budgets = await Budget.find({ userId: req.user._id, month });

    const categoryIds = budgets.map((b) => b.categoryId);
    const spentMap = await getSpentAmounts(req.user._id, month, categoryIds);

    const formatted = budgets.map((b) => formatBudget(b, spentMap[b.categoryId.toString()] || 0));
    const totalBudgeted = formatted.reduce((s, b) => s + b.limitAmount, 0);
    const totalSpent = formatted.reduce((s, b) => s + b.spentAmount, 0);

    res.json({
      data: {
        month,
        totalBudgeted,
        totalSpent,
        remaining: totalBudgeted - totalSpent,
        budgets: formatted,
      },
    });
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/v1/budgets
router.post('/', async (req, res) => {
  try {
    const { categoryId, month, limitAmount } = req.body;
    if (!categoryId || !month || limitAmount === undefined) {
      return res.status(400).json({ message: 'categoryId, month and limitAmount are required' });
    }
    if (!isValidObjectId(categoryId)) return res.status(400).json({ message: 'Invalid categoryId' });
    if (!MONTH_RE.test(month)) return res.status(400).json({ message: 'month must be in YYYY-MM format' });
    if (!(Number(limitAmount) >= 0 && Number(limitAmount) <= 1e12)) return res.status(400).json({ message: 'limitAmount must be a non-negative number' });

    const category = await Category.findOne({ _id: categoryId, type: 'expense', $or: [{ userId: req.user._id }, { userId: null }] });
    if (!category) return res.status(400).json({ message: 'Choose one of your expense categories' });

    const budget = await Budget.create({ userId: req.user._id, categoryId, month, limitAmount: Number(limitAmount) });
    // Spending may already be over the new limit.
    await checkBudgetAfterTransaction(req.user._id, budget.categoryId, `${month}-15T12:00:00.000Z`);
    const spentMap = await getSpentAmounts(req.user._id, month, [budget.categoryId]);
    res.status(201).json({ data: formatBudget(budget, spentMap[budget.categoryId.toString()] || 0) });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'A budget for this category and month already exists' });
    return serverError(res, err);
  }
});

// PATCH /api/v1/budgets/:id
router.patch('/:id', async (req, res) => {
  try {
    const budget = await Budget.findOne({ _id: req.params.id, userId: req.user._id });
    if (!budget) return res.status(404).json({ message: 'Budget not found' });

    if (req.body.limitAmount !== undefined) {
      if (!(Number(req.body.limitAmount) >= 0 && Number(req.body.limitAmount) <= 1e12)) return res.status(400).json({ message: 'limitAmount must be a non-negative number' });
      budget.limitAmount = Number(req.body.limitAmount);
    }
    await budget.save();
    await checkBudgetAfterTransaction(req.user._id, budget.categoryId, `${budget.month}-15T12:00:00.000Z`);

    const spentMap = await getSpentAmounts(req.user._id, budget.month, [budget.categoryId]);
    res.json({ data: formatBudget(budget, spentMap[budget.categoryId.toString()] || 0) });
  } catch (err) {
    return serverError(res, err);
  }
});

// DELETE /api/v1/budgets/:id
router.delete('/:id', async (req, res) => {
  try {
    const budget = await Budget.findOne({ _id: req.params.id, userId: req.user._id });
    if (!budget) return res.status(404).json({ message: 'Budget not found' });
    await budget.deleteOne();
    res.json({ data: null, message: 'Budget deleted' });
  } catch (err) {
    return serverError(res, err);
  }
});

module.exports = router;
