const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const { connectDB, disconnectDB } = require('./src/config/db');

// Route modules
const authRoutes = require('./src/routes/auth.routes');
const profileRoutes = require('./src/routes/profile.routes');
const categoriesRoutes = require('./src/routes/categories.routes');
const transactionsRoutes = require('./src/routes/transactions.routes');
const budgetsRoutes = require('./src/routes/budgets.routes');
const reportsRoutes = require('./src/routes/reports.routes');
const insightsRoutes = require('./src/routes/insights.routes');
const notificationsRoutes = require('./src/routes/notifications.routes');
const adminRoutes = require('./src/routes/admin.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const aiRoutes = require('./src/routes/ai.routes');

if (!process.env.JWT_SECRET) {
  // Every access/refresh token and the auth middleware depend on this. Rather
  // than silently signing tokens with `undefined` (jsonwebtoken throws on
  // every login/register call, which just looks like the server is broken),
  // fail loudly at startup so misconfiguration is obvious immediately.
  console.error('FATAL: JWT_SECRET is not set. Set it in the environment before starting the server.');
  if (process.env.NODE_ENV === 'production') process.exit(1);
}

const app = express();

// Trust Vercel's / any reverse proxy's X-Forwarded-For so req.ip (used by the
// rate limiter) reflects the real client instead of the proxy.
app.set('trust proxy', 1);

// ── Middleware ────────────────────────────────────────────────────────
// crossOriginResourcePolicy is relaxed to "cross-origin" because this API is
// deliberately called from a different origin (the frontend); helmet's
// "same-origin" default would have the browser block those responses
// regardless of the CORS headers below.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CLIENT_URL may be a single origin or a comma-separated list (e.g. local dev
// + the deployed frontend), so both can call the API without relaxing CORS
// to "*".
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (no Origin header, e.g. curl/health checks)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────
app.get('/', (_req, res) => res.json({ message: 'CampusCoin API is running' }));

app.use(async (_req, res, next) => {
  if (await connectDB()) return next();
  return res.status(503).json({ message: 'Database is unavailable. Please try again shortly.' });
});

// ── Routes ────────────────────────────────────────────────────────────
const API = '/api/v1';
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/profile`, profileRoutes);
app.use(`${API}/categories`, categoriesRoutes);
app.use(`${API}/transactions`, transactionsRoutes);
app.use(`${API}/budgets`, budgetsRoutes);
app.use(`${API}/reports`, reportsRoutes);
// insights.routes handles /insights, /saving-tips, /bookmarks
app.use(`${API}`, insightsRoutes);
app.use(`${API}/notifications`, notificationsRoutes);
app.use(`${API}/admin`, adminRoutes);
app.use(`${API}/dashboard`, dashboardRoutes);
app.use(`${API}/ai`, aiRoutes);

// ── 404 fallback ──────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));

// ── Centralized error handler ────────────────────────────────────────
// Catches anything that slips past individual routes' own try/catch blocks
// (malformed JSON bodies, CORS rejections, multer errors, unexpected
// framework errors) so the client always gets JSON — never a leaked stack
// trace or an HTML error page.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ message: 'Malformed request body' });
  }
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'Origin not allowed' });
  }
  res.status(err.status || 500).json({ message: 'Server error' });
});

// ── Start ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
if (require.main === module) {
  connectDB().then((isConnected) => {
  const server = app.listen(PORT, () => {
    if (isConnected) {
      console.log(`CampusCoin server running on port ${PORT}`);
    } else {
      console.log(`CampusCoin server running on port ${PORT} without MongoDB connectivity. Connect MongoDB or set MONGO_URI to restore database-backed APIs.`);
    }
  });

  const shutdown = () => {
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  });
}

module.exports = app;
