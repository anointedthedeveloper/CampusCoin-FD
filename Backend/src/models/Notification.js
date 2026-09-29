const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      // budget-near: approaching limit (≥80%)
      // budget-exceeded: over limit (≥100%)
      // insight-ready: a new AI/generated insight is available
      // system: general platform message
      // announcement: copy of an admin announcement for this user
      // overspending / allowance-exceeded / goal-reached: monthly limit alerts
      enum: ['budget-near', 'budget-warning', 'budget-exceeded', 'insight-ready', 'system', 'announcement', 'overspending', 'allowance-exceeded', 'goal-reached'],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    severity: {
      type: String,
      enum: ['info', 'medium', 'high'],
      default: 'info',
    },
    isRead: { type: Boolean, default: false },
    isDismissed: { type: Boolean, default: false },
    // Optional structured context (e.g. { budgetId, categoryId, month, percentage })
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, isDismissed: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
