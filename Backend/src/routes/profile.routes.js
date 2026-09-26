const router = require('express').Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

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

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
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

    stepFields.forEach((key) => {
      if (req.body[key] !== undefined) updates[`onboarding.${key}`] = req.body[key];
    });

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

    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true });
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

    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true });
    res.json({ data: user.settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
