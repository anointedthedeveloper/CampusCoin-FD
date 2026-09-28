const router = require('express').Router();
const User = require('../models/User');
const Category = require('../models/Category');
const Budget = require('../models/Budget');
const { protect } = require('../middleware/auth');
const { toTitleCaseName } = require('../utils/formatName');

// Maps an onboarding spending-category value (from the frontend's
// SPENDING_CATEGORY_OPTIONS) to a real expense Category so picking it during
// setup actually customizes the categories the user sees and can budget
// against — not just a preference stored on the user document. Matched by
// name against DEFAULT_CATEGORIES (auth.routes.js) where one already exists,
// so this never creates a duplicate of a category every account is seeded
// with at registration.
const SPENDING_CATEGORY_TO_CATEGORY = {
  food: { name: 'Food & Drinks', icon: 'utensils', color: '#f97316' },
  transportation: { name: 'Transport', icon: 'car', color: '#3b82f6' },
  academics: { name: 'Education', icon: 'book', color: '#0ea5e9' },
  'data-internet': { name: 'Data & Internet', icon: 'wifi', color: '#06b6d4' },
  entertainment: { name: 'Entertainment', icon: 'music', color: '#d946ef' },
  shopping: { name: 'Shopping', icon: 'shopping-bag', color: '#f43f5e' },
  accommodation: { name: 'Housing', icon: 'home', color: '#6366f1' },
  health: { name: 'Healthcare', icon: 'heart', color: '#ef4444' },
  personal: { name: 'Personal', icon: 'user', color: '#a855f7' },
  other: { name: 'Other', icon: 'more-horizontal', color: '#94a3b8' },
};

async function ensureSpendingCategories(userId, spendingCategories, otherSpendingCategory) {
  await Promise.all(
    spendingCategories.map((value) => {
      const mapped = value === 'other' && otherSpendingCategory
        ? { ...SPENDING_CATEGORY_TO_CATEGORY.other, name: otherSpendingCategory }
        : SPENDING_CATEGORY_TO_CATEGORY[value];
      if (!mapped) return null;
      return Category.findOneAndUpdate(
        { userId, name: mapped.name, type: 'expense' },
        { $setOnInsert: { userId, name: mapped.name, type: 'expense', icon: mapped.icon, color: mapped.color, isDefault: false } },
        { upsert: true },
      );
    }),
  );
}

// The "monthly spending budget" collected in onboarding used to be discarded
// after being typed in — never sent anywhere, so nothing on the dashboard
// ever reflected it. This turns it into real Budget documents for the
// current month, split evenly across whichever spending categories the user
// picked, so "Budget vs. Actual" on the dashboard is populated immediately
// instead of showing "No budgets set" right after finishing setup.
async function ensureMonthlyBudget(userId, monthlyBudget, spendingCategoryValues, otherSpendingCategory) {
  if (!monthlyBudget || monthlyBudget <= 0) return;
  const names = (spendingCategoryValues || [])
    .map((value) => value === 'other' && otherSpendingCategory
      ? otherSpendingCategory
      : SPENDING_CATEGORY_TO_CATEGORY[value]?.name)
    .filter(Boolean);
  if (names.length === 0) return;

  const categories = await Category.find({ userId, type: 'expense', name: { $in: names } });
  if (categories.length === 0) return;

  const month = new Date().toISOString().slice(0, 7);
  const perCategoryLimit = Math.round((monthlyBudget / categories.length) * 100) / 100;

  await Promise.all(
    categories.map((category) =>
      Budget.findOneAndUpdate(
        { userId, categoryId: category._id, month },
        { $set: { limitAmount: perCategoryLimit } },
        { upsert: true },
      ),
    ),
  );
}

// All profile routes require auth
router.use(protect);

