const mongoose = require('mongoose');

// A point-in-time copy of one student's data (gzip-compressed JSON), used to
// restore after a mistake. Daily backups are made automatically; students
// can also make one by hand, and one is taken before every restore.
const backupSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, enum: ['daily', 'manual', 'pre-restore'], required: true },
    sizeBytes: { type: Number, default: 0 },
    counts: { type: mongoose.Schema.Types.Mixed, default: {} },
    data: { type: Buffer, required: true },
  },
  { timestamps: true },
);

backupSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Backup', backupSchema);
