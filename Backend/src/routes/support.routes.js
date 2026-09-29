const router = require('express').Router();
const { serverError } = require('../utils/httpErrors');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const SupportMessage = require('../models/SupportMessage');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { validateIdParam } = require('../utils/objectId');
const { notifyAdminsOfSupportMessage } = require('../services/email.service');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const supportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { message: 'Too many messages. Please try again later.' },
});

const replyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { message: 'You are sending messages too quickly. Please wait a moment.' },
});

router.param('id', validateIdParam);

// Shape shared with the admin inbox: the opening message followed by every
// reply, oldest first, as one list of chat bubbles.
function formatThread(m, { forAdmin = false } = {}) {
  const messages = [
    { id: `${m._id}-0`, from: 'user', authorName: m.name, text: m.message, createdAt: m.createdAt },
    ...(m.replies || []).map((r) => ({
      id: r._id.toString(),
      from: r.from,
      authorName: r.from === 'admin' ? (forAdmin ? r.authorName : 'Campus Coin support') : r.authorName,
      text: r.text,
      createdAt: r.createdAt,
    })),
  ];
  return {
    id: m._id.toString(),
    name: m.name,
    email: m.email,
    topic: m.topic,
    message: m.message,
    status: m.status,
    userId: m.userId ? m.userId.toString() : null,
    createdAt: m.createdAt,
    resolvedAt: m.resolvedAt,
    lastActivityAt: m.lastActivityAt || m.updatedAt || m.createdAt,
    unread: forAdmin ? Boolean(m.unreadByAdmin) : Boolean(m.unreadByUser),
    replyCount: (m.replies || []).length,
    messages,
  };
}

function cleanText(value, max = 4000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

// POST /api/v1/support/messages — public (signed-in users are linked).
router.post('/messages', supportLimiter, async (req, res) => {
  try {
    const name = cleanText(req.body?.name, 100);
    const email = cleanText(req.body?.email, 200);
    const message = cleanText(req.body?.message);
    const topic = cleanText(req.body?.topic, 60) || 'General';
    if (!name) return res.status(400).json({ message: 'Name is required', fieldErrors: { name: 'Required' } });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'A valid email is required', fieldErrors: { email: 'Invalid email' } });
    if (message.length < 10) return res.status(400).json({ message: 'Message should be at least 10 characters', fieldErrors: { message: 'Too short' } });

    let userId = null;
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
        if (decoded.type !== 'refresh' && decoded.id && (await User.exists({ _id: decoded.id }))) userId = decoded.id;
      } catch {
        userId = null;
      }
    }

    const saved = await SupportMessage.create({ name, email, topic, message, userId, lastActivityAt: new Date() });
    // Awaited so it isn't cut off on serverless hosts; failures are logged
    // only — the message is safe in the admin inbox either way.
    const admins = await User.find({ role: 'admin', isActive: true }).select('email').lean();
    await notifyAdminsOfSupportMessage(saved, admins.map((a) => a.email)).catch((err) => console.warn('Support email failed:', err.message));
    res.status(201).json({
      data: { id: saved._id.toString(), linked: Boolean(userId) },
      message: userId
        ? 'Thanks — your message was sent. Replies will appear under "My conversations".'
        : 'Thanks — your message was sent. We will reply by email.',
    });
  } catch (err) {
    return serverError(res, err);
  }
});

/* ── Signed-in student: their own conversations ── */

// A student's threads: ones sent while signed in, plus ones sent as a guest
// from the same email address.
const ownThreadFilter = (user) => ({ $or: [{ userId: user._id }, { userId: null, email: user.email }] });

// GET /api/v1/support/threads
router.get('/threads', protect, async (req, res) => {
  try {
    const threads = await SupportMessage.find(ownThreadFilter(req.user)).sort({ lastActivityAt: -1 }).limit(50);
    res.json({
      data: threads.map((t) => formatThread(t)),
      meta: { unreadCount: threads.filter((t) => t.unreadByUser).length },
    });
  } catch (err) {
    return serverError(res, err);
  }
});

// GET /api/v1/support/threads/:id — also marks admin replies as read.
router.get('/threads/:id', protect, async (req, res) => {
  try {
    const thread = await SupportMessage.findOne({ _id: req.params.id, ...ownThreadFilter(req.user) });
    if (!thread) return res.status(404).json({ message: 'Conversation not found' });
    if (thread.unreadByUser) {
      thread.unreadByUser = false;
      await thread.save();
    }
    res.json({ data: formatThread(thread) });
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/v1/support/threads/:id/replies  { text }
router.post('/threads/:id/replies', protect, replyLimiter, async (req, res) => {
  try {
    const text = cleanText(req.body?.text);
    if (!text) return res.status(400).json({ message: 'Write a message first', fieldErrors: { text: 'Required' } });
    const thread = await SupportMessage.findOne({ _id: req.params.id, ...ownThreadFilter(req.user) });
    if (!thread) return res.status(404).json({ message: 'Conversation not found' });
    if (thread.replies.length >= 200) return res.status(400).json({ message: 'This conversation is too long. Please start a new one.' });

    thread.replies.push({ from: 'user', authorId: req.user._id, authorName: req.user.fullName, text });
    thread.userId = thread.userId || req.user._id;
    // A new message re-opens a resolved conversation.
    thread.status = 'open';
    thread.resolvedAt = null;
    thread.unreadByAdmin = true;
    thread.lastActivityAt = new Date();
    await thread.save();
    res.status(201).json({ data: formatThread(thread) });
  } catch (err) {
    return serverError(res, err);
  }
});

module.exports = router;
module.exports.formatThread = formatThread;
