// In-memory session store for USSD sessions
// In production, replace with Redis or a database

/** @type {Map<string, {step: string, records: Array, pendingEntry: string}>} */
const sessions = new Map();

const TTL_MS = 10 * 60 * 1000; // 10 minutes

function getSession(sessionId) {
  const s = sessions.get(sessionId);
  if (!s) return null;
  if (Date.now() - s.lastActive > TTL_MS) {
    sessions.delete(sessionId);
    return null;
  }
  s.lastActive = Date.now();
  return s;
}

function createSession(sessionId) {
  const s = { step: "MAIN_MENU", records: [], pendingEntry: "", lastActive: Date.now() };
  sessions.set(sessionId, s);
  return s;
}

function deleteSession(sessionId) {
  sessions.delete(sessionId);
}

module.exports = { getSession, createSession, deleteSession };
