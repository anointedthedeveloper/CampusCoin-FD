const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    icon: { type: String },
    color: { type: String },
    // null = system/admin default visible to all users
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Category', categorySchema);
