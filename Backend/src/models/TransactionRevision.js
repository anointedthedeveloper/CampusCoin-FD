const mongoose = require('mongoose');

// One change to a transaction — created, edited, deleted or restored — with
// what it looked like before and after. Keeps the full history even after an
// edit or delete, and powers "Recently deleted → Restore".
const transactionRevisionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    transactionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    action: { type: String, enum: ['created', 'updated', 'deleted', 'restored'], required: true },
    via: { type: String, enum: ['app', 'ai', 'import', 'recurring', 'restore'], default: 'app' },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
    restoredAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

transactionRevisionSchema.index({ userId: 1, transactionId: 1, createdAt: -1 });
transactionRevisionSchema.index({ userId: 1, action: 1, createdAt: -1 });

module.exports = mongoose.model('TransactionRevision', transactionRevisionSchema);
