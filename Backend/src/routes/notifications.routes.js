const router = require('express').Router();
const Notification = require('../models/Notification');
const Announcement = require('../models/Announcement');
const { protect } = require('../middleware/auth');
const { validateIdParam } = require('../utils/objectId');

router.use(protect);
router.param('id', validateIdParam);

function formatNotif(n) {
  return {
    id: n._id.toString(),
    userId: n.userId.toString(),
    type: n.type,
    title: n.title,
    message: n.message,
    severity: n.severity,
    isRead: n.isRead,
    isDismissed: n.isDismissed,
    meta: n.meta,
    createdAt: n.createdAt,
  };
}

// Copies any published announcement the user hasn't received yet into their
// own notification feed, so announcements count toward the unread badge and
// can be marked read/cleared like everything else.
async function syncAnnouncements(user) {
  const audiences = user.role === 'admin' ? ['all', 'students', 'admins'] : ['all', 'students'];
  const anns = await Announcement.find({ audience: { $in: audiences }, publishedAt: { $ne: null } })
    .sort({ publishedAt: -1 })
    .limit(50)
    .lean();
  if (!anns.length) return;
  const existing = await Notification.find({
    userId: user._id,
    type: 'announcement',
    'meta.announcementId': { $in: anns.map((a) => a._id) },
  }).select('meta.announcementId').lean();
  const have = new Set(existing.map((n) => String(n.meta?.announcementId)));
  const missing = anns.filter((a) => !have.has(String(a._id)));
  if (!missing.length) return;
  await Notification.insertMany(missing.map((a) => ({
    userId: user._id,
    type: 'announcement',
    title: a.title,
    message: a.body,
    severity: 'info',
    meta: { announcementId: a._id },
    createdAt: a.publishedAt,
  })));
}

// GET /api/v1/notifications
router.get('/', async (req, res) => {
  try {
    await syncAnnouncements(req.user).catch((err) => console.error('Announcement sync failed:', err.message));
    const notifications = await Notification.find({
      userId: req.user._id,
      isDismissed: { $ne: true },
    }).sort({ createdAt: -1 }).limit(50);
    res.json({ data: notifications.map(formatNotif) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/v1/notifications/announcements
// Published announcements visible to the caller's role. Students must not use
// /admin/announcements (admin-only, returns 403) to read these.
router.get('/announcements', async (req, res) => {
  try {
    const audiences = req.user.role === 'admin' ? ['all', 'students', 'admins'] : ['all', 'students'];
    const anns = await Announcement.find({
      audience: { $in: audiences },
      publishedAt: { $ne: null },
    }).sort({ publishedAt: -1 }).limit(50);
    res.json({
      data: anns.map((a) => ({
        id: a._id.toString(),
        title: a.title,
        body: a.body,
        audience: a.audience,
        publishedAt: a.publishedAt,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/v1/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  try {
    const notif = await Notification.findOne({ _id: req.params.id, userId: req.user._id });
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    notif.isRead = true;
    await notif.save();
    res.json({ data: formatNotif(notif) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/v1/notifications/read-all
router.patch('/read-all', async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
    res.json({ data: null, message: 'All notifications marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/v1/notifications/clear-all — hide every notification
router.patch('/clear-all', async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isDismissed: { $ne: true } }, { isDismissed: true, isRead: true });
    res.json({ data: null, message: 'Notifications cleared' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/v1/notifications/:id/dismiss
router.patch('/:id/dismiss', async (req, res) => {
  try {
    const notif = await Notification.findOne({ _id: req.params.id, userId: req.user._id });
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    notif.isDismissed = true;
    await notif.save();
    res.json({ data: formatNotif(notif) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
