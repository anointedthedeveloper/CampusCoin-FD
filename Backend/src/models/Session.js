const mongoose = require('mongoose');

// One signed-in device/browser. Access and refresh tokens carry the session
// id ("sid"), so signing out, resetting a password or an admin suspension
// can revoke a session immediately instead of waiting for tokens to expire.
const sessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    method: { type: String, enum: ['password', 'google', 'register', 'refresh'], default: 'password' },
    userAgent: { type: String, maxlength: 400 },
    ip: { type: String, maxlength: 80 },
    lastUsedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Expired sessions are removed automatically by MongoDB.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Session', sessionSchema);
