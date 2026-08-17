/**
 * WP Marketing controller — multi-client PIN auth, contact lists, campaign drafts,
 * and AI-powered campaign strategy generation via Cohere.
 */
import { WpContactList, WpCampaignDraft } from '../models/wpMarketingModels.js';
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
        suggestedTemplate: `Hi {{name}}! 👋 It's been a while — we miss you at Picoso!\n\nCome back for a delicious, healthy meal today. 🥗\n\nReply ORDER to get started, or visit picoso.in 🚀`,
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
