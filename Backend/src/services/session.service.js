const jwt = require('jsonwebtoken');
const Session = require('../models/Session');

const ACCESS_TTL = '15m';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function clientInfo(req) {
  return {
    userAgent: String(req?.headers?.['user-agent'] || '').slice(0, 400),
    ip: String(req?.ip || '').slice(0, 80),
  };
}

function signPair(userId, sessionId) {
  const accessToken = jwt.sign({ id: String(userId), sid: String(sessionId) }, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL });
  const refreshToken = jwt.sign(
    { id: String(userId), sid: String(sessionId), type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: Math.floor(REFRESH_TTL_MS / 1000) },
  );
  return { accessToken, refreshToken };
}

/** Starts a new stored session for a sign-in and returns its token pair. */
async function startSession(userId, req, method = 'password') {
  const session = await Session.create({
    userId,
    method,
    ...clientInfo(req),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });
  return { ...signPair(userId, session._id), sessionId: String(session._id) };
}

/**
 * Exchanges a verified refresh token for a new pair on the same session and
 * slides its expiry forward. Tokens minted before sessions existed (no sid)
 * are upgraded to a stored session. Returns null when the session is gone
 * or revoked.
 */
async function refreshSession(decoded, req) {
  if (!decoded.sid) return startSession(decoded.id, req, 'refresh');
  const session = await Session.findOneAndUpdate(
    { _id: decoded.sid, userId: decoded.id, revokedAt: null },
    { $set: { lastUsedAt: new Date(), expiresAt: new Date(Date.now() + REFRESH_TTL_MS), ...clientInfo(req) } },
    { new: true },
  );
  if (!session) return null;
  return { ...signPair(decoded.id, session._id), sessionId: String(session._id) };
}

async function revokeSession(userId, sessionId) {
  const result = await Session.updateOne({ _id: sessionId, userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
  return result.modifiedCount > 0;
}

/** Signs a user out everywhere (optionally keeping the current session). */
async function revokeAllSessions(userId, exceptSessionId) {
  const filter = { userId, revokedAt: null };
  if (exceptSessionId) filter._id = { $ne: exceptSessionId };
  const result = await Session.updateMany(filter, { $set: { revokedAt: new Date() } });
  return result.modifiedCount;
}

/**
 * Checks the session an access token belongs to. Tokens without a sid
 * (issued before sessions were stored) stay valid until they expire.
 */
async function isSessionActive(decoded) {
  if (!decoded.sid) return true;
  const session = await Session.findOne({ _id: decoded.sid, userId: decoded.id }).select('revokedAt lastUsedAt').lean();
  if (!session || session.revokedAt) return false;
  // Keep "last active" roughly current without a write on every request.
  if (Date.now() - new Date(session.lastUsedAt).getTime() > 5 * 60 * 1000) {
    await Session.updateOne({ _id: decoded.sid }, { $set: { lastUsedAt: new Date() } }).catch(() => {});
  }
  return true;
}

module.exports = { startSession, refreshSession, revokeSession, revokeAllSessions, isSessionActive, REFRESH_TTL_MS };
