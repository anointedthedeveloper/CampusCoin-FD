const mongoose = require('mongoose');

// Per-student state for a saving tip: dismissed and/or pinned (bookmarked).
// tipKey is a string so it can address both admin tip templates
// ("template:<id>") and personalised tips ("personal:<rule>:<detail>").
const tipStateSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tipKey: { type: String, required: true, maxlength: 200 },
    dismissed: { type: Boolean, default: false },
    pinned: { type: Boolean, default: false },
    // Snapshot so a pinned personalised tip still shows after the month moves on.
    title: { type: String },
    body: { type: String },
    category: { type: String },
  },
  { timestamps: true },
);

tipStateSchema.index({ userId: 1, tipKey: 1 }, { unique: true });

module.exports = mongoose.model('TipState', tipStateSchema);
