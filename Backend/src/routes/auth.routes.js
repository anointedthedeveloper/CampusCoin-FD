const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Category = require('../models/Category');
const { protect } = require('../middleware/auth');
const { toTitleCaseName } = require('../utils/formatName');
const { sendPasswordResetEmail } = require('../services/email.service');
const { authLimiter, forgotPasswordLimiter } = require('../middleware/rateLimit');

// Reset tokens are emailed to the user in raw form but only ever stored as a
// SHA-256 hash, so a database read (backup leak, injection, etc.) can't be
// used to reset an account's password.
function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

const DEFAULT_CATEGORIES = [
  { name: 'Salary', type: 'income', icon: 'briefcase', color: '#22c55e' },
  { name: 'Allowance', type: 'income', icon: 'wallet', color: '#10b981' },
  { name: 'Freelance', type: 'income', icon: 'laptop', color: '#06b6d4' },
  { name: 'Gift', type: 'income', icon: 'gift', color: '#8b5cf6' },
  { name: 'Other Income', type: 'income', icon: 'more-horizontal', color: '#94a3b8' },
  { name: 'Food & Drinks', type: 'expense', icon: 'utensils', color: '#f97316' },
  { name: 'Transport', type: 'expense', icon: 'car', color: '#3b82f6' },
  { name: 'Housing', type: 'expense', icon: 'home', color: '#6366f1' },
  { name: 'Utilities', type: 'expense', icon: 'zap', color: '#eab308' },
  { name: 'Healthcare', type: 'expense', icon: 'heart', color: '#ef4444' },
  { name: 'Education', type: 'expense', icon: 'book', color: '#0ea5e9' },
  { name: 'Entertainment', type: 'expense', icon: 'music', color: '#d946ef' },
  { name: 'Shopping', type: 'expense', icon: 'shopping-bag', color: '#f43f5e' },
  { name: 'Savings', type: 'expense', icon: 'piggy-bank', color: '#14b8a6' },
  { name: 'Other', type: 'expense', icon: 'more-horizontal', color: '#94a3b8' },
];

