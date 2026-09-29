const router = require('express').Router();
const { serverError } = require('../utils/httpErrors');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const { protect } = require('../middleware/auth');
const { validateIdParam } = require('../utils/objectId');
const { ensureSystemTemplates } = require('../services/defaultCategories.service');

const CATEGORY_TYPES = ['income', 'expense'];
const FALLBACK_NAMES = { income: ['Other Income'], expense: ['Miscellaneous', 'Other'] };

// The fallback categories transactions/budgets get reassigned to when their
// own category is deleted. Looked up (and created on demand, for accounts
// that predate the "Other Income" default) rather than assumed to exist.
async function getOrCreateFallbackCategory(userId, type) {
  // Older accounts were seeded with "Other"; newer ones get "Miscellaneous".
  const existing = await Category.findOne({ userId, type, name: { $in: FALLBACK_NAMES[type] } });
  if (existing) return existing;
  const name = FALLBACK_NAMES[type][0];
  return Category.findOneAndUpdate(
    { userId, type, name },
    { $setOnInsert: { userId, type, name, icon: 'more-horizontal', color: '#94a3b8', isDefault: true } },
    { upsert: true, returnDocument: 'after' },
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
    await ensureSystemTemplates();
    const [own, system] = await Promise.all([
      Category.find({ userId: req.user._id }).sort({ name: 1 }),
      Category.find({ userId: null, isDefault: true }).sort({ name: 1 }),
    ]);
    // Students get personal copies of the defaults at sign-up; system
    // templates the admin adds later still show up, but never as a
    // duplicate of a name the student already has.
    const ownKeys = new Set(own.map((c) => `${c.type}:${c.name.toLowerCase()}`));
    const categories = [...own, ...system.filter((c) => !ownKeys.has(`${c.type}:${c.name.toLowerCase()}`))]
      .sort((a, b) => a.name.localeCompare(b.name));
    res.json({ data: categories.map(formatCategory) });
  } catch (err) {
    return serverError(res, err);
  }
});

const ICON_RE = /^[a-z0-9-]{1,40}$/;
const COLOR_RE = /^#[0-9a-f]{6}$/i;

/** Validates optional icon (slug) and color (#rrggbb) fields. */
function parseLook(body) {
  const value = {};
  if (body.icon !== undefined && body.icon !== null && body.icon !== '') {
    if (typeof body.icon !== 'string' || !ICON_RE.test(body.icon)) return { error: 'Unknown icon' };
    value.icon = body.icon;
  }
  if (body.color !== undefined && body.color !== null && body.color !== '') {
    if (typeof body.color !== 'string' || !COLOR_RE.test(body.color)) return { error: 'Colour must look like #1c8f53' };
    value.color = body.color;
  }
  return { value };
}

// POST /api/v1/categories
router.post('/', async (req, res) => {
  try {
    const { name, type } = req.body;
    if (typeof name !== 'string' || !name.trim() || !type) return res.status(400).json({ message: 'Name and type are required' });
    if (!CATEGORY_TYPES.includes(type)) return res.status(400).json({ message: "type must be 'income' or 'expense'" });
    if (name.trim().length > 40) return res.status(400).json({ message: 'Category names can be up to 40 characters' });
    const look = parseLook(req.body);
    if (look.error) return res.status(400).json({ message: look.error });

    const category = await Category.create({ name: name.trim(), type, ...look.value, userId: req.user._id, isDefault: false });
    res.status(201).json({ data: formatCategory(category) });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'A category with this name and type already exists' });
    return serverError(res, err);
  }
});

// PATCH /api/v1/categories/:id
router.patch('/:id', async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, userId: req.user._id });
    if (!category) return res.status(404).json({ message: 'Category not found' });

    if (req.body.name !== undefined) {
      if (typeof req.body.name !== 'string' || !req.body.name.trim()) return res.status(400).json({ message: 'Name cannot be empty' });
      if (req.body.name.trim().length > 40) return res.status(400).json({ message: 'Category names can be up to 40 characters' });
      category.name = req.body.name.trim();
    }
    const look = parseLook(req.body);
    if (look.error) return res.status(400).json({ message: look.error });
    Object.assign(category, look.value);
    await category.save();

    res.json({ data: formatCategory(category) });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'A category with this name and type already exists' });
    return serverError(res, err);
  }
});

// DELETE /api/v1/categories/:id — reassigns any transactions/budgets in this
// category to the type's fallback ("Miscellaneous"/"Other" / "Other Income") category, then
// deletes it. Returns how many transactions were moved so the client can
// tell the user what happened instead of them silently vanishing.
router.delete('/:id', async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, userId: req.user._id });
    if (!category) return res.status(404).json({ message: 'Category not found' });

    if (FALLBACK_NAMES[category.type].some((name) => name.toLowerCase() === category.name.trim().toLowerCase())) {
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
    return serverError(res, err);
  }
});

module.exports = router;
