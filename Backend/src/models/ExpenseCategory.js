// Legacy model from an earlier schema with separate expense categories.
// Not imported anywhere in the current code — see Category.js instead.

const mongoose = require('mongoose');

const expenseCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    icon: { type: String },
  },
  { timestamps: true }
);

expenseCategorySchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('ExpenseCategory', expenseCategorySchema);
