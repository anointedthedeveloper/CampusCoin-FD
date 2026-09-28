const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true },
    merchant: { type: String, trim: true },
    occurredAt: { type: Date, required: true },
    source: { type: String, enum: ['manual', 'csv-import', 'recurring', 'ai-suggested'], default: 'manual' },
    // Populated when AI categorization suggests a category name (stored for
    // audit/display even after the user accepts/overrides the suggestion)
    aiSuggestedCategory: { type: String, trim: true },
  },
  { timestamps: true },
);

transactionSchema.index({ userId: 1, occurredAt: -1 });
transactionSchema.index({ userId: 1, categoryId: 1 });
transactionSchema.index({ userId: 1, type: 1, occurredAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
