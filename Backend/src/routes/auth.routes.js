const router = require('express').Router();
const { serverError } = require('../utils/httpErrors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Category = require('../models/Category');
const { protect } = require('../middleware/auth');
const { toTitleCaseName } = require('../utils/formatName');
const { isEmailConfigured, sendWelcomeEmail } = require('../services/email.service');
const Session = require('../models/Session');
const { startSession, refreshSession, revokeSession, revokeAllSessions } = require('../services/session.service');
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



// Welcome emails are awaited (serverless hosts stop work once the response
// is sent) but capped so a slow mail provider never delays sign-up much.
async function welcome(user) {
  try {
    await Promise.race([sendWelcomeEmail(user), new Promise((resolve) => setTimeout(resolve, 6000))]);
  } catch (err) {
    console.error('Welcome email failed:', err.message || err);
  }
}


// POST /api/v1/auth/register
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { fullName, email, password, school, academicYear, monthlyAllowanceBaseline, savingsGoalAmount } = req.body;

    if (typeof fullName !== 'string' || !fullName.trim() || fullName.trim().length > 100) return res.status(400).json({ message: 'Full name is required (up to 100 characters)', fieldErrors: { fullName: 'Required' } });
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 200) return res.status(400).json({ message: 'Enter a valid email address', fieldErrors: { email: 'Invalid email' } });
    if (typeof password !== 'string' || password.length < 8 || password.length > 200) return res.status(400).json({ message: 'Password must be at least 8 characters', fieldErrors: { password: 'At least 8 characters' } });
    for (const [key, value] of Object.entries({ school, academicYear })) {
      if (value !== undefined && value !== null && (typeof value !== 'string' || value.length > 100)) return res.status(400).json({ message: `${key} must be short text` });
    }
    for (const [key, value] of Object.entries({ monthlyAllowanceBaseline, savingsGoalAmount })) {
      if (value !== undefined && value !== null && !(typeof value === 'number' && value >= 0 && value <= 1e12)) return res.status(400).json({ message: `${key} must be a number from 0 upwards` });
    }

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
    await welcome(user);

    const { accessToken, refreshToken } = await startSession(user._id, req, 'register');
    res.status(201).json({ data: { user: user.toPublic(), accessToken, refreshToken } });
  } catch (err) {
    return serverError(res, err);
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
      await welcome(user);
      isNewUser = true;
    }

    if (!user.isActive) return res.status(403).json({ message: 'Your account has been suspended. Please contact the Campus Coin administrator.', code: 'ACCOUNT_SUSPENDED' });

    const { accessToken, refreshToken } = await startSession(user._id, req, 'google');
    res.status(isNewUser ? 201 : 200).json({ data: { user: user.toPublic(), accessToken, refreshToken } });
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/v1/auth/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) return res.status(400).json({ message: 'Email and password are required' });

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

    const { accessToken, refreshToken } = await startSession(user._id, req, 'password');
    res.json({ data: { user: user.toPublic(), accessToken, refreshToken } });
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/v1/auth/logout — ends this device's stored session so its
// tokens stop working immediately.
router.post('/logout', protect, async (req, res) => {
  try {
    if (req.sessionId) await revokeSession(req.user._id, req.sessionId);
    res.json({ data: null, message: 'Logged out' });
  } catch (err) {
    return serverError(res, err);
  }
});

// GET /api/v1/auth/sessions — the signed-in devices for this account.
router.get('/sessions', protect, async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user._id, revokedAt: null, expiresAt: { $gt: new Date() } })
      .sort({ lastUsedAt: -1 })
      .limit(30)
      .lean();
    res.json({
      data: sessions.map((s) => ({
        id: String(s._id),
        method: s.method,
        userAgent: s.userAgent || '',
        ip: s.ip || '',
        createdAt: s.createdAt,
        lastUsedAt: s.lastUsedAt,
        current: String(s._id) === String(req.sessionId),
      })),
    });
  } catch (err) {
    return serverError(res, err);
  }
});

