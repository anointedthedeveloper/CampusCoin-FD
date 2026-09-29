const mongoose = require('mongoose');

// Used with router.param('id', validateIdParam) so a malformed :id (wrong
// length/characters) is rejected with 400 before it ever reaches a query —
// without this, Mongoose throws a CastError that route handlers' generic
// catch blocks turn into a misleading 500.
// Strict: exactly 24 hex characters. (Mongoose's isValid also accepts any
// 12-character string, which then fails deeper in the query.)
const ID_RE = /^[a-f0-9]{24}$/i;

function validateIdParam(req, res, next, id) {
  if (typeof id !== 'string' || !ID_RE.test(id)) {
    return res.status(400).json({ message: 'Invalid id' });
  }
  next();
}

function isValidObjectId(id) {
  return (typeof id === 'string' && ID_RE.test(id)) || id instanceof mongoose.Types.ObjectId;
}

module.exports = { validateIdParam, isValidObjectId };
