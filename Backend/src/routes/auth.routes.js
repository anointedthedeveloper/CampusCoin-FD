const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Category = require('../models/Category');
const { protect } = require('../middleware/auth');
const { toTitleCaseName } = require('../utils/formatName');
const { isEmailConfigured } = require('../services/email.service');
const { issuePasswordReset } = require('../services/passwordReset.service');
const { authLimiter, forgotPasswordLimiter } = require('../middleware/rateLimit');
const { seedDefaultCategories } = require('../services/defaultCategories.service');

// Reset tokens are emailed to the user in raw form but only ever stored as a
// SHA-256 hash, so a database read (backup leak, injection, etc.) can't be
// used to reset an account's password.
function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;



function signTokens(userId) {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: userId, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
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
      // An existing email/password account with the same email: never link
      // silently. The client asks the student first and resends the same
      // token with linkAccount: true. Linking is only allowed when Google has
      // verified the address, which proves the caller owns that inbox.
      const existing = await User.findOne({ email });
      if (existing) {
        if (existing.googleId) {
          return res.status(409).json({
            message: 'This email is already linked to a different Google account.',
            code: 'GOOGLE_ACCOUNT_MISMATCH',
          });
        }
        if (req.body.linkAccount !== true) {
          return res.status(409).json({
            message: `We found an existing Campus Coin account for ${email}. Link your Google account to it so you can sign in either way?`,
            code: 'ACCOUNT_LINK_REQUIRED',
          });
        }
        if (payload.email_verified === false) {
          return res.status(403).json({ message: 'Google has not verified this email address, so it cannot be linked.', code: 'EMAIL_NOT_VERIFIED' });
        }
        existing.googleId = payload.sub;
        if (!existing.avatarUrl && payload.picture) existing.avatarUrl = payload.picture;
        await existing.save();
        user = existing;
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

    if (!user.isActive) return res.status(403).json({ message: 'Your account has been suspended. Please contact the Campus Coin administrator.', code: 'ACCOUNT_SUSPENDED' });

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

    if (!user.isActive) return res.status(403).json({ message: 'Your account has been suspended. Please contact the Campus Coin administrator.', code: 'ACCOUNT_SUSPENDED' });

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

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired refresh token', code: 'INVALID_TOKEN' });
    }
    if (decoded.type !== 'refresh') return res.status(401).json({ message: 'Invalid token type' });

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) return res.status(401).json({ message: 'User not found or suspended' });

    const tokens = signTokens(user._id);
    res.json({ data: { user: user.toPublic(), ...tokens } });
  } catch (err) {
    // Database/server failure — not a token problem, so don't tell the
    // client its session is invalid (it would log the user out).
    console.error('Token refresh failed:', err.message);
    res.status(503).json({ message: 'Service temporarily unavailable. Please try again.', code: 'SERVICE_UNAVAILABLE' });
  }
});

const RESET_CODE_MAX_ATTEMPTS = 5;

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ message: 'Email is required' });
    }
    // In production, say so plainly when no email provider is set up —
    // otherwise students wait for a code that can never arrive.
    if (!isEmailConfigured() && process.env.NODE_ENV === 'production') {
      return res.status(503).json({
        message: 'Password reset emails are not set up on the server yet. Please contact the administrator.',
        code: 'EMAIL_NOT_CONFIGURED',
      });
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    // Always return 200 to prevent email enumeration
    if (!user) return res.json({ data: null, message: 'If that email exists, a reset code was sent.' });

    try {
      await issuePasswordReset(user);
    } catch (emailErr) {
      // Tell the student the email didn't go out rather than leaving them
      // waiting for a code that never arrives; a retry issues a fresh code.
      console.error('Failed to send password reset email:', emailErr);
      return res.status(502).json({
        message: 'We could not send the reset email right now. Please try again in a few minutes.',
        code: 'EMAIL_SEND_FAILED',
      });
    }

    res.json({ data: null, message: 'If that email exists, a reset code was sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/v1/auth/reset-password
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'Email, code and a new password (min 8 chars) are required' });
    }

    const invalidCode = () => res.status(400).json({ message: 'Code is invalid or has expired', code: 'INVALID_CODE' });

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) return invalidCode();

    if (user.resetPasswordAttempts >= RESET_CODE_MAX_ATTEMPTS) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      user.resetPasswordAttempts = 0;
      await user.save();
      return res.status(400).json({ message: 'Too many incorrect attempts. Request a new code.', code: 'TOO_MANY_ATTEMPTS' });
    }

    if (hashToken(code) !== user.resetPasswordToken) {
      user.resetPasswordAttempts += 1;
      await user.save();
      return invalidCode();
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.resetPasswordAttempts = 0;
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
