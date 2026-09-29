const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendNotificationEmail } = require('./email.service');

/**
 * Creates an in-app notification and, when the student has email
 * notifications switched on (Settings → Notifications), emails them a copy.
 * The email is awaited (serverless hosts stop work once the response is
 * sent) but can never make the notification itself fail.
 */
async function createNotification(data, { email = true } = {}) {
  const notification = await Notification.create(data);
  if (email) {
    const user = await User.findById(data.userId).select('email fullName settings isActive').lean();
    if (user?.isActive !== false) await sendNotificationEmail(user, notification);
  }
  return notification;
}

module.exports = { createNotification };