function signTokens(userId) {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: userId, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

async function seedDefaultCategories(userId) {
  await Category.insertMany(DEFAULT_CATEGORIES.map((c) => ({ ...c, userId, isDefault: true })));
}

// POST /api/v1/auth/register
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { fullName, email, password, school, academicYear, monthlyAllowanceBaseline, savingsGoalAmount } = req.body;

    if (!fullName?.trim()) return res.status(400).json({ message: 'Full name is required', fieldErrors: { fullName: 'Required' } });
    if (!email?.trim()) return res.status(400).json({ message: 'Email is required', fieldErrors: { email: 'Required' } });
    if (!password || password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters', fieldErrors: { password: 'At least 8 characters' } });

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(409).json({ message: 'An account with this email already exists. Log in instead.', code: 'EMAIL_TAKEN' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      fullName: toTitleCaseName(fullName),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: 'student',
      school,
      academicYear,
      monthlyAllowanceBaseline,
      savingsGoalAmount,
    });

    // Seed default categories for the new user
    await seedDefaultCategories(user._id);

    const { accessToken, refreshToken } = signTokens(user._id);
    res.status(201).json({ data: { user: user.toPublic(), accessToken, refreshToken } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/v1/auth/google/config — public. Lets the frontend fetch the
// Google OAuth client ID from a single source of truth (this server's env)
// instead of needing its own copy of the same value baked into its build.
// A client ID is not a secret (it's embedded in every Google sign-in button
// on the web), so serving it unauthenticated is safe.
router.get('/google/config', (_req, res) => {
  res.json({ data: { clientId: process.env.GOOGLE_CLIENT_ID || null } });
});

// POST /api/v1/auth/google — sign in (or sign up) with a Google ID token
// obtained client-side via Google Identity Services. Verifying the token
// server-side (rather than trusting a client-supplied email) is what makes
// this safe to use for login.
router.post('/google', authLimiter, async (req, res) => {
  try {
    if (!googleClient) {
      return res.status(503).json({ message: 'Google sign-in is not configured on this server.', code: 'GOOGLE_NOT_CONFIGURED' });
    }

    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: 'idToken is required' });

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ message: 'Invalid or expired Google sign-in. Please try again.', code: 'INVALID_GOOGLE_TOKEN' });
    }

    if (!payload?.email) {
      return res.status(400).json({ message: 'Google did not share an email address for this account.' });
    }
    const email = payload.email.toLowerCase().trim();

    let user = await User.findOne({ googleId: payload.sub });
    let isNewUser = false;

    if (!user) {
      // Link to an existing password account with the same email, if any.
      user = await User.findOne({ email });
      if (user) {
        user.googleId = payload.sub;
        if (!user.avatarUrl && payload.picture) user.avatarUrl = payload.picture;
        await user.save();
      }
    }

    if (!user) {
      user = await User.create({
        fullName: toTitleCaseName(payload.name || email.split('@')[0].replace(/[._]/g, ' ')),
        email,
        googleId: payload.sub,
        avatarUrl: payload.picture,
        role: 'student',
      });
      await seedDefaultCategories(user._id);
      isNewUser = true;
    }

    if (!user.isActive) return res.status(403).json({ message: 'Account suspended', code: 'ACCOUNT_SUSPENDED' });

    const { accessToken, refreshToken } = signTokens(user._id);
    res.status(isNewUser ? 201 : 200).json({ data: { user: user.toPublic(), accessToken, refreshToken } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/v1/auth/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    // Same status/message whether the email doesn't exist or the password is
    // wrong — distinguishing the two would let a caller enumerate registered
    // emails.
    const invalidCredentials = () =>
      res.status(401).json({ message: 'Your email or password is incorrect.', code: 'INVALID_CREDENTIALS' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return invalidCredentials();

    const match = await user.matchPassword(password);
    if (!match) return invalidCredentials();

    if (!user.isActive) return res.status(403).json({ message: 'Account suspended', code: 'ACCOUNT_SUSPENDED' });

    const { accessToken, refreshToken } = signTokens(user._id);
    res.json({ data: { user: user.toPublic(), accessToken, refreshToken } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/v1/auth/logout  (client-side token drop; server-side is a no-op for stateless JWT)
router.post('/logout', protect, (_req, res) => {
  res.json({ data: null, message: 'Logged out' });
});

// POST /api/v1/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    if (decoded.type !== 'refresh') return res.status(401).json({ message: 'Invalid token type' });

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) return res.status(401).json({ message: 'User not found or suspended' });

    const tokens = signTokens(user._id);
    res.json({ data: { user: user.toPublic(), ...tokens } });
  } catch {
    res.status(401).json({ message: 'Invalid or expired refresh token', code: 'INVALID_TOKEN' });
  }
});

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase().trim() });
    // Always return 200 to prevent email enumeration
    if (!user) return res.json({ data: null, message: 'If that email exists, a reset link was sent.' });

    const rawToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = hashToken(rawToken);
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${rawToken}`;
    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (emailErr) {
      // Don't leak email-provider failures to the client — the token is
      // already saved, and re-requesting will issue a fresh one.
      console.error('Failed to send password reset email:', emailErr);
    }

    res.json({ data: null, message: 'If that email exists, a reset link was sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/v1/auth/reset-password
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'Token and a new password (min 8 chars) are required' });
    }

    const user = await User.findOne({
      resetPasswordToken: hashToken(token),
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ message: 'Token is invalid or has expired', code: 'INVALID_TOKEN' });

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ data: null, message: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/v1/auth/change-password — change password while logged in (requires
// the current password). Google-only accounts have no passwordHash yet, so
// they must go through this once to set one before they can use it again.
router.patch('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'A new password (min 8 chars) is required', fieldErrors: { newPassword: 'At least 8 characters' } });
    }

    const user = await User.findById(req.user._id);
    if (user.passwordHash) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required' });
      }
      const match = await user.matchPassword(currentPassword);
      if (!match) return res.status(401).json({ message: 'Current password is incorrect', code: 'INVALID_CREDENTIALS' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({ data: null, message: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
