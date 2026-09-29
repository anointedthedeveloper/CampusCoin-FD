const router = require('express').Router();
const { serverError } = require('../utils/httpErrors');
const Insight = require('../models/Insight');
const SavingTip = require('../models/SavingTip');
const MoneyMove = require('../models/MoneyMove');
const Bookmark = require('../models/Bookmark');
const TipState = require('../models/TipState');
const { getTipsForUser, setTipState } = require('../services/savingTips.service');
const { protect } = require('../middleware/auth');
const { validateIdParam, isValidObjectId } = require('../utils/objectId');

// protect is applied per-route (not via router.use) because this router is
// mounted at the bare /api/v1 root to serve /insights, /saving-tips and
// /bookmarks together — a blanket router.use(protect) here would intercept
// EVERY unmatched /api/v1/* path (not just this router's own three routes)
// and return 401 instead of letting it fall through to the app's 404
// handler.
router.param('id', validateIdParam);

function formatInsight(i) {
  return {
    id: i._id.toString(),
    userId: i.userId.toString(),
    kind: i.kind,
    title: i.title,
    body: i.body,
    month: i.month,
    isAiGenerated: i.isAiGenerated,
    createdAt: i.createdAt,
  };
}

function formatTip(t) {
  return {
    id: t._id.toString(),
    title: t.title,
    body: t.body,
    category: t.category,
    isAiGenerated: t.isAiGenerated,
    createdAt: t.createdAt,
  };
}

function formatBookmark(b) {
  return {
    id: b._id.toString(),
    userId: b.userId.toString(),
    targetType: b.targetType,
    targetId: b.targetId.toString(),
    createdAt: b.createdAt,
  };
}

// GET /api/v1/insights?month=YYYY-MM
router.get('/insights', protect, async (req, res) => {
  try {
    const filter = { userId: req.user._id };
    if (req.query.month) filter.month = req.query.month;
    const insights = await Insight.find(filter).sort({ createdAt: -1 });
    res.json({ data: insights.map(formatInsight) });
  } catch (err) {
    return serverError(res, err);
  }
});

// GET /api/v1/saving-tips — personalised tips ranked by estimated savings,
// then the admin's general tip templates. ?pinned=1 returns only pinned tips.
router.get('/saving-tips', protect, async (req, res) => {
  try {
    const { tips, dismissedCount } = await getTipsForUser(req.user);
    const pinnedOnly = req.query.pinned === '1' || req.query.pinned === 'true';
    res.json({ data: pinnedOnly ? tips.filter((t) => t.isPinned) : tips, meta: { dismissedCount } });
  } catch (err) {
    return serverError(res, err);
  }
});

function validTipKey(key) {
  return typeof key === 'string' && /^(personal|template):[\w:.-]{1,180}$/.test(key);
}

// POST /api/v1/saving-tips/dismiss  { tipId }
router.post('/saving-tips/dismiss', protect, async (req, res) => {
  try {
    if (!validTipKey(req.body?.tipId)) return res.status(400).json({ message: 'Invalid tipId' });
    await setTipState(req.user, req.body.tipId, { dismissed: true, pinned: false });
    res.json({ data: null, message: 'Tip dismissed' });
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/v1/saving-tips/pin  { tipId, pinned }
router.post('/saving-tips/pin', protect, async (req, res) => {
  try {
    if (!validTipKey(req.body?.tipId)) return res.status(400).json({ message: 'Invalid tipId' });
    const pinned = req.body.pinned !== false;
    await setTipState(req.user, req.body.tipId, { pinned, ...(pinned ? { dismissed: false } : {}) });
    res.json({ data: { tipId: req.body.tipId, pinned } });
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/v1/saving-tips/restore — bring back every dismissed tip.
router.post('/saving-tips/restore', protect, async (req, res) => {
  try {
    await TipState.updateMany({ userId: req.user._id, dismissed: true }, { $set: { dismissed: false } });
    res.json({ data: null, message: 'Dismissed tips restored' });
  } catch (err) {
    return serverError(res, err);
  }
});

// GET /api/v1/money-moves  (alias that uses the MoneyMove model / 'savingtips' collection)
router.get('/money-moves', protect, async (req, res) => {
  try {
    const count = await MoneyMove.countDocuments();
    if (count === 0) {
      await MoneyMove.insertMany([
        { title: 'Cook at home', body: 'Making your own meals instead of eating out can reduce food spending.', category: 'Food & Drinks' },
        { title: 'Use student discounts', body: 'Carry your student ID and check for student discounts before paying.', category: 'Shopping' },
        { title: 'Track every naira', body: 'Recording small expenses helps you identify spending patterns.', category: 'General' },
        { title: 'Set weekly spending limits', body: 'Breaking your monthly budget into weekly targets can help you detect overspending early.', category: 'General' },
        { title: 'Buy used or digital textbooks', body: 'Second-hand books or digital textbooks can reduce education costs.', category: 'Education' },
        { title: 'Walk or cycle short distances', body: 'Reducing transport costs on short trips can add up to meaningful savings.', category: 'Transport' },
      ]);
    }
    const tips = await MoneyMove.find().sort({ createdAt: -1 });
    res.json({ data: tips.map(formatTip) });
  } catch (err) {
    return serverError(res, err);
  }
});

// GET /api/v1/bookmarks
router.get('/bookmarks', protect, async (req, res) => {
  try {
    const bookmarks = await Bookmark.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ data: bookmarks.map(formatBookmark) });
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/v1/bookmarks
router.post('/bookmarks', protect, async (req, res) => {
  try {
    const { targetType, targetId } = req.body;
    if (!targetType || !targetId) return res.status(400).json({ message: 'targetType and targetId are required' });
    if (!['insight', 'saving-tip'].includes(targetType)) {
      return res.status(400).json({ message: "targetType must be 'insight' or 'saving-tip'" });
    }
    if (!isValidObjectId(targetId)) return res.status(400).json({ message: 'Invalid targetId' });

    const bookmark = await Bookmark.create({ userId: req.user._id, targetType, targetId });
    res.status(201).json({ data: formatBookmark(bookmark) });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Already bookmarked' });
    return serverError(res, err);
  }
});

// DELETE /api/v1/bookmarks/:id
router.delete('/bookmarks/:id', protect, async (req, res) => {
  try {
    const bookmark = await Bookmark.findOne({ _id: req.params.id, userId: req.user._id });
    if (!bookmark) return res.status(404).json({ message: 'Bookmark not found' });
    await bookmark.deleteOne();
    res.json({ data: null, message: 'Bookmark removed' });
  } catch (err) {
    return serverError(res, err);
  }
});

module.exports = router;
