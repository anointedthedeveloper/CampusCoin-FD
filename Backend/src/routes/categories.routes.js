const router = require('express').Router();
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const { protect } = require('../middleware/auth');
const { validateIdParam } = require('../utils/objectId');

const CATEGORY_TYPES = ['income', 'expense'];
const FALLBACK_NAME = { income: 'Other Income', expense: 'Other' };

// The fallback categories transactions/budgets get reassigned to when their
// own category is deleted. Looked up (and created on demand, for accounts
// that predate the "Other Income" default) rather than assumed to exist.
async function getOrCreateFallbackCategory(userId, type) {
  const name = FALLBACK_NAME[type];
  return Category.findOneAndUpdate(
    { userId, type, name },
    { $setOnInsert: { userId, type, name, icon: 'more-horizontal', color: '#94a3b8', isDefault: true } },
    { upsert: true, new: true },
  );
}

router.use(protect);
router.param('id', validateIdParam);

function formatCategory(c) {
  return {
    id: c._id.toString(),
    name: c.name,
    type: c.type,
    icon: c.icon,
    color: c.color,
    isDefault: c.isDefault,
    userId: c.userId?.toString() ?? null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

// GET /api/v1/categories  — returns user's own + system defaults
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({
      $or: [{ userId: req.user._id }, { userId: null, isDefault: true }],
    }).sort({ name: 1 });
    res.json({ data: categories.map(formatCategory) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/v1/categories
router.post('/', async (req, res) => {
  try {
    const { name, type, icon, color } = req.body;
    if (!name?.trim() || !type) return res.status(400).json({ message: 'Name and type are required' });
    if (!CATEGORY_TYPES.includes(type)) return res.status(400).json({ message: "type must be 'income' or 'expense'" });

    const category = await Category.create({ name: name.trim(), type, icon, color, userId: req.user._id, isDefault: false });
    res.status(201).json({ data: formatCategory(category) });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'A category with this name and type already exists' });
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/v1/categories/:id
router.patch('/:id', async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, userId: req.user._id });
    if (!category) return res.status(404).json({ message: 'Category not found' });

    const allowed = ['name', 'icon', 'color'];
    allowed.forEach((key) => { if (req.body[key] !== undefined) category[key] = req.body[key]; });
    await category.save();

    res.json({ data: formatCategory(category) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/v1/categories/:id — reassigns any transactions/budgets in this
// category to the type's fallback ("Other" / "Other Income") category, then
// deletes it. Returns how many transactions were moved so the client can
// tell the user what happened instead of them silently vanishing.
router.delete('/:id', async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, userId: req.user._id });
    if (!category) return res.status(404).json({ message: 'Category not found' });

    if (category.name.trim().toLowerCase() === FALLBACK_NAME[category.type].toLowerCase()) {
      return res.status(400).json({
        message: `"${category.name}" is the default fallback category for ${category.type} and cannot be deleted.`,
        code: 'CANNOT_DELETE_FALLBACK',
      });
    }

    const [txCount, budgetCount] = await Promise.all([
      Transaction.countDocuments({ userId: req.user._id, categoryId: category._id }),
      Budget.countDocuments({ userId: req.user._id, categoryId: category._id }),
    ]);

    let reassignedCount = 0;
    if (txCount > 0 || budgetCount > 0) {
      const fallback = await getOrCreateFallbackCategory(req.user._id, category.type);

      if (txCount > 0) {
        const result = await Transaction.updateMany(
          { userId: req.user._id, categoryId: category._id },
          { $set: { categoryId: fallback._id } },
        );
        reassignedCount = result.modifiedCount;
      }

      if (budgetCount > 0) {
        const budgets = await Budget.find({ userId: req.user._id, categoryId: category._id });
        for (const budget of budgets) {
          const existing = await Budget.findOne({ userId: req.user._id, categoryId: fallback._id, month: budget.month });
          if (existing) {
            existing.limitAmount += budget.limitAmount;
            await existing.save();
            await budget.deleteOne();
          } else {
            budget.categoryId = fallback._id;
            await budget.save();
          }
        }
      }
    }

    await category.deleteOne();
    res.json({ data: { reassignedCount }, message: 'Category deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
