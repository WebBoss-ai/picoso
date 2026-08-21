/**
 * In-memory bus for live chatbot UI updates (SSE).
 */
import { EventEmitter } from 'events';

export const chatbotBus = new EventEmitter();
chatbotBus.setMaxListeners(200);

export function emitChatbotEvent(payload) {
  try {
    chatbotBus.emit('chat', payload);
  } catch (err) {
    console.error('[WP Chatbot] emit failed:', err.message);
  }
}
