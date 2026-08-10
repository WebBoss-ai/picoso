import { LlmConversation } from '../models/llmModels.js';

const RECENT_MESSAGES = 8;

export async function getOrCreateConversation(conversationId) {
  if (conversationId) {
    const existing = await LlmConversation.findById(conversationId);
    if (existing) return existing;
  }
  return LlmConversation.create({ messages: [], summary: '' });
}

export function buildContextMessages(conversation, userMessage) {
  const history = (conversation.messages || []).slice(-RECENT_MESSAGES);
  const msgs = [];

  if (conversation.summary) {
    msgs.push({
      role: 'system',
      content: `Conversation summary so far:\n${conversation.summary}`,
    });
  }

  for (const m of history) {
    if (m.role === 'user' || m.role === 'assistant') {
      msgs.push({ role: m.role, content: m.content || '' });
    }
  }

  msgs.push({ role: 'user', content: userMessage });
  return msgs;
}

export async function appendTurn(conversation, userMessage, assistantContent, result = null) {
  conversation.messages.push({
    role: 'user',
    content: userMessage,
    createdAt: new Date(),
  });
  conversation.messages.push({
    role: 'assistant',
    content: assistantContent,
    result,
    createdAt: new Date(),
  });
  // Keep only last 40 messages
  if (conversation.messages.length > 40) {
    conversation.messages = conversation.messages.slice(-40);
  }
  conversation.updatedAt = new Date();

  // Lightweight rolling summary
  if (conversation.messages.length >= 6) {
    const lastUser = userMessage.slice(0, 120);
    const lastAsst = (assistantContent || '').slice(0, 160);
    conversation.summary = `Recent: user asked about "${lastUser}". Last answer: ${lastAsst}`;
  }

  await conversation.save();
  return conversation;
}
