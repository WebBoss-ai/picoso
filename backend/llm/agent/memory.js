/**
 * Conversation + continuous learning memory for Intelligence Partner.
 * Stores full chat turns, rolling summary, and episodic query learnings.
 */

import { LlmConversation, LlmMemoryEpisode } from '../models/llmModels.js';

const RECENT_MESSAGES = Number(process.env.LLM_MEMORY_TURNS || 24);
const MAX_STORED_MESSAGES = Number(process.env.LLM_MEMORY_MAX || 200);

export async function getOrCreateConversation(conversationId, workspaceId = null) {
  if (conversationId) {
    const existing = await LlmConversation.findById(conversationId);
    if (existing) return existing;
  }
  return LlmConversation.create({
    messages: [],
    summary: '',
    workspaceId: workspaceId || null,
  });
}

/**
 * Build model-facing history (roles only) for Cohere.
 */
export function buildContextMessages(conversation, userMessage) {
  const history = (conversation.messages || []).slice(-RECENT_MESSAGES);
  const msgs = [];

  if (conversation.summary) {
    msgs.push({
      role: 'system',
      content: `Long-term conversation summary (compressed memory):\n${conversation.summary}`,
    });
  }

  for (const m of history) {
    if (m.role === 'user' || m.role === 'assistant') {
      let content = m.content || '';
      // Attach structured fact of prior assistant answers for continuity
      if (m.role === 'assistant' && m.result?.primaryMetric) {
        content += `\n[prior_metric ${m.result.primaryMetric.id}=${m.result.primaryMetric.value}]`;
      }
      msgs.push({ role: m.role, content });
    }
  }

  msgs.push({ role: 'user', content: userMessage });
  return msgs;
}

export async function appendTurn(conversation, userMessage, assistantContent, result = null) {
  conversation.messages = conversation.messages || [];
  conversation.messages.push({
    role: 'user',
    content: String(userMessage || '').slice(0, 8000),
    createdAt: new Date(),
  });
  conversation.messages.push({
    role: 'assistant',
    content: String(assistantContent || '').slice(0, 8000),
    result: result || null,
    createdAt: new Date(),
  });

  if (conversation.messages.length > MAX_STORED_MESSAGES) {
    // Compress older turns into summary before drop
    const dropped = conversation.messages.slice(
      0,
      conversation.messages.length - MAX_STORED_MESSAGES
    );
    const bits = dropped
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-12)
      .map((m) => `${m.role}: ${(m.content || '').slice(0, 80)}`)
      .join(' | ');
    conversation.summary = [conversation.summary, `Earlier: ${bits}`]
      .filter(Boolean)
      .join('\n')
      .slice(0, 4000);
    conversation.messages = conversation.messages.slice(-MAX_STORED_MESSAGES);
  }

  conversation.updatedAt = new Date();

  // Rolling summary from last Q/A
  const lastUser = String(userMessage || '').slice(0, 200);
  const lastAsst = String(assistantContent || '').slice(0, 240);
  const metricBit = result?.primaryMetric
    ? ` · metric ${result.primaryMetric.id}=${result.primaryMetric.value}`
    : '';
  conversation.summary = [
    conversation.summary,
    `Q: ${lastUser} → A: ${lastAsst}${metricBit}`,
  ]
    .filter(Boolean)
    .join('\n')
    .slice(-3500);

  await conversation.save();
  return conversation;
}

/**
 * Persist a successful analytics episode so future prompts can reuse learned mappings.
 */
export async function learnEpisode({
  workspaceId,
  conversationId,
  userMessage,
  answer,
  toolsUsed = [],
} = {}) {
  if (!userMessage || !answer) return null;
  try {
    const primary = answer.primaryMetric;
    const episode = await LlmMemoryEpisode.create({
      workspaceId: workspaceId || null,
      conversationId: conversationId || null,
      question: String(userMessage).slice(0, 500),
      toolsUsed: toolsUsed.slice(0, 12),
      metricId: primary?.id || null,
      metricValue: primary?.value ?? null,
      dimensions: answer.dimensions || {},
      sources: answer.sources || [],
      explanation: String(answer.explanation || answer.headline || '').slice(0, 800),
      confidence: answer.confidence?.overall ?? null,
      createdAt: new Date(),
    });
    return episode;
  } catch {
    return null;
  }
}

/**
 * Recent learned episodes for system prompt (continuous learning signal).
 */
export async function loadRecentLearning(workspaceId, limit = 12) {
  try {
    const q = workspaceId ? { workspaceId } : {};
    const rows = await LlmMemoryEpisode.find(q)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return rows.map((r) => ({
      question: r.question,
      tools: r.toolsUsed,
      metric: r.metricId,
      value: r.metricValue,
      dims: r.dimensions,
      when: r.createdAt,
    }));
  } catch {
    return [];
  }
}
