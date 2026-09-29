const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    body: { type: String, required: true, maxlength: 5000 },
    audience: { type: String, enum: ['all', 'students', 'admins'], required: true },
    publishedAt: { type: Date, default: null },
    // Set once the announcement has been emailed, so re-publishing after an
    // unpublish never emails everyone twice.
    emailedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Announcement', announcementSchema);