// DELETE /api/v1/auth/sessions/:sessionId — sign one device out.
router.delete('/sessions/:sessionId', protect, async (req, res) => {
  try {
    if (!/^[a-f0-9]{24}$/i.test(req.params.sessionId)) return res.status(404).json({ message: 'Session not found' });
    const ok = await revokeSession(req.user._id, req.params.sessionId);
    if (!ok) return res.status(404).json({ message: 'Session not found' });
    res.json({ data: null, message: 'Device signed out' });
  } catch (err) {
    return serverError(res, err);
  }
});

// DELETE /api/v1/auth/sessions — sign out every other device.
router.delete('/sessions', protect, async (req, res) => {
  try {
    const count = await revokeAllSessions(req.user._id, req.sessionId);
    res.json({ data: { count }, message: `Signed out ${count} other device${count === 1 ? '' : 's'}` });
  } catch (err) {
    return serverError(res, err);
  }
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

    const tokens = await refreshSession(decoded, req);
    if (!tokens) return res.status(401).json({ message: 'This session was signed out. Please log in again.', code: 'SESSION_REVOKED' });
    res.json({ data: { user: user.toPublic(), accessToken: tokens.accessToken, refreshToken: tokens.refreshToken } });
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
    const normalizedEmail = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Enter a valid email address', code: 'INVALID_EMAIL' });
    }
    const user = await User.findOne({ email: normalizedEmail });
    // Say plainly when there's no account, so students don't wait for an
    // email that will never come (the limiter above stops bulk probing).
    if (!user) {
      return res.status(404).json({
        message: 'No Campus Coin account uses that email. Check the spelling or create an account.',
        code: 'ACCOUNT_NOT_FOUND',
      });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: 'This account has been suspended. Contact support from the Help page.', code: 'ACCOUNT_SUSPENDED' });
    }
    // In production, say so plainly when no email provider is set up —
    // otherwise students wait for a code that can never arrive.
    if (!isEmailConfigured() && process.env.NODE_ENV === 'production') {
      return res.status(503).json({
        message: 'Password reset emails are not set up on the server yet. Please contact the administrator.',
        code: 'EMAIL_NOT_CONFIGURED',
      });
    }

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

    res.json({ data: null, message: `We sent a 6-digit code to ${user.email}. It expires in 15 minutes.` });
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/v1/auth/reset-password
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (typeof email !== 'string' || typeof code !== 'string' || typeof newPassword !== 'string' || !email || !code || newPassword.length < 8 || newPassword.length > 200) {
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
    // Whoever knew the old password is signed out everywhere.
    await revokeAllSessions(user._id);

    res.json({ data: null, message: 'Password reset successful' });
  } catch (err) {
    return serverError(res, err);
  }
});

// PATCH /api/v1/auth/change-password — change password while logged in (requires
// the current password). Google-only accounts have no passwordHash yet, so
// they must go through this once to set one before they can use it again.
router.patch('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (currentPassword !== undefined && typeof currentPassword !== 'string') return res.status(400).json({ message: 'Current password is required' });
    if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 200) {
      return res.status(400).json({ message: 'A new password (min 8 chars) is required', fieldErrors: { newPassword: 'At least 8 characters' } });
    }

    const user = await User.findById(req.user._id);
    if (user.passwordHash) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required' });
      }
      const match = await user.matchPassword(currentPassword);
      // 400, not 401: a 401 would make the client think its session expired.
      if (!match) return res.status(400).json({ message: 'Current password is incorrect', code: 'INVALID_CREDENTIALS', fieldErrors: { currentPassword: 'Incorrect password' } });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();
    // Keep this device signed in; sign every other device out.
    await revokeAllSessions(user._id, req.sessionId);

    res.json({ data: null, message: 'Password changed successfully' });
  } catch (err) {
    return serverError(res, err);
  }
});

module.exports = router;
