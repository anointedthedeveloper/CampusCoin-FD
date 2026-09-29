const mongoose = require('mongoose');

// A change the assistant proposed ("add ₦1,500 lunch expense"). Nothing is
// saved until the student approves it; the outcome is kept for the record.
const actionSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ['add_transaction', 'update_transaction', 'delete_transaction', 'set_budget', 'add_savings_goal', 'contribute_goal', 'add_category', 'update_profile'],
      required: true,
    },
    summary: { type: String, required: true, maxlength: 300 },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['pending', 'applied', 'rejected', 'failed'], default: 'pending' },
    error: { type: String, maxlength: 300 },
    result: { type: mongoose.Schema.Types.Mixed },
    decidedAt: { type: Date },
  },
  { _id: true },
);

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    text: { type: String, required: true, maxlength: 12000 },
    provider: { type: String },
    model: { type: String },
    actions: { type: [actionSchema], default: undefined },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

// A student's saved AI Assistant chat, so history follows them across devices.
const aiConversationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, trim: true, maxlength: 80, default: 'New chat' },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true },
);

aiConversationSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('AiConversation', aiConversationSchema);
