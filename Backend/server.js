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
const myMoneyRoutes = require('./src/routes/my-money.routes');
const recurringRoutes = require('./src/routes/recurring.routes');
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

// Trust any reverse proxy's X-Forwarded-For so req.ip (used by the
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
if (process.env.NODE_ENV !== 'production' && !allowedOrigins.includes('http://localhost:5173')) {
  allowedOrigins.push('http://localhost:5173');
}

function isLocalFrontendOrigin(origin) {
  if (process.env.NODE_ENV === 'production') return false;

  let parsedOrigin;
  try {
    parsedOrigin = new URL(origin);
  } catch {
    return false;
  }

  const port = Number(parsedOrigin.port);
  if (parsedOrigin.protocol !== 'http:' || port < 5173 || port > 5200) {
    return false;
  }

  const hostname = parsedOrigin.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;

  const octets = hostname.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  return (
    octets[0] === 10 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (no Origin header, e.g. curl/health checks)
    if (!origin || allowedOrigins.includes(origin) || isLocalFrontendOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────
app.get('/', (_req, res) => res.json({ message: 'CampusCoin API is running' }));

const databaseIndependentRoutes = new Set([
  '/api/v1/auth/google/config',
  '/api/ccoin/auth/google/config',
]);

app.use(async (_req, res, next) => {
  if (databaseIndependentRoutes.has(_req.path)) return next();
  if (await connectDB()) return next();
  return res.status(503).json({ message: 'Database is unavailable. Please try again shortly.' });
});

// ── Routes ────────────────────────────────────────────────────────────
// Register all routes under a given prefix
function registerRoutes(prefix) {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/profile`, profileRoutes);
  app.use(`${prefix}/categories`, categoriesRoutes);
  app.use(`${prefix}/transactions`, transactionsRoutes);
  app.use(`${prefix}/budgets`, budgetsRoutes);
  app.use(`${prefix}/reports`, reportsRoutes);
  app.use(`${prefix}/ai`, aiRoutes);
  // insights.routes handles /insights, /saving-tips, /money-moves, /bookmarks
  app.use(`${prefix}`, insightsRoutes);
  app.use(`${prefix}/notifications`, notificationsRoutes);
  app.use(`${prefix}/admin`, adminRoutes);
  app.use(`${prefix}/dashboard`, dashboardRoutes);
  app.use(`${prefix}/my-money`, myMoneyRoutes);
  app.use(`${prefix}/money-routines`, recurringRoutes.router);
  // Keep the previous prefix available for existing clients during migration.
  app.use(`${prefix}/recurring-transactions`, recurringRoutes.router);
}

// Primary API prefix
const API = '/api/v1';
registerRoutes(API);

// New CampusCoin prefix — same routes, keeps both working
const CCOIN_API = '/api/ccoin';
registerRoutes(CCOIN_API);

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
