const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendError } = require('../utils/responseHandler');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return sendError(res, 'Not authorized, no token', 401);
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return sendError(res, 'User not found', 401);
    }
    next();
  } catch (error) {
    return sendError(res, 'Not authorized, token failed', 401);
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return sendError(res, `Role ${req.user.role} is not allowed to access this resource`, 403);
    }
    next();
  };
};

module.exports = { protect, authorize };