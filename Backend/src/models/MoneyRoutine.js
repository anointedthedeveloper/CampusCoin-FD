// Mongoose model for a "money routine" — a recurring income or expense (rent,
// allowance, subscriptions) that is turned into a real transaction each time
// it falls due. Stored in the 'recurringtransactions' collection, the same one
// RecurringTransaction.js uses, so the two models share the same documents.

const mongoose = require('mongoose');

const moneyRoutineSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ['income', 'expense'], required: true },
    description: { type: String, trim: true },

    // How often it repeats: every `interval` days/weeks/months/years.
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      required: true,
    },
    interval: { type: Number, default: 1, min: 1 },

    // Scheduling: endDate null = runs forever; nextRunAt is when the next
    // transaction is due to be generated.
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    nextRunAt: { type: Date, required: true },
    lastRunAt: { type: Date, default: null },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

moneyRoutineSchema.index({ user: 1, isActive: 1, nextRunAt: 1 });

module.exports = mongoose.model(
  'MoneyRoutine',
  moneyRoutineSchema,
  'recurringtransactions',
);
