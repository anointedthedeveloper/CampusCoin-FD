const router = require('express').Router();
const { serverError } = require('../utils/httpErrors');
const User = require('../models/User');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const Announcement = require('../models/Announcement');
const Budget = require('../models/Budget');
const Notification = require('../models/Notification');
const Insight = require('../models/Insight');
const Bookmark = require('../models/Bookmark');
const SavingTip = require('../models/SavingTip');
const RecurringTransaction = require('../models/RecurringTransaction');
const ImportBatch = require('../models/ImportBatch');
const Anomaly = require('../models/Anomaly');
const TipState = require('../models/TipState');
const SupportMessage = require('../models/SupportMessage');
const Session = require('../models/Session');
const AiConversation = require('../models/AiConversation');
const Backup = require('../models/Backup');
const TransactionRevision = require('../models/TransactionRevision');
const SavingsGoal = require('../models/SavingsGoal');
const { runDailyBackups, createBackup, formatBackup } = require('../services/backup.service');
const { ensureTemplates } = require('../services/savingTips.service');
const { getSystemTemplates, seedDefaultCategories } = require('../services/defaultCategories.service');
const { protect, requireAdmin } = require('../middleware/auth');
const { validateIdParam } = require('../utils/objectId');
const { isEmailConfigured, emailStatus, sendTestEmail, sendAnnouncementEmails, sendSupportReplyEmail } = require('../services/email.service');
const { issuePasswordReset } = require('../services/passwordReset.service');

// All admin routes require auth + admin role
router.use(protect, requireAdmin);
router.param('id', validateIdParam);

/* ─────────────────────────────── USERS ─────────────────────────────── */

// GET /api/v1/admin/users
router.get('/users', async (req, res) => {
  try {
    const { search, role, page = 1, pageSize = 20 } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (typeof search === 'string' && search.trim()) {
      const pattern = search.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { fullName: { $regex: pattern, $options: 'i' } },
        { email: { $regex: pattern, $options: 'i' } },
      ];
    }

    const pageNum = Math.min(100000, Math.max(1, parseInt(page) || 1));
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize) || 20));
    const skip = (pageNum - 1) * pageSizeNum;

    const [users, totalItems] = await Promise.all([
      User.find(filter).select('-resetPasswordToken -resetPasswordExpires').sort({ createdAt: -1 }).skip(skip).limit(pageSizeNum),
      User.countDocuments(filter),
    ]);

    // Attach transaction counts
    const userIds = users.map((u) => u._id);
    const txCounts = await Transaction.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ]);
    const txMap = {};
    txCounts.forEach((t) => { txMap[t._id.toString()] = t.count; });

    const items = users.map((u) => ({
      ...u.toPublic(),
      transactionCount: txMap[u._id.toString()] || 0,
    }));

    res.json({ data: { items, page: pageNum, pageSize: pageSizeNum, totalItems, totalPages: Math.ceil(totalItems / pageSizeNum) } });
  } catch (err) {
    return serverError(res, err);
  }
});

// GET /api/v1/admin/users/:id
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-resetPasswordToken -resetPasswordExpires');
    if (!user) return res.status(404).json({ message: 'User not found' });
    const [txCount, totals, recent, categoryCount, budgetCount] = await Promise.all([
      Transaction.countDocuments({ userId: user._id }),
      Transaction.aggregate([
        { $match: { userId: user._id } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } },
      ]),
      Transaction.find({ userId: user._id }).sort({ occurredAt: -1 }).limit(8).populate('categoryId', 'name'),
      Category.countDocuments({ userId: user._id }),
      Budget.countDocuments({ userId: user._id }),
    ]);
    const totalFor = (type) => totals.find((t) => t._id === type)?.total ?? 0;
    res.json({
      data: {
        ...user.toPublic(),
        transactionCount: txCount,
        categoryCount,
        budgetCount,
        totalIncome: totalFor('income'),
        totalExpense: totalFor('expense'),
        recentTransactions: recent.map((t) => ({
          id: t._id.toString(),
          type: t.type,
          amount: t.amount,
          description: t.description ?? '',
          categoryName: t.categoryId?.name ?? 'Uncategorized',
          occurredAt: t.occurredAt,
        })),
      },
    });
  } catch (err) {
    return serverError(res, err);
  }
});

