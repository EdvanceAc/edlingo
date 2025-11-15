// Simple, robust per-session conversation memory using localStorage
// Stores last N messages per session (role: 'user' | 'assistant', content, timestamp)
// Designed for browser runtime; no-ops gracefully if storage unavailable.

const STORAGE_PREFIX = 'edlingo.chat.history.';
// Keep up to 20 messages (~10 turns) per session by default
const DEFAULT_MAX_MESSAGES = 20;

function getStorageKey(sessionId) {
  return `${STORAGE_PREFIX}${sessionId}`;
}

export function loadHistory(sessionId) {
  if (!sessionId) return [];
  try {
    const raw = localStorage.getItem(getStorageKey(sessionId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistory(sessionId, messages, maxMessages = DEFAULT_MAX_MESSAGES) {
  if (!sessionId) return;
  try {
    const trimmed = Array.isArray(messages)
      ? messages.slice(-Math.max(1, maxMessages))
      : [];
    localStorage.setItem(getStorageKey(sessionId), JSON.stringify(trimmed));
  } catch {
    // ignore storage quota or access issues
  }
}

export function addMessage(sessionId, message, maxMessages = DEFAULT_MAX_MESSAGES) {
  if (!sessionId || !message || !message.content) return;
  const existing = loadHistory(sessionId);
  const entry = {
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: String(message.content),
    timestamp: message.timestamp ? new Date(message.timestamp).toISOString() : new Date().toISOString()
  };
  existing.push(entry);
  saveHistory(sessionId, existing, maxMessages);
}

export function getRecentContext(sessionId, limit = DEFAULT_MAX_MESSAGES) {
  const history = loadHistory(sessionId);
  return history.slice(-Math.max(1, limit));
}

export function clearHistory(sessionId) {
  if (!sessionId) return;
  try {
    localStorage.removeItem(getStorageKey(sessionId));
  } catch {
    // ignore
  }
}

export const ConversationMemory = {
  loadHistory,
  saveHistory,
  addMessage,
  getRecentContext,
  clearHistory,
  DEFAULT_MAX_MESSAGES
};


