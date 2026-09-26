const rateLimit = require('express-rate-limit');

// The automated test suite exercises register/login/reset-password far more
// times per run than any real user would in 15 minutes, all from the same
// IP; without this they'd trip the limiter and fail on unrelated
// assertions. Rate limiting itself is covered separately, with this skip
// turned off, in tests/rateLimit.test.js.
const skipInTests = () => process.env.NODE_ENV === 'test';

// Applied to login/register/google sign-in — generous enough for a genuine
// user who mistypes a password a few times, tight enough to slow down
// credential-stuffing / account-enumeration attempts.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { message: 'Too many attempts. Please try again in a few minutes.' },
});

// Forgot-password is more sensitive (each hit sends an email / burns a
// reset token), so it gets a stricter budget.
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { message: 'Too many password reset requests. Please try again later.' },
});

module.exports = { authLimiter, forgotPasswordLimiter };
