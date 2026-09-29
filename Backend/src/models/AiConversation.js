const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    text: { type: String, required: true, maxlength: 12000 },
    provider: { type: String },
    model: { type: String },
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