// PATCH /api/v1/admin/users/:id — { isActive?, role?, fullName?, school?, academicYear? }
router.patch('/users/:id', async (req, res) => {
  try {
    const { isActive, role } = req.body;
    const isSelf = req.params.id === req.user._id.toString();
    const update = {};
    if (isActive !== undefined) {
      if (typeof isActive !== 'boolean') return res.status(400).json({ message: 'isActive must be true or false' });
      if (!isActive && isSelf) return res.status(400).json({ message: 'You cannot suspend your own admin account.' });
      update.isActive = isActive;
    }
    if (role !== undefined) {
      if (!['student', 'admin'].includes(role)) return res.status(400).json({ message: "role must be 'student' or 'admin'" });
      if (isSelf && role !== 'admin') return res.status(400).json({ message: 'You cannot remove your own admin role.' });
      update.role = role;
    }
    for (const key of ['fullName', 'school', 'academicYear']) {
      if (typeof req.body[key] === 'string') {
        const value = req.body[key].trim().slice(0, 100);
        if (key === 'fullName' && !value) return res.status(400).json({ message: 'Name cannot be empty' });
        update[key] = value;
      }
    }
    if (!Object.keys(update).length) return res.status(400).json({ message: 'Nothing to update' });

    const user = await User.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after', runValidators: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    // Suspending signs the student out of every device straight away.
    if (update.isActive === false) await Session.updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
    const txCount = await Transaction.countDocuments({ userId: user._id });
    res.json({ data: { ...user.toPublic(), transactionCount: txCount } });
  } catch (err) {
    return serverError(res, err);
  }
});

async function deleteUserData(userId, { includeCategories }) {
  await Promise.all([
    Transaction.deleteMany({ userId }),
    Budget.deleteMany({ userId }),
    Notification.deleteMany({ userId }),
    Insight.deleteMany({ userId }),
    Bookmark.deleteMany({ userId }),
    RecurringTransaction.deleteMany({ user: userId }),
    ImportBatch.deleteMany({ user: userId }),
    Anomaly.deleteMany({ user: userId }),
    TipState.deleteMany({ userId }),
    AiConversation.deleteMany({ userId }),
    SavingsGoal.deleteMany({ userId }),
    TransactionRevision.deleteMany({ userId }),
    includeCategories ? Category.deleteMany({ userId }) : null,
  ]);
}

// POST /api/v1/admin/users/:id/send-password-reset — emails the user a
// reset code + link (the admin never sees or sets their password).
router.post('/users/:id/send-password-reset', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!isEmailConfigured()) {
      return res.status(503).json({ message: 'Email is not configured on the server, so a reset email cannot be sent.', code: 'EMAIL_NOT_CONFIGURED' });
    }
    await issuePasswordReset(user);
    res.json({ data: null, message: `Password reset email sent to ${user.email}.` });
  } catch (err) {
    console.error(err);
    res.status(502).json({ message: 'The reset email could not be sent. Please try again.' });
  }
});

// POST /api/v1/admin/users/:id/reset — wipes the student's financial data
// (transactions, budgets, recurring entries, notifications, insights,
// bookmarks), restores the default categories and restarts onboarding. The
// login itself (email, password, role, active status) is kept.
router.post('/users/:id/reset', async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot reset your own admin account.' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await deleteUserData(user._id, { includeCategories: true });
    await seedDefaultCategories(user._id);

    user.onboarding = { status: 'not_started', currentStep: 1 };
    user.monthlyAllowanceBaseline = undefined;
    user.savingsGoalAmount = undefined;
    await user.save();

    res.json({ data: { ...user.toPublic(), transactionCount: 0 }, message: 'Account data reset' });
  } catch (err) {
    return serverError(res, err);
  }
});

