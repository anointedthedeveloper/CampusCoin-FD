/**
 * Responds to an unexpected error in a route. Bad input that slipped past
 * a route's own checks (a Mongoose ValidationError / CastError) is the
 * caller's mistake, so it gets a 400 instead of a misleading 500.
 */
function serverError(res, err) {
  if (err && (err.name === 'ValidationError' || err.name === 'CastError')) {
    return res.status(400).json({ message: 'Some of the values sent are invalid. Please check them and try again.' });
  }
  console.error(err);
  return res.status(500).json({ message: 'Server error' });
}

module.exports = { serverError };
