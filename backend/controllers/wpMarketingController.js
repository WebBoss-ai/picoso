/**
 * WP Marketing controller — multi-client PIN auth, contact lists, campaign drafts,
 * and AI-powered campaign strategy generation via Cohere.
 */
import { WpContactList, WpCampaignDraft, WpExperiment, WpTrackingLink, WpMessageLog } from '../models/wpMarketingModels.js';
import crypto from 'crypto';
import { CohereProvider } from '../llm/provider/cohere.js';

/* ── Auth ping ─────────────────────────────────────────────────────────────── */
export const verifyPin = (req, res) => {
  const c = req.wpClient;
  res.json({
    success: true,
    client: { id: c._id, name: c.name, slug: c.slug, workspace: c.workspace },
  });
};

/* ── Overview stats ────────────────────────────────────────────────────────── */
export const getOverview = async (req, res) => {
  try {
    const clientId = req.wpClient._id;
    const [listDocs, totalCampaigns, recentCampaigns] = await Promise.all([
      WpContactList.find({ clientId }, 'name contacts').lean(),
      WpCampaignDraft.countDocuments({ clientId }),
      WpCampaignDraft.find({ clientId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('contactListId', 'name')
        .lean(),
    ]);

    const totalLists = listDocs.length;
    const totalContacts = listDocs.reduce((sum, l) => sum + (l.contacts?.length || 0), 0);
    const activeCampaigns = await WpCampaignDraft.countDocuments({ clientId, status: 'running' });

    res.json({ totalLists, totalContacts, totalCampaigns, activeCampaigns, recentCampaigns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── Contact Lists ─────────────────────────────────────────────────────────── */
export const getContactLists = async (req, res) => {
  try {
    const lists = await WpContactList.find({ clientId: req.wpClient._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(lists.map(l => ({ ...l, contactCount: l.contacts?.length || 0 })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createContactList = async (req, res) => {
  try {
    const { name, description, contacts = [] } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'List name is required' });

    const list = await WpContactList.create({
      clientId: req.wpClient._id,
      name: name.trim(),
      description: description?.trim() || '',
      contacts,
    });
    const obj = list.toObject();
    res.json({ success: true, list: { ...obj, contactCount: obj.contacts?.length || 0 } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getContactList = async (req, res) => {
  try {
    const list = await WpContactList.findOne({
      _id: req.params.id,
      clientId: req.wpClient._id,
    }).lean();
    if (!list) return res.status(404).json({ error: 'Contact list not found' });
    res.json({ ...list, contactCount: list.contacts?.length || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteContactList = async (req, res) => {
  try {
    await WpContactList.deleteOne({ _id: req.params.id, clientId: req.wpClient._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const addContactsToList = async (req, res) => {
  try {
    const { contacts = [] } = req.body;
    const list = await WpContactList.findOne({ _id: req.params.id, clientId: req.wpClient._id });
    if (!list) return res.status(404).json({ error: 'Not found' });
    list.contacts.push(...contacts);
    list.updatedAt = new Date();
    await list.save();
    res.json({ success: true, contactCount: list.contacts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── Campaigns ─────────────────────────────────────────────────────────────── */
export const getCampaigns = async (req, res) => {
  try {
    const campaigns = await WpCampaignDraft.find({ clientId: req.wpClient._id })
      .sort({ createdAt: -1 })
      .populate('contactListId', 'name')
      .lean();
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createCampaign = async (req, res) => {
  try {
    const { name, contactListId, context } = req.body;
    const campaign = await WpCampaignDraft.create({
      clientId: req.wpClient._id,
      name: name?.trim() || 'Untitled Campaign',
      contactListId: contactListId || null,
      context: context?.trim() || '',
    });
    res.json({ success: true, campaign });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateCampaign = async (req, res) => {
  try {
    const { name, contactListId, context, status } = req.body;
    const update = { updatedAt: new Date() };
    if (name !== undefined) update.name = name;
    if (contactListId !== undefined) update.contactListId = contactListId;
    if (context !== undefined) update.context = context;
    if (status !== undefined) update.status = status;

    const campaign = await WpCampaignDraft.findOneAndUpdate(
      { _id: req.params.id, clientId: req.wpClient._id },
      update,
      { new: true }
    ).populate('contactListId', 'name');

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json({ success: true, campaign });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteCampaign = async (req, res) => {
  try {
    await WpCampaignDraft.deleteOne({ _id: req.params.id, clientId: req.wpClient._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── Phase 2: Generate Full Experiment Plan ───────────────────────────────── */

const VARIANT_LABELS = ['A','B','C','D','E','F','G','H','I','J'];
const COPY_ANGLES = [
  'Urgency + Time-Limited Offer',
  'Personal Recognition + Gratitude',
  'Exclusive Member Benefit',
  'Social Proof + Community',
  'Curiosity + Intrigue',
  'Clear Benefit-Led',
  'Emotional + Nostalgia',
  'Casual + Friendly',
  'Direct + No-Nonsense',
  'FOMO + Scarcity',
];

function generateShortCode() {
  return crypto.randomBytes(5).toString('hex'); // 10-char hex
}

function scheduleDates(startDate, count, gapDays) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i * gapDays);
    d.setHours(11, 0, 0, 0); // 11 AM IST default
    return d;
  });
}

export const generatePlan = async (req, res) => {
  try {
    const campaign = await WpCampaignDraft.findOne({
      _id: req.params.id,
      clientId: req.wpClient._id,
    }).populate('contactListId');

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (!campaign.context?.trim()) return res.status(400).json({ error: 'Campaign context is required' });

    const list = campaign.contactListId;
    if (!list) return res.status(400).json({ error: 'Contact list required — complete Step 1 first' });

    const contactCount = list.contacts?.length || 0;
    const sampleLines = (list.contacts || []).slice(0, 8).map((c) =>
      `- ${c.name || 'Customer'}: ${c.orderCount || 0} orders, ₹${c.totalSpend || 0} total spend, tags: ${(c.tags || []).join(', ') || 'none'}`
    ).join('\n');

    // Remove stale plan if one exists
    await WpExperiment.deleteOne({ campaignId: campaign._id, clientId: req.wpClient._id });

    const llm = new CohereProvider({ maxTokens: 4096, timeoutMs: 90000 });

    const systemPrompt = `You are a top-tier WhatsApp marketing strategist specialising in multivariate experiments. Generate a complete 10-variant experiment plan.

STRICT RULES:
- Exactly 10 variants, labels "Variant A" through "Variant J"
- Each variant uses a genuinely different psychological/creative angle — NOT just rewording
- WhatsApp messages: 2-4 sentences max, conversational, include relevant emojis, use {{name}} personalisation
- Each variant has a meaningfully different offer, tone, and creative angle
- Return ONLY valid JSON with no markdown fences, no text outside the JSON object

JSON schema to return:
{
  "experimentTitle": "concise descriptive title",
  "objective": "one sentence campaign objective",
  "reasoning": "2-3 sentences on the experiment strategy and why 10 variants covers the angle space",
  "optimizationCriteria": {
    "primaryMetric": "conversions",
    "signals": ["delivery_rate","read_rate","link_click_rate","unique_clicks","repeat_clicks","replies","conversions","revenue"],
    "progressionLogic": "explain exactly how 10→5→3→1 will be decided using these signals in this context"
  },
  "trackingExplanation": "1-2 sentences on unique per-customer tracking links",
  "variants": [
    {
      "variantNumber": 1,
      "label": "Variant A",
      "copyAngle": "Urgency + Time-Limited Offer",
      "tone": "Urgent & Direct",
      "offer": "specific offer text shown in this variant",
      "cta": "primary call-to-action button text",
      "imageConceptDescription": "detailed description of the visual/creative for this variant",
      "message": "complete WhatsApp message with {{name}} and emojis"
    }
  ]
}

Use these 10 copy angles in order (adapt each to the actual context):
A - Urgency + Time-Limited Offer
B - Personal Recognition + Gratitude
C - Exclusive Member Benefit
D - Social Proof + Community
E - Curiosity + Intrigue
F - Clear Benefit-Led
G - Emotional + Nostalgia
H - Casual + Friendly (sounds like a friend, not a brand)
I - Direct + No-Nonsense (pure value, zero fluff)
J - FOMO + Scarcity`;

    const userMessage = `Business: ${req.wpClient.workspace?.businessName || req.wpClient.name} (${req.wpClient.workspace?.businessType || req.wpClient.workspace?.industry || 'business'})

Campaign context: "${campaign.context}"

Contact list: "${list.name}" — ${contactCount} contacts
${sampleLines || 'No sample data available'}

Generate all 10 variants now. Make each genuinely distinct.`;

    const result = await llm.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
    });

    let aiPlan;
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      aiPlan = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(result.text);
    } catch {
      return res.status(500).json({ error: 'AI returned a malformed response — please try generating again.' });
    }

    const variants = (aiPlan.variants || []).slice(0, 10);
    if (variants.length < 10) {
      return res.status(500).json({ error: `AI only generated ${variants.length} variants — please try again.` });
    }

    // Build phase schedule based on actual contact list size
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 1);

    const perVariantP1 = Math.max(1, Math.floor(contactCount / 10));
    const perVariantP2 = Math.max(1, Math.floor(contactCount / 5));
    const perVariantP3 = Math.max(1, Math.floor(contactCount / 3));

    const phases = [
      { phaseNumber: 1, label: 'Phase 1: 10 Variants', variantCount: 10, contactsPerVariant: perVariantP1, totalContacts: perVariantP1 * 10, rounds: 3, daySpread: 6, scheduledDates: scheduleDates(baseDate, 3, 2), status: 'pending' },
      { phaseNumber: 2, label: 'Phase 2: Top 5',        variantCount: 5,  contactsPerVariant: perVariantP2, totalContacts: perVariantP2 * 5,  rounds: 3, daySpread: 6, scheduledDates: scheduleDates(new Date(baseDate.getTime() + 7 * 86400000), 3, 2), status: 'pending' },
      { phaseNumber: 3, label: 'Phase 3: Top 3',        variantCount: 3,  contactsPerVariant: perVariantP3, totalContacts: perVariantP3 * 3,  rounds: 3, daySpread: 6, scheduledDates: scheduleDates(new Date(baseDate.getTime() + 14 * 86400000), 3, 2), status: 'pending' },
      { phaseNumber: 4, label: 'Final: Winner',         variantCount: 1,  contactsPerVariant: contactCount, totalContacts: contactCount, rounds: 1, daySpread: 1, scheduledDates: [new Date(baseDate.getTime() + 21 * 86400000)], status: 'pending' },
    ];

    const experiment = await WpExperiment.create({
      clientId: req.wpClient._id,
      campaignId: campaign._id,
      contactListId: list._id,
      context: campaign.context,
      status: 'awaiting_approval',
      plan: {
        totalAudience: contactCount,
        experimentTitle: aiPlan.experimentTitle || campaign.name,
        objective: aiPlan.objective || '',
        reasoning: aiPlan.reasoning || '',
        trackingEnabled: true,
        trackingExplanation: aiPlan.trackingExplanation || '',
        phases,
        optimizationCriteria: aiPlan.optimizationCriteria || {
          primaryMetric: 'conversions',
          signals: ['delivery_rate','read_rate','link_click_rate','unique_clicks','repeat_clicks','replies','conversions','revenue'],
          progressionLogic: 'Top performers by conversion rate advance; revenue weighted 2×.',
        },
      },
      variants: variants.map((v, i) => ({
        variantNumber: v.variantNumber || (i + 1),
        label: v.label || `Variant ${VARIANT_LABELS[i]}`,
        copyAngle: v.copyAngle || COPY_ANGLES[i],
        tone: v.tone || '',
        offer: v.offer || '',
        cta: v.cta || '',
        imageConceptDescription: v.imageConceptDescription || '',
        message: v.message || '',
        status: 'active',
      })),
    });

    // Update campaign status
    await WpCampaignDraft.findByIdAndUpdate(campaign._id, { status: 'strategy_ready', updatedAt: new Date() });

    res.json({ success: true, experiment });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Plan generation failed' });
  }
};

export const getPlan = async (req, res) => {
  try {
    const experiment = await WpExperiment.findOne({
      campaignId: req.params.id,
      clientId: req.wpClient._id,
    });
    if (!experiment) return res.status(404).json({ error: 'No plan found for this campaign' });
    res.json(experiment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const approvePlan = async (req, res) => {
  try {
    const experiment = await WpExperiment.findOne({
      campaignId: req.params.id,
      clientId: req.wpClient._id,
    });
    if (!experiment) return res.status(404).json({ error: 'Plan not found' });
    if (experiment.status !== 'awaiting_approval') {
      return res.status(400).json({ error: `Plan is already ${experiment.status}` });
    }

    // Recalculate confirmed schedule from today
    const base = new Date();
    base.setDate(base.getDate() + 1);
    base.setHours(11, 0, 0, 0);

    const offsets = [[1,3,5], [8,10,12], [15,17,19], [22]];
    experiment.plan.phases = experiment.plan.phases.map((ph, i) => {
      const days = offsets[i] || [22 + i];
      return {
        ...ph.toObject(),
        scheduledDates: days.map((d) => {
          const date = new Date(base);
          date.setDate(base.getDate() + d - 1);
          return date;
        }),
        status: 'pending',
      };
    });

    experiment.status = 'approved';
    experiment.approvedAt = new Date();
    experiment.updatedAt = new Date();
    await experiment.save();

    await WpCampaignDraft.findByIdAndUpdate(experiment.campaignId, {
      status: 'scheduled',
      updatedAt: new Date(),
    });

    res.json({ success: true, experiment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ── Tracking Link — public (no PIN) ─────────────────────────────────────── */
export const createTrackingLink = async (req, res) => {
  try {
    const { experimentId, variantNumber, contactPhone, contactName, originalUrl } = req.body;
    if (!originalUrl) return res.status(400).json({ error: 'originalUrl required' });

    let shortCode;
    let attempts = 0;
    do {
      shortCode = generateShortCode();
      attempts++;
    } while (await WpTrackingLink.exists({ shortCode }) && attempts < 10);

    const link = await WpTrackingLink.create({
      shortCode,
      clientId: req.wpClient._id,
      experimentId: experimentId || null,
      variantNumber: variantNumber || null,
      contactPhone: contactPhone || '',
      contactName: contactName || '',
      originalUrl,
    });

    const baseUrl = process.env.API_PUBLIC_URL || 'https://picoso.in/api';
    res.json({ success: true, shortCode, trackingUrl: `${baseUrl}/t/${shortCode}`, link });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const handleTrackClick = async (req, res) => {
  try {
    const link = await WpTrackingLink.findOne({ shortCode: req.params.code });
    if (!link) return res.redirect(302, 'https://picoso.in');

    const isRepeat = link.clicks.length > 0;
    link.clicks.push({
      clickedAt: new Date(),
      isRepeat,
      userAgent: req.headers['user-agent'] || '',
      ip: req.ip || '',
    });
    await link.save();

    // Sync click to message log
    const logUpdate = {
      clicked: true,
      $inc: { totalClicks: 1 },
      ...(isRepeat ? {} : { firstClickAt: new Date() }),
    };
    await WpMessageLog.findOneAndUpdate(
      { trackingShortCode: link.shortCode },
      logUpdate,
    );

    if (link.experimentId && link.variantNumber != null) {
      await WpExperiment.updateOne(
        { _id: link.experimentId, 'variants.variantNumber': link.variantNumber },
        {
          $inc: {
            'variants.$.metrics.linkClicks': 1,
            ...(isRepeat ? { 'variants.$.metrics.repeatClicks': 1 } : { 'variants.$.metrics.uniqueLinkClicks': 1 }),
          },
        }
      );
    }

    res.redirect(302, link.originalUrl);
  } catch (err) {
    res.redirect(302, 'https://picoso.in');
  }
};

/* ── AI Campaign Strategy Analysis ────────────────────────────────────────── */
export const analyzeCampaign = async (req, res) => {
  try {
    const { context, listName, contactCount = 0, sampleContacts = [], campaignId } = req.body;
    if (!context?.trim()) return res.status(400).json({ error: 'Context is required' });

    const llm = new CohereProvider({ maxTokens: 1024, timeoutMs: 45000 });

    const systemPrompt = `You are an expert WhatsApp marketing strategist. Analyze the campaign context and contact data provided, then return a precise, actionable campaign strategy as a raw JSON object. No markdown, no commentary — only valid JSON.

Schema:
{
  "objective": "One crisp sentence describing the campaign goal",
  "audience": "Who this audience is and what drives them",
  "tone": "The messaging tone (e.g. Warm & personal, Urgent, Celebratory, Informational)",
  "keyMessages": ["3-4 specific message points tailored to this audience"],
  "callToAction": "The single primary CTA",
  "timing": "Best day and time window to send (e.g. Tuesday–Thursday, 11 AM–1 PM IST)",
  "suggestedTemplate": "A complete WhatsApp message ready to send, using {{name}} for personalization",
  "reasoning": "2–3 sentences explaining why this strategy fits the context"
}`;

    const enrichedContext = [
      `Campaign context: "${context}"`,
      `Contact list: "${listName || 'Custom list'}" containing ${contactCount} contacts`,
      sampleContacts.length
        ? `Sample contacts data: ${JSON.stringify(sampleContacts.slice(0, 5))}`
        : '',
    ].filter(Boolean).join('\n');

    const result = await llm.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: enrichedContext },
      ],
      temperature: 0.35,
    });

    let strategy;
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      strategy = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(result.text);
    } catch {
      strategy = {
        objective: 'Re-engage existing customers to drive repeat purchases',
        audience: 'Existing customers who have ordered before',
        tone: 'Warm & personal',
        keyMessages: [
          'Personalised greeting using their name',
          'Remind them of what they loved',
          'Exclusive offer or gentle nudge',
          'Easy path to re-order',
        ],
        callToAction: 'Order now and enjoy a special deal',
        timing: 'Tuesday–Thursday, 11 AM–1 PM IST',
        suggestedTemplate: `Hi {{name}}, it's been a while — we miss you at Picoso!\n\nCome back for a delicious, healthy meal today.\n\nReply ORDER to get started, or visit picoso.in`,
        reasoning: 'A friendly, personalised message with a clear CTA works best for re-engagement campaigns.',
      };
    }

    if (campaignId) {
      await WpCampaignDraft.findOneAndUpdate(
        { _id: campaignId, clientId: req.wpClient._id },
        { aiStrategy: strategy, status: 'strategy_ready', updatedAt: new Date() },
      );
    }

    res.json({ success: true, strategy });
  } catch (err) {
    res.status(500).json({ error: err.message || 'AI analysis failed' });
  }
};