// GET /api/v1/profile
router.get('/', async (req, res) => {
  try {
    res.json({ data: req.user.toPublic() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/v1/profile
router.patch('/', async (req, res) => {
  try {
    const allowed = ['fullName', 'school', 'academicYear', 'monthlyAllowanceBaseline', 'savingsGoalAmount', 'avatarUrl'];
    const updates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    if (updates.fullName !== undefined) {
      if (!updates.fullName?.trim()) return res.status(400).json({ message: 'Full name cannot be empty' });
      updates.fullName = toTitleCaseName(updates.fullName);
    }
    for (const key of ['monthlyAllowanceBaseline', 'savingsGoalAmount']) {
      if (updates[key] !== undefined && updates[key] !== null && !(Number(updates[key]) >= 0)) {
        return res.status(400).json({ message: `${key} must be a non-negative number` });
      }
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { returnDocument: 'after', runValidators: true });
    res.json({ data: user.toPublic() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/v1/profile/onboarding — save progress through, complete, or skip the
// post-signup money-profile setup. Accepts a partial payload so each step can
// save just what it collected.
router.patch('/onboarding', async (req, res) => {
  try {
    const stepFields = ['currentStep', 'incomeSources', 'incomeFrequency', 'spendingCategories', 'goals'];
    const updates = {};

    for (const key of ['incomeSources', 'spendingCategories']) {
      if (req.body[key] !== undefined && !Array.isArray(req.body[key])) {
        return res.status(400).json({ message: `${key} must be an array` });
      }
    }

    for (const key of ['otherIncomeSource', 'otherSpendingCategory']) {
      if (req.body[key] === undefined) continue;
      if (typeof req.body[key] !== 'string' || req.body[key].trim().length > 60) {
        return res.status(400).json({ message: `${key} must be 60 characters or fewer` });
      }
      updates[`onboarding.${key}`] = req.body[key].trim();
    }

    stepFields.forEach((key) => {
      if (req.body[key] !== undefined) updates[`onboarding.${key}`] = req.body[key];
    });

    const incomeSources = req.body.incomeSources ?? req.user.onboarding?.incomeSources ?? [];
    const spendingCategories = req.body.spendingCategories ?? req.user.onboarding?.spendingCategories ?? [];
    const otherIncomeSource = req.body.otherIncomeSource ?? req.user.onboarding?.otherIncomeSource ?? '';
    const otherSpendingCategory = req.body.otherSpendingCategory ?? req.user.onboarding?.otherSpendingCategory ?? '';

    if ((req.body.incomeSources !== undefined || req.body.otherIncomeSource !== undefined) &&
        incomeSources.includes('other') && !otherIncomeSource.trim()) {
      return res.status(400).json({ message: 'Please name your other income source' });
    }
    if ((req.body.spendingCategories !== undefined || req.body.otherSpendingCategory !== undefined) &&
        spendingCategories.includes('other') && !otherSpendingCategory.trim()) {
      return res.status(400).json({ message: 'Please name your other spending category' });
    }

    if (req.body.status !== undefined) {
      const allowedStatuses = ['not_started', 'in_progress', 'completed', 'skipped'];
      if (!allowedStatuses.includes(req.body.status)) {
        return res.status(400).json({ message: 'Invalid onboarding status' });
      }
      updates['onboarding.status'] = req.body.status;
      if (req.body.status === 'completed' || req.body.status === 'skipped') {
        updates['onboarding.completedAt'] = new Date();
      }
    }

    // Income amount and savings target reuse the existing profile fields so
    // the rest of the app (dashboard savings-goal card, budgets) picks them
    // up automatically — no separate onboarding-only copy of this data.
    if (req.body.monthlyAllowanceBaseline !== undefined) updates.monthlyAllowanceBaseline = req.body.monthlyAllowanceBaseline;
    if (req.body.savingsGoalAmount !== undefined) updates.savingsGoalAmount = req.body.savingsGoalAmount;
    if (req.body.currency !== undefined) {
      const currency = String(req.body.currency).trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(currency)) {
        return res.status(400).json({ message: 'Currency must be a 3-letter code' });
      }
      updates['settings.currency'] = currency;
    }

    if (req.body.spendingCategories !== undefined) {
      await ensureSpendingCategories(req.user._id, req.body.spendingCategories, otherSpendingCategory);
    }

    if (req.body.monthlyBudget !== undefined) {
      await ensureMonthlyBudget(req.user._id, Number(req.body.monthlyBudget), spendingCategories, otherSpendingCategory);
    }

    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { returnDocument: 'after' });
    res.json({ data: user.toPublic() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/v1/profile/settings
router.get('/settings', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ data: user.settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/v1/profile/settings
router.patch('/settings', async (req, res) => {
  try {
    const allowed = [
      'currency', 'monthlyIncomeGoal', 'budgetAlertThreshold',
      'emailNotifications', 'pushNotifications',
      'aiCategorizationEnabled', 'aiInsightsEnabled',
    ];
    const updates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[`settings.${key}`] = req.body[key];
    });

    if (updates['settings.currency'] !== undefined) {
      const currency = String(updates['settings.currency']).trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(currency)) {
        return res.status(400).json({ message: 'Currency must be a 3-letter code' });
      }
      updates['settings.currency'] = currency;
    }

    for (const key of ['monthlyIncomeGoal', 'budgetAlertThreshold']) {
      const value = updates[`settings.${key}`];
      if (value === undefined) continue;
      if (key === 'monthlyIncomeGoal' && value === null) continue;
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (key === 'budgetAlertThreshold' && (value < 1 || value > 100))) {
        return res.status(400).json({
          message: key === 'budgetAlertThreshold'
            ? 'Budget alert threshold must be between 1 and 100'
            : 'Monthly income goal must be a non-negative number',
        });
      }
    }

    for (const key of ['emailNotifications', 'pushNotifications', 'aiCategorizationEnabled', 'aiInsightsEnabled']) {
      const value = updates[`settings.${key}`];
      if (value !== undefined && typeof value !== 'boolean') {
        return res.status(400).json({ message: `${key} must be a boolean` });
      }
    }

    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { returnDocument: 'after' });
    res.json({ data: user.settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
