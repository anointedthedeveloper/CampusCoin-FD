const crypto = require('crypto');
const { sendPasswordResetCode } = require('./email.service');

const RESET_CODE_TTL_MS = 15 * 60 * 1000;

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Issues a fresh 6-digit reset code for the user (stored only as a hash)
 * and emails it with a one-click link. Throws if the email can't be sent.
 */
async function issuePasswordReset(user) {
  // randomInt's upper bound is exclusive: always exactly 6 digits.
  const code = String(crypto.randomInt(100000, 1000000));
  user.resetPasswordToken = hashToken(code);
  user.resetPasswordExpires = new Date(Date.now() + RESET_CODE_TTL_MS);
  user.resetPasswordAttempts = 0;
  await user.save();
  return sendPasswordResetCode(user.email, code);
}

module.exports = { issuePasswordReset, hashToken, RESET_CODE_TTL_MS };
