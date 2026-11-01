// "Money moves" are the saving-tip templates under another name: this model
// reads and writes the same 'savingtips' collection as SavingTip.js, and
// backs the /money-moves alias route in insights.routes.js.

const mongoose = require('mongoose');

const savingTipSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    category: { type: String, trim: true },
    isAiGenerated: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  'MoneyMove',
  savingTipSchema,
  'savingtips'
);
