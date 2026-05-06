// ────────────────────────────────────────────────────────────────────────────────
// Server-Sent Events (SSE) bus for real-time updates.
// Each connected user holds one or more `res` (response) objects in `clients`.
// Routes call `broadcast(event, data, [userIds])` to push events to clients.
// ────────────────────────────────────────────────────────────────────────────────

const clients = new Map(); // userId -> Set<res>

function addClient(userId, res) {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId).add(res);
}

function removeClient(userId, res) {
  const set = clients.get(userId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) clients.delete(userId);
}

function writeEvent(res, event, data) {
  try {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch {
    /* client disconnected */
  }
}

/**
 * Push an event to one or more users (or all if userIds is null/undefined).
 * @param {string} event - event name (e.g. 'message:new', 'announcement:new')
 * @param {any} data - JSON-serialisable payload
 * @param {string[]|null} userIds - target user IDs, or null to broadcast to everyone
 */
function broadcast(event, data, userIds = null) {
  if (userIds === null || userIds === undefined) {
    for (const set of clients.values()) {
      for (const res of set) writeEvent(res, event, data);
    }
    return;
  }
  for (const uid of userIds) {
    const set = clients.get(uid);
    if (!set) continue;
    for (const res of set) writeEvent(res, event, data);
  }
}

function getOnlineUserIds() {
  return Array.from(clients.keys());
}

module.exports = { addClient, removeClient, broadcast, getOnlineUserIds };
