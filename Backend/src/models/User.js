const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const settingsSchema = new mongoose.Schema(
  {
    currency: { type: String, default: 'NGN' },
    monthlyIncomeGoal: { type: Number, default: null },
    budgetAlertThreshold: { type: Number, default: 80 },
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    aiCategorizationEnabled: { type: Boolean, default: false },
    aiInsightsEnabled: { type: Boolean, default: false },
  },
  { _id: false },
);

// Tracks progress through the post-signup "money profile" setup so it can be
// resumed after a refresh and never has to be forced on a user twice.
// Income amount and savings target reuse the existing monthlyAllowanceBaseline
// / savingsGoalAmount fields on the user rather than duplicating them here.
const onboardingSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'skipped'],
      default: 'not_started',
    },
    currentStep: { type: Number, default: 1, min: 1, max: 6 },
    incomeSources: [{ type: String, trim: true }],
    otherIncomeSource: { type: String, trim: true, maxlength: 60 },
    incomeFrequency: { type: String, enum: ['weekly', 'monthly', 'occasionally'] },
    spendingCategories: [{ type: String, trim: true }],
    otherSpendingCategory: { type: String, trim: true, maxlength: 60 },
    goals: [{ type: String, trim: true }],
    completedAt: { type: Date },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Absent for accounts created via Google sign-in that have never set a
    // password (see matchPassword below and auth.routes.js's /google route).
    passwordHash: { type: String },
    // Google's stable per-account subject id ("sub" claim). Sparse so
    // password-only accounts (no Google link) don't collide on null.
    googleId: { type: String, unique: true, sparse: true },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    school: { type: String, trim: true },
    academicYear: { type: String, trim: true },
    monthlyAllowanceBaseline: { type: Number },
    savingsGoalAmount: { type: Number },
    avatarUrl: { type: String },
    isActive: { type: Boolean, default: true },
    settings: { type: settingsSchema, default: () => ({}) },
    onboarding: { type: onboardingSchema, default: () => ({}) },
    // Used for the password-reset flow. resetPasswordToken stores a SHA-256
    // hash of the 6-digit code emailed to the user, never the code itself.
    // resetPasswordAttempts counts wrong guesses so a code can be locked out
    // well before someone could brute-force all 900,000 possibilities.
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    resetPasswordAttempts: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Compare plain password against stored hash. Google-only accounts have no
// passwordHash, so they simply never match a password login.
userSchema.methods.matchPassword = async function (plain) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plain, this.passwordHash);
};

// Convert to public-facing shape (strip sensitive fields)
userSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    fullName: this.fullName,
    email: this.email,
    role: this.role,
    school: this.school,
    academicYear: this.academicYear,
    monthlyAllowanceBaseline: this.monthlyAllowanceBaseline,
    savingsGoalAmount: this.savingsGoalAmount,
    avatarUrl: this.avatarUrl,
    isActive: this.isActive,
    // Google-only accounts are asked to choose a password after signing up.
    hasPassword: Boolean(this.passwordHash),
    hasGoogle: Boolean(this.googleId),
    settings: this.settings,
    onboarding: this.onboarding,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('User', userSchema);
