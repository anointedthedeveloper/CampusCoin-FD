const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    // Format: YYYY-MM  e.g. "2026-09"
    month: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    limitAmount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

// One budget per user+category+month
budgetSchema.index({ userId: 1, categoryId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