// DELETE /api/v1/admin/users/:id — also removes all of the user's own data
// (transactions, budgets, categories, notifications, insights, bookmarks) so
// a deleted account doesn't leave orphaned financial records behind.
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own admin account.' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await deleteUserData(user._id, { includeCategories: true });
    await Promise.all([Session.deleteMany({ userId: user._id }), Backup.deleteMany({ userId: user._id })]);

    res.json({ data: null, message: 'User deleted' });
  } catch (err) {
    return serverError(res, err);
  }
});

/* ──────────────────────────── CATEGORIES ───────────────────────────── */

function formatCat(c) {
  return { id: c._id.toString(), name: c.name, type: c.type, icon: c.icon, color: c.color, isDefault: c.isDefault, userId: c.userId?.toString() ?? null, createdAt: c.createdAt, updatedAt: c.updatedAt };
}

const COLOR_RE = /^#[0-9a-f]{6}$/i;
const PROTECTED_CATEGORY_NAMES = ['other income', 'miscellaneous', 'other'];

// GET /api/v1/admin/categories — system default templates (userId: null),
// with how many students have a copy and how many transactions use it.
router.get('/categories', async (req, res) => {
  try {
    const cats = await getSystemTemplates();
    const usage = await Category.aggregate([
      { $match: { userId: { $ne: null } } },
      { $group: { _id: { name: { $toLower: '$name' }, type: '$type' }, studentCount: { $sum: 1 }, ids: { $push: '$_id' } } },
    ]);
    const txCounts = await Transaction.aggregate([
      { $group: { _id: '$categoryId', count: { $sum: 1 } } },
    ]);
    const txByCategory = new Map(txCounts.map((t) => [String(t._id), t.count]));
    const usageByKey = new Map(usage.map((u) => [`${u._id.type}:${u._id.name}`, u]));
    res.json({
      data: cats.map((c) => {
        const u = usageByKey.get(`${c.type}:${c.name.toLowerCase()}`);
        const transactionCount = (txByCategory.get(String(c._id)) ?? 0)
          + (u ? u.ids.reduce((sum, id) => sum + (txByCategory.get(String(id)) ?? 0), 0) : 0);
        return { ...formatCat(c), studentCount: u?.studentCount ?? 0, transactionCount, isProtected: PROTECTED_CATEGORY_NAMES.includes(c.name.toLowerCase()) };
      }),
    });
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/v1/admin/categories
router.post('/categories', async (req, res) => {
  try {
    const { name, type, icon, color } = req.body;
    if (typeof name !== 'string' || !name.trim() || !type) return res.status(400).json({ message: 'Name and type are required' });
    if (!['income', 'expense'].includes(type)) return res.status(400).json({ message: "type must be 'income' or 'expense'" });
    if (color !== undefined && color !== null && (typeof color !== 'string' || !COLOR_RE.test(color))) return res.status(400).json({ message: 'color must be a hex value like #22c55e' });
    if (icon !== undefined && icon !== null && icon !== '' && (typeof icon !== 'string' || !/^[a-z0-9-]{1,40}$/.test(icon))) return res.status(400).json({ message: 'Unknown icon' });
    const cat = await Category.create({ name: name.trim().slice(0, 40), type, icon: icon || undefined, color: color || '#94a3b8', userId: null, isDefault: true });
    res.status(201).json({ data: formatCat(cat) });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Category already exists' });
    return serverError(res, err);
  }
});

// PATCH /api/v1/admin/categories/:id  { name?, color?, icon?, applyToStudents? }
// applyToStudents also renames/recolours every student's copy of the
// category (skipping any student who already has one with the new name).
router.patch('/categories/:id', async (req, res) => {
  try {
    const cat = await Category.findOne({ _id: req.params.id, userId: null });
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    const oldName = cat.name;
    const name = typeof req.body.name === 'string' ? req.body.name.trim().slice(0, 40) : undefined;
    if (name !== undefined && !name) return res.status(400).json({ message: 'Name cannot be empty' });
    if (req.body.color !== undefined && !COLOR_RE.test(req.body.color)) return res.status(400).json({ message: 'color must be a hex value like #22c55e' });
    if (name && name.toLowerCase() !== oldName.toLowerCase() && PROTECTED_CATEGORY_NAMES.includes(oldName.toLowerCase())) {
      return res.status(400).json({ message: `"${oldName}" is the fallback category and cannot be renamed.` });
    }
    if (name) cat.name = name;
    if (req.body.color !== undefined) cat.color = req.body.color;
    if (typeof req.body.icon === 'string') {
      if (!/^[a-z0-9-]{1,40}$/.test(req.body.icon)) return res.status(400).json({ message: 'Unknown icon' });
      cat.icon = req.body.icon;
    }
    await cat.save();

    let studentsUpdated = 0;
    if (req.body.applyToStudents === true) {
      const copies = await Category.find({ userId: { $ne: null }, type: cat.type, name: new RegExp(`^${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
      for (const copy of copies) {
        if (name && name.toLowerCase() !== oldName.toLowerCase()) {
          const clash = await Category.exists({ userId: copy.userId, type: copy.type, name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
          if (clash) continue;
          copy.name = name;
        }
        if (req.body.color !== undefined) copy.color = req.body.color;
        if (typeof req.body.icon === 'string') copy.icon = cat.icon;
        await copy.save();
        studentsUpdated += 1;
      }
    }
    res.json({ data: { ...formatCat(cat), studentsUpdated } });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'A default category with that name already exists' });
    return serverError(res, err);
  }
});

// DELETE /api/v1/admin/categories/:id?removeFromStudents=true
// Removing it from students only deletes copies with no transactions or
// budgets, so nobody's history is lost.
router.delete('/categories/:id', async (req, res) => {
  try {
    const cat = await Category.findOne({ _id: req.params.id, userId: null });
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    if (PROTECTED_CATEGORY_NAMES.includes(cat.name.toLowerCase())) {
      return res.status(400).json({ message: `"${cat.name}" is the fallback category and cannot be deleted.` });
    }
    const inUse = await Transaction.exists({ categoryId: cat._id });
    if (inUse) {
      // Students logged transactions against the shared template directly;
      // keep it (hidden from new sign-ups) instead of orphaning them.
      cat.isDefault = false;
      await cat.save();
    } else {
      await cat.deleteOne();
    }

    let studentsRemoved = 0;
    if (req.query.removeFromStudents === 'true') {
      const copies = await Category.find({ userId: { $ne: null }, type: cat.type, name: new RegExp(`^${cat.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
      for (const copy of copies) {
        const [hasTx, hasBudget] = await Promise.all([
          Transaction.exists({ categoryId: copy._id }),
          Budget.exists({ categoryId: copy._id }),
        ]);
        if (!hasTx && !hasBudget) {
          await copy.deleteOne();
          studentsRemoved += 1;
        }
      }
    }
    res.json({ data: { studentsRemoved }, message: 'Category removed' });
  } catch (err) {
    return serverError(res, err);
  }
});

/* ─────────────────────────── ANNOUNCEMENTS ─────────────────────────── */

// Emails a newly published announcement to its audience (students with
// email notifications on, and/or admins) the first time it goes live.
async function emailAnnouncement(ann) {
  if (!ann.publishedAt || ann.emailedAt || !isEmailConfigured()) return;
  const roleFilter = ann.audience === 'students' ? { role: 'student' } : ann.audience === 'admins' ? { role: 'admin' } : {};
  const users = await User.find({ ...roleFilter, isActive: true, 'settings.emailNotifications': { $ne: false } }).select('email').lean();
  ann.emailedAt = new Date();
  await ann.save();
  await sendAnnouncementEmails(users.map((u) => u.email), ann);
}

function formatAnn(a) {
  return { id: a._id.toString(), title: a.title, body: a.body, audience: a.audience, publishedAt: a.publishedAt, createdAt: a.createdAt, updatedAt: a.updatedAt };
}

// GET /api/v1/admin/announcements
router.get('/announcements', async (req, res) => {
  try {
    const anns = await Announcement.find().sort({ createdAt: -1 });
    res.json({ data: anns.map(formatAnn) });
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/v1/admin/announcements
router.post('/announcements', async (req, res) => {
  try {
    const { title, body, audience, publishNow } = req.body;
    if (typeof title !== 'string' || typeof body !== 'string' || !title.trim() || !body.trim() || !audience) {
      return res.status(400).json({ message: 'title, body and audience are required' });
    }
    if (title.length > 160 || body.length > 5000) return res.status(400).json({ message: 'Title must be under 160 characters and the message under 5000.' });
    if (!['all', 'students', 'admins'].includes(audience)) {
      return res.status(400).json({ message: "audience must be 'all', 'students' or 'admins'" });
    }
    const ann = await Announcement.create({ title: title.trim(), body: body.trim(), audience, publishedAt: publishNow ? new Date() : null, createdBy: req.user._id });
    await emailAnnouncement(ann).catch((err) => console.error('Announcement email failed:', err));
    res.status(201).json({ data: formatAnn(ann) });
  } catch (err) {
    return serverError(res, err);
  }
});

// PATCH /api/v1/admin/announcements/:id
router.patch('/announcements/:id', async (req, res) => {
  try {
    const ann = await Announcement.findById(req.params.id);
    if (!ann) return res.status(404).json({ message: 'Announcement not found' });
    if (req.body.audience !== undefined && !['all', 'students', 'admins'].includes(req.body.audience)) {
      return res.status(400).json({ message: "audience must be 'all', 'students' or 'admins'" });
    }
    for (const k of ['title', 'body']) {
      if (req.body[k] === undefined) continue;
      if (typeof req.body[k] !== 'string' || !req.body[k].trim()) return res.status(400).json({ message: `${k} cannot be empty` });
      ann[k] = req.body[k].trim();
    }
    if (req.body.audience !== undefined) ann.audience = req.body.audience;
    if (req.body.publishNow) ann.publishedAt = new Date();
    if (req.body.unpublish === true) {
      ann.publishedAt = null;
      await Notification.deleteMany({ type: 'announcement', 'meta.announcementId': ann._id });
    }
    await ann.save();
    await emailAnnouncement(ann).catch((err) => console.error('Announcement email failed:', err));
    // Keep already-delivered copies in step with the edit.
    await Notification.updateMany(
      { type: 'announcement', 'meta.announcementId': ann._id },
      { $set: { title: ann.title, message: ann.body } },
    );
    res.json({ data: formatAnn(ann) });
  } catch (err) {
    return serverError(res, err);
  }
});

// DELETE /api/v1/admin/announcements/:id
router.delete('/announcements/:id', async (req, res) => {
  try {
    const ann = await Announcement.findByIdAndDelete(req.params.id);
    if (!ann) return res.status(404).json({ message: 'Announcement not found' });
    await Notification.deleteMany({ type: 'announcement', 'meta.announcementId': ann._id });
    res.json({ data: null, message: 'Announcement deleted' });
  } catch (err) {
    return serverError(res, err);
  }
});

/* ─────────────────────────── SAVING TIPS ──────────────────────────── */

function formatTip(t) {
  return { id: t._id.toString(), title: t.title, body: t.body, category: t.category ?? '', createdAt: t.createdAt, updatedAt: t.updatedAt };
}

// GET /api/v1/admin/saving-tips — the general tip templates students see
// alongside their personalised tips.
router.get('/saving-tips', async (_req, res) => {
  try {
    await ensureTemplates();
    const tips = await SavingTip.find({ isAiGenerated: { $ne: true } }).sort({ createdAt: -1 });
    res.json({ data: tips.map(formatTip) });
  } catch (err) {
    return serverError(res, err);
  }
});

router.post('/saving-tips', async (req, res) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const body = typeof req.body.body === 'string' ? req.body.body.trim() : '';
    if (!title || !body) return res.status(400).json({ message: 'Title and body are required' });
    const tip = await SavingTip.create({
      title: title.slice(0, 120),
      body: body.slice(0, 600),
      category: typeof req.body.category === 'string' ? req.body.category.trim().slice(0, 60) : 'General',
    });
    res.status(201).json({ data: formatTip(tip) });
  } catch (err) {
    return serverError(res, err);
  }
});

router.patch('/saving-tips/:id', async (req, res) => {
  try {
    const tip = await SavingTip.findById(req.params.id);
    if (!tip) return res.status(404).json({ message: 'Tip not found' });
    ['title', 'body', 'category'].forEach((key) => {
      if (typeof req.body[key] === 'string' && (key === 'category' || req.body[key].trim())) tip[key] = req.body[key].trim();
    });
    await tip.save();
    res.json({ data: formatTip(tip) });
  } catch (err) {
    return serverError(res, err);
  }
});

router.delete('/saving-tips/:id', async (req, res) => {
  try {
    const tip = await SavingTip.findByIdAndDelete(req.params.id);
    if (!tip) return res.status(404).json({ message: 'Tip not found' });
    await Bookmark.deleteMany({ targetType: 'saving-tip', targetId: tip._id });
    await TipState.deleteMany({ tipKey: `template:${tip._id}` });
    res.json({ data: null, message: 'Tip deleted' });
  } catch (err) {
    return serverError(res, err);
  }
});

/* ─────────────────────────── SUPPORT INBOX ─────────────────────────── */

const { formatThread } = require('./support.routes');
const formatSupport = (m) => formatThread(m, { forAdmin: true });

// GET /api/v1/admin/support?status=open|resolved
router.get('/support', async (req, res) => {
  try {
    const filter = ['open', 'resolved'].includes(req.query.status) ? { status: req.query.status } : {};
    const [items, openCount, unreadCount] = await Promise.all([
      SupportMessage.find(filter).sort({ lastActivityAt: -1, createdAt: -1 }).limit(200),
      SupportMessage.countDocuments({ status: 'open' }),
      SupportMessage.countDocuments({ unreadByAdmin: true }),
    ]);
    res.json({ data: items.map(formatSupport), meta: { openCount, unreadCount } });
  } catch (err) {
    return serverError(res, err);
  }
});

// GET /api/v1/admin/support/:id — one conversation; marks it read.
router.get('/support/:id', async (req, res) => {
  try {
    const m = await SupportMessage.findById(req.params.id);
    if (!m) return res.status(404).json({ message: 'Message not found' });
    if (m.unreadByAdmin) {
      m.unreadByAdmin = false;
      await m.save();
    }
    res.json({ data: formatSupport(m) });
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/v1/admin/support/:id/replies  { text, resolve? } — the student
// gets an in-app notification (if they have an account) and an email.
router.post('/support/:id/replies', async (req, res) => {
  try {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim().slice(0, 4000) : '';
    if (!text) return res.status(400).json({ message: 'Write a reply first', fieldErrors: { text: 'Required' } });
    const m = await SupportMessage.findById(req.params.id);
    if (!m) return res.status(404).json({ message: 'Message not found' });

    m.replies.push({ from: 'admin', authorId: req.user._id, authorName: req.user.fullName, text });
    m.unreadByUser = true;
    m.unreadByAdmin = false;
    m.lastActivityAt = new Date();
    if (req.body?.resolve === true) {
      m.status = 'resolved';
      m.resolvedAt = new Date();
    }
    await m.save();

    // Guests who wrote in with the email of an existing account still see
    // the reply in-app.
    const owner = m.userId ? await User.findById(m.userId).select('_id').lean() : await User.findOne({ email: m.email }).select('_id').lean();
    if (owner) {
      await Notification.create({
        userId: owner._id,
        type: 'support-reply',
        title: 'Support replied to your message',
        message: text.length > 160 ? `${text.slice(0, 157)}…` : text,
        severity: 'info',
        meta: { supportMessageId: m._id },
      });
    }
    const emailResult = await sendSupportReplyEmail(m.email, m.name, text, Boolean(owner));
    res.status(201).json({ data: formatSupport(m), meta: { emailed: Boolean(emailResult?.sent), inApp: Boolean(owner) } });
  } catch (err) {
    return serverError(res, err);
  }
});

// PATCH /api/v1/admin/support/:id  { status }
router.patch('/support/:id', async (req, res) => {
  try {
    if (!['open', 'resolved'].includes(req.body?.status)) return res.status(400).json({ message: "status must be 'open' or 'resolved'" });
    const m = await SupportMessage.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status, resolvedAt: req.body.status === 'resolved' ? new Date() : null, unreadByAdmin: false },
      { returnDocument: 'after' },
    );
    if (!m) return res.status(404).json({ message: 'Message not found' });
    res.json({ data: formatSupport(m) });
  } catch (err) {
    return serverError(res, err);
  }
});

// DELETE /api/v1/admin/support/:id
router.delete('/support/:id', async (req, res) => {
  try {
    const m = await SupportMessage.findByIdAndDelete(req.params.id);
    if (!m) return res.status(404).json({ message: 'Message not found' });
    res.json({ data: null, message: 'Message deleted' });
  } catch (err) {
    return serverError(res, err);
  }
});

/* ──────────────────────────── STATISTICS ───────────────────────────── */

// GET /api/v1/admin/statistics
router.get('/statistics', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalUsers, totalTransactions, totalCategories, activeUsersAgg, avgSpendAgg, suspendedUsers, newUsersLast30Days, mostUsedCategories, transactionsByType] = await Promise.all([
      User.countDocuments(),
      Transaction.countDocuments(),
      Category.countDocuments({ userId: null }),
      Transaction.distinct('userId', { occurredAt: { $gte: thirtyDaysAgo } }),
      Transaction.aggregate([
        { $match: { type: 'expense' } },
        { $group: { _id: { userId: '$userId', month: { $substr: ['$occurredAt', 0, 7] } }, total: { $sum: '$amount' } } },
        { $group: { _id: null, avg: { $avg: '$total' } } },
      ]),
      User.countDocuments({ isActive: false }),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      // Grouped by category NAME + type so every student's personal copy of
      // "Food" counts toward the same bar.
      Transaction.aggregate([
        { $lookup: { from: 'categories', localField: 'categoryId', foreignField: '_id', as: 'category' } },
        { $unwind: '$category' },
        { $group: { _id: { name: '$category.name', type: '$category.type' }, transactionCount: { $sum: 1 }, totalAmount: { $sum: '$amount' } } },
        { $sort: { transactionCount: -1 } },
        { $limit: 8 },
      ]),
      Transaction.aggregate([{ $group: { _id: '$type', count: { $sum: 1 }, total: { $sum: '$amount' } } }]),
    ]);
    const byType = (type) => transactionsByType.find((t) => t._id === type) ?? { count: 0, total: 0 };

    res.json({
      data: {
        totalUsers,
        activeUsersLast30Days: activeUsersAgg.length,
        totalTransactions,
        totalCategories,
        averageMonthlySpendPerUser: avgSpendAgg[0]?.avg ?? 0,
        suspendedUsers,
        newUsersLast30Days,
        incomeTransactions: byType('income').count,
        expenseTransactions: byType('expense').count,
        mostUsedCategories: mostUsedCategories.map((c) => ({
          name: c._id.name,
          type: c._id.type,
          transactionCount: c.transactionCount,
          totalAmount: c.totalAmount,
        })),
        generatedAt: new Date(),
      },
    });
  } catch (err) {
    return serverError(res, err);
  }
});

/* ────────────────────────────── BACKUPS ────────────────────────────── */

// GET /api/v1/admin/backups — how well the automatic backups are covering
// students.
router.get('/backups', async (_req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [total, sizeAgg, studentsWithBackup, backedUpToday, activeUsers, latest] = await Promise.all([
      Backup.countDocuments(),
      Backup.aggregate([{ $group: { _id: null, bytes: { $sum: '$sizeBytes' } } }]),
      Backup.distinct('userId').then((ids) => ids.length),
      Backup.distinct('userId', { createdAt: { $gt: since } }).then((ids) => ids.length),
      User.countDocuments({ isActive: true }),
      Backup.findOne().sort({ createdAt: -1 }).select('createdAt kind').lean(),
    ]);
    res.json({
      data: {
        totalBackups: total,
        totalBytes: sizeAgg[0]?.bytes ?? 0,
        usersWithBackup: studentsWithBackup,
        usersBackedUpLast24h: backedUpToday,
        activeUsers,
        lastBackupAt: latest?.createdAt ?? null,
        cronConfigured: Boolean(process.env.CRON_SECRET),
      },
    });
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/v1/admin/backups/run — back up every student who is due now.
router.post('/backups/run', async (_req, res) => {
  try {
    const result = await runDailyBackups({ budgetMs: 40_000 });
    res.json({ data: result, message: `Backed up ${result.done} account${result.done === 1 ? '' : 's'}${result.remaining ? ` (${result.remaining} left for the next run)` : ''}.` });
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/v1/admin/users/:id/backup — manual backup of one student.
router.post('/users/:id/backup', async (req, res) => {
  try {
    if (!(await User.exists({ _id: req.params.id }))) return res.status(404).json({ message: 'User not found' });
    const backup = await createBackup(req.params.id, 'manual');
    res.status(201).json({ data: formatBackup(backup), message: 'Backup created' });
  } catch (err) {
    return serverError(res, err);
  }
});

/* ─────────────────────────────── EMAIL ─────────────────────────────── */

// GET /api/v1/admin/email/status — which providers are set up and the last
// delivery error from each (never the keys themselves).
router.get('/email/status', (_req, res) => {
  res.json({ data: emailStatus() });
});

// POST /api/v1/admin/email/test — { to? } sends a test email (defaults to
// the admin's own address) and reports the provider's exact error if any.
router.post('/email/test', async (req, res) => {
  const to = typeof req.body?.to === 'string' && req.body.to.trim() ? req.body.to.trim() : req.user.email;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return res.status(400).json({ message: 'Enter a valid email address' });
  if (!isEmailConfigured()) {
    return res.status(503).json({ message: 'No email provider is configured. Set BREVO_API_KEY (recommended), RESEND_API_KEY or EMAIL_HOST/EMAIL_USER/EMAIL_PASS on the server.', code: 'EMAIL_NOT_CONFIGURED', data: emailStatus() });
  }
  try {
    const result = await sendTestEmail(to);
    res.json({ data: { ...emailStatus(), provider: result.provider }, message: `Test email sent to ${to} via ${result.provider}.` });
  } catch (err) {
    res.status(502).json({ message: `Sending failed: ${String(err.message || err).slice(0, 300)}`, code: 'EMAIL_SEND_FAILED', data: emailStatus() });
  }
});

module.exports = router;
