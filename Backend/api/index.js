// Vercel serverless entry point. vercel.json rewrites every request to /api,
// which lands here and is handled by the Express app from server.js.

module.exports = require('../server');