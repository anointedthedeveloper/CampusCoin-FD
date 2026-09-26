const mongoose = require('mongoose');

// Used with router.param('id', validateIdParam) so a malformed :id (wrong
// length/characters) is rejected with 400 before it ever reaches a query —
// without this, Mongoose throws a CastError that route handlers' generic
// catch blocks turn into a misleading 500.
function validateIdParam(req, res, next, id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid id' });
  }
  next();
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

module.exports = { validateIdParam, isValidObjectId };
