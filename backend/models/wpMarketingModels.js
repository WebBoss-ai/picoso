import mongoose from 'mongoose';

/* ── WpClient ──────────────────────────────────────────────────────────────
   One record per client/workspace. Each has a unique PIN for access.
   Designed so future clients can be added with their own PIN + workspace.
────────────────────────────────────────────────────────────────────────── */
const wpClientSchema = new mongoose.Schema({
  slug:   { type: String, required: true, unique: true },
  name:   { type: String, required: true },
  pin:    { type: String, required: true },
  active: { type: Boolean, default: true },
  workspace: {
    businessName: { type: String, default: '' },
    businessType: { type: String, default: '' },
    industry:     { type: String, default: '' },
    timezone:     { type: String, default: 'Asia/Kolkata' },
  },
  createdAt: { type: Date, default: Date.now },
});

/* ── WpContactList ─────────────────────────────────────────────────────────
   A named list of contacts belonging to a client. Contacts carry optional
   enrichment data (order count, spend, last order) pulled from Picoso orders.
────────────────────────────────────────────────────────────────────────── */
const wpContactSchema = new mongoose.Schema({
  name:          { type: String, default: '' },
  phone:         { type: String, required: true },
  email:         { type: String, default: '' },
  tags:          [{ type: String }],
  notes:         { type: String, default: '' },
  customFields:  { type: mongoose.Schema.Types.Mixed, default: {} },
  orderCount:    { type: Number, default: 0 },
  totalSpend:    { type: Number, default: 0 },
  lastOrderDate: { type: Date, default: null },
}, { _id: true });

const wpContactListSchema = new mongoose.Schema({
  clientId:    { type: mongoose.Schema.Types.ObjectId, ref: 'WpClient', required: true },
  name:        { type: String, required: true },
  description: { type: String, default: '' },
  contacts:    [wpContactSchema],
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now },
});

/* ── WpCampaignDraft ───────────────────────────────────────────────────────
   Holds a campaign as it moves through the creation flow. The `aiStrategy`
   field is populated once the user completes Step 2 and AI analysis runs.
────────────────────────────────────────────────────────────────────────── */
const campaignStrategySchema = new mongoose.Schema({
  objective:         String,
  audience:          String,
  tone:              String,
  keyMessages:       [String],
  callToAction:      String,
  timing:            String,
  suggestedTemplate: String,
  reasoning:         String,
}, { _id: false });

const wpCampaignDraftSchema = new mongoose.Schema({
  clientId:      { type: mongoose.Schema.Types.ObjectId, ref: 'WpClient', required: true },
  name:          { type: String, default: 'Untitled Campaign' },
  status: {
    type: String,
    enum: ['draft', 'strategy_ready', 'scheduled', 'running', 'completed', 'paused'],
    default: 'draft',
  },
  contactListId: { type: mongoose.Schema.Types.ObjectId, ref: 'WpContactList', default: null },
  context:       { type: String, default: '' },
  aiStrategy:    { type: campaignStrategySchema, default: null },
  createdAt:     { type: Date, default: Date.now },
  updatedAt:     { type: Date, default: Date.now },
});

export const WpClient = mongoose.models.WpClient || mongoose.model('WpClient', wpClientSchema);
export const WpContactList = mongoose.models.WpContactList || mongoose.model('WpContactList', wpContactListSchema);
export const WpCampaignDraft = mongoose.models.WpCampaignDraft || mongoose.model('WpCampaignDraft', wpCampaignDraftSchema);
