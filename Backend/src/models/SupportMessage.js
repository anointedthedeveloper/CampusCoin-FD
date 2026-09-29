const mongoose = require('mongoose');

// One reply in a support conversation, from the student or an admin.
const replySchema = new mongoose.Schema(
  {
    from: { type: String, enum: ['user', 'admin'], required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    authorName: { type: String, trim: true, maxlength: 100 },
    text: { type: String, required: true, maxlength: 4000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// A support conversation started from the Help page. The first message is
// stored on the document itself; everything after it lives in `replies`.
// Signed-in students see the whole thread in-app; guests get replies by email.
const supportMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    topic: { type: String, trim: true, maxlength: 60, default: 'General' },
    message: { type: String, required: true, maxlength: 4000 },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['open', 'resolved'], default: 'open' },
    resolvedAt: { type: Date, default: null },
    replies: { type: [replySchema], default: [] },
    // Drive the unread dots: set when the other side writes, cleared when read.
    unreadByUser: { type: Boolean, default: false },
    unreadByAdmin: { type: Boolean, default: true },
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

supportMessageSchema.index({ status: 1, createdAt: -1 });
supportMessageSchema.index({ userId: 1, lastActivityAt: -1 });

module.exports = mongoose.model('SupportMessage', supportMessageSchema);
