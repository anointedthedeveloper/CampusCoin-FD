// Legacy model from an earlier schema where income had its own collection.
// Not imported anywhere in the current code — income now lives in
// Transaction.js with type 'income'.

const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'IncomeCategory', required: true },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true },
    date: { type: Date, required: true, default: Date.now },
    source: { type: String, trim: true }, // e.g. "Parents", "Campus Cafe job"
    isRecurring: { type: Boolean, default: false },
  },
  { timestamps: true }
);

incomeSchema.index({ user: 1, date: -1 });
incomeSchema.index({ user: 1, category: 1 });

module.exports = mongoose.model('Income', incomeSchema);
