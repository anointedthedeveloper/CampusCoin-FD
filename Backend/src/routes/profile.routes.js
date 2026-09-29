const router = require('express').Router();
const { serverError } = require('../utils/httpErrors');
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
// `aliases` are names an existing category may already have (the SRS
// defaults first); the first alias is used when a new one has to be made.
const SPENDING_CATEGORY_TO_CATEGORY = {
  food: { name: 'Food', aliases: ['Food', 'Food & Drinks'], icon: 'utensils', color: '#ef4444' },
  transportation: { name: 'Transport', aliases: ['Transport', 'Transportation'], icon: 'bus', color: '#3b82f6' },
  academics: { name: 'Academics', aliases: ['Academics', 'Education'], icon: 'book-open', color: '#6366f1' },
  'data-internet': { name: 'Data & Internet', aliases: ['Data & Internet', 'Data & Airtime', 'Subscriptions'], icon: 'wifi', color: '#06b6d4' },
  entertainment: { name: 'Entertainment', aliases: ['Entertainment'], icon: 'party-popper', color: '#ec4899' },
  shopping: { name: 'Shopping', aliases: ['Shopping'], icon: 'shopping-bag', color: '#f43f5e' },
  accommodation: { name: 'Hostel/Rent', aliases: ['Hostel/Rent', 'Housing', 'Rent'], icon: 'home', color: '#8b5cf6' },
  health: { name: 'Healthcare', aliases: ['Healthcare', 'Health'], icon: 'heart-pulse', color: '#ef4444' },
  personal: { name: 'Personal care', aliases: ['Personal care', 'Personal'], icon: 'sparkles', color: '#a855f7' },
  other: { name: 'Miscellaneous', aliases: ['Miscellaneous', 'Other'], icon: 'more-horizontal', color: '#94a3b8' },
};

const escapeRe = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The student's existing category for an onboarding choice, or a new one. */
async function resolveSpendingCategory(userId, value, otherSpendingCategory) {
  const mapped = value === 'other' && otherSpendingCategory
    ? { name: otherSpendingCategory.trim().slice(0, 40), aliases: [otherSpendingCategory.trim().slice(0, 40)], icon: 'tag', color: '#94a3b8' }
    : SPENDING_CATEGORY_TO_CATEGORY[value];
  if (!mapped || !mapped.name) return null;
  const existing = await Category.findOne({
    userId,
    type: 'expense',
    name: { $in: mapped.aliases.map((n) => new RegExp(`^${escapeRe(n)}$`, 'i')) },
  });
  if (existing) return existing;
  return Category.findOneAndUpdate(
    { userId, name: mapped.name, type: 'expense' },
    { $setOnInsert: { userId, name: mapped.name, type: 'expense', icon: mapped.icon, color: mapped.color, isDefault: false } },
    { upsert: true, new: true },
  );
}

async function ensureSpendingCategories(userId, spendingCategories, otherSpendingCategory) {
  for (const value of spendingCategories) {
    await resolveSpendingCategory(userId, value, otherSpendingCategory);
  }
}

// The "monthly spending budget" collected in onboarding used to be discarded
// after being typed in — never sent anywhere, so nothing on the dashboard
// ever reflected it. This turns it into real Budget documents for the
// current month, split evenly across whichever spending categories the user
// picked, so "Budget vs. Actual" on the dashboard is populated immediately
// instead of showing "No budgets set" right after finishing setup.
async function ensureMonthlyBudget(userId, monthlyBudget, spendingCategoryValues, otherSpendingCategory) {
  if (!monthlyBudget || monthlyBudget <= 0) return;
  const resolved = [];
  for (const value of spendingCategoryValues || []) {
    const category = await resolveSpendingCategory(userId, value, otherSpendingCategory);
    if (category && !resolved.some((c) => String(c._id) === String(category._id))) resolved.push(category);
  }
  const categories = resolved;
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
    return serverError(res, err);
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

    for (const key of ['fullName', 'school', 'academicYear', 'avatarUrl']) {
      if (updates[key] === undefined || updates[key] === null) continue;
      if (typeof updates[key] !== 'string' || updates[key].length > (key === 'avatarUrl' ? 500 : 100)) {
        return res.status(400).json({ message: `${key} must be text under ${key === 'avatarUrl' ? 500 : 100} characters` });
      }
    }
    if (updates.avatarUrl && !/^https:\/\//i.test(updates.avatarUrl)) {
      return res.status(400).json({ message: 'avatarUrl must be an https:// link' });
    }
    if (updates.fullName !== undefined) {
      if (typeof updates.fullName !== 'string' || !updates.fullName.trim()) return res.status(400).json({ message: 'Full name cannot be empty' });
      updates.fullName = toTitleCaseName(updates.fullName);
    }
    for (const key of ['monthlyAllowanceBaseline', 'savingsGoalAmount']) {
      if (updates[key] !== undefined && updates[key] !== null && !((typeof updates[key] === 'number' || (typeof updates[key] === 'string' && updates[key].trim() !== '')) && Number(updates[key]) >= 0 && Number(updates[key]) <= 1e12)) {
        return res.status(400).json({ message: `${key} must be a non-negative number` });
      }
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { returnDocument: 'after', runValidators: true });
    res.json({ data: user.toPublic() });
  } catch (err) {
    return serverError(res, err);
  }
});

// PATCH /api/v1/profile/onboarding — save progress through, complete, or skip the
// post-signup money-profile setup. Accepts a partial payload so each step can
// save just what it collected.
router.patch('/onboarding', async (req, res) => {
  try {
    const stepFields = ['currentStep', 'incomeSources', 'incomeFrequency', 'spendingCategories', 'goals'];
    const updates = {};

    for (const key of ['incomeSources', 'spendingCategories', 'goals']) {
      const list = req.body[key];
      if (list === undefined) continue;
      if (!Array.isArray(list) || list.length > 30 || list.some((v) => typeof v !== 'string' || v.length > 60)) {
        return res.status(400).json({ message: `${key} must be a list of short text values` });
      }
    }
    if (req.body.currentStep !== undefined && !(Number.isInteger(req.body.currentStep) && req.body.currentStep >= 1 && req.body.currentStep <= 6)) {
      return res.status(400).json({ message: 'currentStep must be a whole number from 1 to 6' });
    }
    if (req.body.incomeFrequency !== undefined && req.body.incomeFrequency !== null && req.body.incomeFrequency !== '' &&
        !['weekly', 'monthly', 'occasionally'].includes(req.body.incomeFrequency)) {
      return res.status(400).json({ message: "incomeFrequency must be 'weekly', 'monthly' or 'occasionally'" });
    }
    if (req.body.incomeFrequency === '' || req.body.incomeFrequency === null) delete req.body.incomeFrequency;
    for (const key of ['monthlyAllowanceBaseline', 'savingsGoalAmount', 'monthlyBudget']) {
      const v = req.body[key];
      if (v === undefined || v === null) continue;
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1e12) {
        return res.status(400).json({ message: `${key} must be a number from 0 upwards` });
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
    return serverError(res, err);
  }
});

// GET /api/v1/profile/settings
router.get('/settings', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ data: user.settings });
  } catch (err) {
    return serverError(res, err);
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
    return serverError(res, err);
  }
});

module.exports = router;
