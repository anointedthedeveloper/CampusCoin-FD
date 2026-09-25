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
    source: { type: String, enum: ['manual', 'csv-import', 'ai-suggested'], default: 'manual' },
  },
  { timestamps: true },
);

transactionSchema.index({ userId: 1, occurredAt: -1 });
transactionSchema.index({ userId: 1, categoryId: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
