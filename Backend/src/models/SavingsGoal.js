const mongoose = require('mongoose');

const COLORS = ['teal', 'brand', 'purple', 'amber', 'rose', 'blue', 'orange', 'indigo'];
const ICONS = ['piggy-bank', 'home', 'plane', 'car', 'graduation-cap', 'laptop', 'heart', 'star', 'shield', 'zap'];

// A named savings target (emergency fund, laptop, trip…) with progress the
// student adds to or withdraws from.
const savingsGoalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 300 },
    targetAmount: { type: Number, required: true, min: 1, max: 1e12 },
    savedAmount: { type: Number, default: 0, min: 0, max: 1e12 },
    targetDate: { type: Date, default: null },
    color: { type: String, enum: COLORS, default: 'teal' },
    icon: { type: String, enum: ICONS, default: 'piggy-bank' },
    celebratedMilestones: { type: [Number], default: [] },
  },
  { timestamps: true },
);

savingsGoalSchema.statics.COLORS = COLORS;
savingsGoalSchema.statics.ICONS = ICONS;

savingsGoalSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    name: this.name,
    description: this.description || undefined,
    targetAmount: this.targetAmount,
    savedAmount: this.savedAmount,
    targetDate: this.targetDate ? this.targetDate.toISOString().slice(0, 10) : undefined,
    color: this.color,
    icon: this.icon,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    celebratedMilestones: this.celebratedMilestones || [],
  };
};

module.exports = mongoose.model('SavingsGoal', savingsGoalSchema);
