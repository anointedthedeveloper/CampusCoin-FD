const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const SupportMessage = require('../models/SupportMessage');
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

// POST /api/v1/support/messages — public (signed-in users are linked).
router.post('/messages', supportLimiter, async (req, res) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const topic = typeof req.body?.topic === 'string' ? req.body.topic.trim().slice(0, 60) : 'General';
    if (!name) return res.status(400).json({ message: 'Name is required', fieldErrors: { name: 'Required' } });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'A valid email is required', fieldErrors: { email: 'Invalid email' } });
    if (message.length < 10) return res.status(400).json({ message: 'Message should be at least 10 characters', fieldErrors: { message: 'Too short' } });

    let userId = null;
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      try {
        userId = jwt.verify(header.slice(7), process.env.JWT_SECRET).id ?? null;
      } catch {
        userId = null;
      }
    }

    const saved = await SupportMessage.create({
      name: name.slice(0, 100),
      email: email.slice(0, 200),
      topic: topic || 'General',
      message: message.slice(0, 4000),
      userId,
    });
    notifyAdminsOfSupportMessage(saved).catch((err) => console.warn('Support email failed:', err.message));
    res.status(201).json({ data: { id: saved._id.toString() }, message: 'Thanks — your message was sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
