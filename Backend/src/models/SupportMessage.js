const mongoose = require('mongoose');

// A message sent from the Help / Contact page, read by admins in the
// Support inbox.
const supportMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    topic: { type: String, trim: true, maxlength: 60, default: 'General' },
    message: { type: String, required: true, maxlength: 4000 },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['open', 'resolved'], default: 'open' },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

supportMessageSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('SupportMessage', supportMessageSchema);
