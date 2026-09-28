const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function protect(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authenticated', code: 'NO_TOKEN' });
  }

  const token = header.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token', code: 'INVALID_TOKEN' });
  }
  // A refresh token must never be accepted as an access token.
  if (!decoded?.id || decoded.type === 'refresh') {
    return res.status(401).json({ message: 'Invalid or expired token', code: 'INVALID_TOKEN' });
  }

  // Kept separate from jwt.verify: a database error here is a server problem,
  // not a bad token. Reporting it as 401 made the client think the session
  // had died and log the user out on any transient DB hiccup.
  let user;
  try {
    user = await User.findById(decoded.id).select('-passwordHash -resetPasswordToken -resetPasswordExpires');
  } catch (err) {
    console.error('Auth user lookup failed:', err.message);
    return res.status(503).json({ message: 'Service temporarily unavailable. Please try again.', code: 'SERVICE_UNAVAILABLE' });
  }
  if (!user) {
    return res.status(401).json({ message: 'User no longer exists', code: 'USER_NOT_FOUND' });
  }
  if (!user.isActive) {
    return res.status(403).json({ message: 'Account suspended', code: 'ACCOUNT_SUSPENDED' });
  }
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required', code: 'FORBIDDEN' });
  }
  next();
}

module.exports = { protect, requireAdmin };
