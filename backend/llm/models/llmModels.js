import mongoose from 'mongoose';

// ── Conversations / runs (existing) ──────────────────────────────────────────

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
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'LlmWorkspace', default: null },
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
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'LlmWorkspace', default: null },
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

// ── Platform: workspace / connection / schema / semantic model ───────────────

const llmWorkspaceSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, default: 'default' },
  name: { type: String, default: 'My Intelligence Workspace' },
  activeSemanticModelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LlmSemanticModel',
    default: null,
  },
  settings: {
    timezone: { type: String, default: 'Asia/Kolkata' },
    currency: { type: String, default: 'INR' },
    locale: { type: String, default: 'en-IN' },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

/**
 * Connection: for self uses existing app Mongo. URI never returned to client.
 * External URI stored only as encrypted blob when LLM_SECRET is set.
 */
const llmConnectionSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LlmWorkspace',
    required: true,
    index: true,
  },
  name: { type: String, default: 'Primary' },
  mode: {
    type: String,
    enum: ['self', 'mongodb_uri'],
    default: 'self',
  },
  /** host-only metadata for UI */
  meta: {
    host: { type: String, default: '' },
    dbName: { type: String, default: '' },
    collectionsCount: { type: Number, default: 0 },
  },
  /** encrypted connection string (external only) — never send to browser */
  encryptedUri: { type: String, default: null },
  status: {
    type: String,
    enum: ['draft', 'connected', 'error'],
    default: 'draft',
  },
  lastError: { type: String, default: null },
  lastDiscoveredAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const fieldSchema = new mongoose.Schema(
  {
    path: String,
    type: String,
    sampleValues: [mongoose.Schema.Types.Mixed],
    nullRate: Number,
    isId: Boolean,
    isForeignKey: Boolean,
    isGeo: Boolean,
    isDate: Boolean,
    isNumeric: Boolean,
    isMoneyLike: Boolean,
    isStatusLike: Boolean,
  },
  { _id: false }
);

const collectionSchema = new mongoose.Schema(
  {
    name: String,
    estimatedCount: Number,
    sampleSize: Number,
    fields: [fieldSchema],
    sampleDocs: [mongoose.Schema.Types.Mixed],
  },
  { _id: false }
);

const llmSchemaSnapshotSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LlmWorkspace',
    required: true,
    index: true,
  },
  connectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LlmConnection',
    default: null,
  },
  version: { type: Number, default: 1 },
  collections: [collectionSchema],
  relationships: [
    {
      fromCollection: String,
      fromField: String,
      toCollection: String,
      toField: String,
      confidence: Number,
      confirmed: { type: Boolean, default: false },
    },
  ],
  discoveredAt: { type: Date, default: Date.now },
});

const semanticEntitySchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    collectionName: String,
    description: String,
    primaryKey: { type: String, default: '_id' },
    labelField: String,
    role: {
      type: String,
      enum: [
        'customer',
        'order',
        'product',
        'line_item',
        'payment',
        'event',
        'location',
        'other',
      ],
      default: 'other',
    },
    confirmed: { type: Boolean, default: false },
  },
  { _id: false }
);

const semanticMetricSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    description: String,
    aggregation: {
      type: String,
      enum: ['count', 'count_distinct', 'sum', 'avg', 'min', 'max'],
      default: 'count',
    },
    entity: String,
    field: String,
    filters: [mongoose.Schema.Types.Mixed],
    confirmed: { type: Boolean, default: false },
  },
  { _id: false }
);

const semanticDimensionSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    entity: String,
    field: String,
    type: {
      type: String,
      enum: ['categorical', 'date', 'geo', 'boolean', 'numeric'],
      default: 'categorical',
    },
    confirmed: { type: Boolean, default: false },
  },
  { _id: false }
);

const llmSemanticModelSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LlmWorkspace',
    required: true,
    index: true,
  },
  schemaSnapshotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LlmSchemaSnapshot',
    default: null,
  },
  version: { type: Number, default: 1 },
  name: { type: String, default: 'Business brain' },
  status: {
    type: String,
    enum: ['draft', 'active', 'archived'],
    default: 'draft',
  },
  entities: [semanticEntitySchema],
  metrics: [semanticMetricSchema],
  dimensions: [semanticDimensionSchema],
  relationships: [
    {
      fromEntity: String,
      toEntity: String,
      fromField: String,
      toField: String,
      confirmed: { type: Boolean, default: false },
    },
  ],
  glossary: [
    {
      term: String,
      definition: String,
    },
  ],
  /** User feedback from training Q&A */
  trainingHints: [
    {
      question: String,
      answer: String,
      createdAt: { type: Date, default: Date.now },
    },
  ],
  businessContext: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const LlmConversation =
  mongoose.models.LlmConversation ||
  mongoose.model('LlmConversation', llmConversationSchema);

export const LlmAgentRun =
  mongoose.models.LlmAgentRun || mongoose.model('LlmAgentRun', llmAgentRunSchema);

export const LlmToolExecution =
  mongoose.models.LlmToolExecution ||
  mongoose.model('LlmToolExecution', llmToolExecutionSchema);

export const LlmWorkspace =
  mongoose.models.LlmWorkspace || mongoose.model('LlmWorkspace', llmWorkspaceSchema);

export const LlmConnection =
  mongoose.models.LlmConnection || mongoose.model('LlmConnection', llmConnectionSchema);

export const LlmSchemaSnapshot =
  mongoose.models.LlmSchemaSnapshot ||
  mongoose.model('LlmSchemaSnapshot', llmSchemaSnapshotSchema);

export const LlmSemanticModel =
  mongoose.models.LlmSemanticModel ||
  mongoose.model('LlmSemanticModel', llmSemanticModelSchema);
