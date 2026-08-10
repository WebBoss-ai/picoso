import mongoose from 'mongoose';

const llmMessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, default: '' },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const llmConversationSchema = new mongoose.Schema({
  summary: { type: String, default: '' },
  messages: [llmMessageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const llmToolExecutionSchema = new mongoose.Schema({
  runId: { type: String, required: true, index: true },
  tool: { type: String, required: true },
  input: { type: mongoose.Schema.Types.Mixed },
  output: { type: mongoose.Schema.Types.Mixed },
  durationMs: { type: Number },
  status: { type: String, enum: ['success', 'error'], default: 'success' },
  error: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

const llmAgentRunSchema = new mongoose.Schema({
  runId: { type: String, required: true, unique: true },
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'LlmConversation', default: null },
  status: {
    type: String,
    enum: [
      'RECEIVED',
      'CLASSIFYING',
      'PLANNING',
      'WAITING_FOR_TOOL',
      'EXECUTING',
      'VALIDATING',
      'ANSWERING',
      'COMPLETED',
      'FAILED',
      'NEEDS_CLARIFICATION',
    ],
    default: 'RECEIVED',
  },
  userMessage: { type: String, default: '' },
  steps: [{ type: mongoose.Schema.Types.Mixed }],
  result: { type: mongoose.Schema.Types.Mixed, default: null },
  tokenUsage: {
    input: { type: Number, default: 0 },
    output: { type: Number, default: 0 },
  },
  durationMs: { type: Number, default: 0 },
  errorList: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
});

export const LlmConversation =
  mongoose.models.LlmConversation ||
  mongoose.model('LlmConversation', llmConversationSchema);

export const LlmAgentRun =
  mongoose.models.LlmAgentRun || mongoose.model('LlmAgentRun', llmAgentRunSchema);

export const LlmToolExecution =
  mongoose.models.LlmToolExecution ||
  mongoose.model('LlmToolExecution', llmToolExecutionSchema);
