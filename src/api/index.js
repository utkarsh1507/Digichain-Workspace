function normalizeApiBase(value) {
  if (!value) return '/api';

  const trimmed = value.trim().replace(/\/+$/, '');
  if (trimmed === '/api' || trimmed.endsWith('/api')) return trimmed;

  return `${trimmed}/api`;
}

const DEFAULT_PROD_API_URL = 'https://digichain-workspace.onrender.com/api';
const BASE = normalizeApiBase(
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? DEFAULT_PROD_API_URL : '/api')
);

function getToken() {
  return localStorage.getItem('dw_token');
}

async function req(method, path, body, isFormData = false) {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  if (!res.ok) {
    let msg = 'Request failed';
    try { const j = await res.json(); msg = j.error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email, password) => req('POST', '/auth/login', { email, password }),
  me: () => req('GET', '/auth/me'),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: () => req('GET', '/users'),
  get: (id) => req('GET', `/users/${id}`),
  create: (data) => req('POST', '/users', data),
  update: (id, data) => req('PATCH', `/users/${id}`, data),
  remove: (id) => req('DELETE', `/users/${id}`),
  uploadAvatar: (id, file) => {
    const fd = new FormData();
    fd.append('avatar', file);
    return req('POST', `/users/${id}/avatar`, fd, true);
  },
};

// ── Attendance ────────────────────────────────────────────────────────────────
export const attendanceApi = {
  list: () => req('GET', '/attendance'),
  today: () => req('GET', '/attendance/today'),
  signIn: (location) => req('POST', '/attendance/signin', { location }),
  signOut: () => req('POST', '/attendance/signout'),
};

// ── Leaves ────────────────────────────────────────────────────────────────────
export const leavesApi = {
  list: () => req('GET', '/leaves'),
  apply: (data) => req('POST', '/leaves', data),
  update: (id, status) => req('PATCH', `/leaves/${id}`, { status }),
  remove: (id) => req('DELETE', `/leaves/${id}`),
};

// ── Tasks ─────────────────────────────────────────────────────────────────────
export const tasksApi = {
  list: () => req('GET', '/tasks'),
  create: (data) => req('POST', '/tasks', data),
  update: (id, data) => req('PATCH', `/tasks/${id}`, data),
  remove: (id) => req('DELETE', `/tasks/${id}`),
  addComment: (id, text) => req('POST', `/tasks/${id}/comments`, { text }),
};

// ── Messages / Channels ───────────────────────────────────────────────────────
export const messagesApi = {
  listChannels: () => req('GET', '/channels'),
  createChannel: (data) => req('POST', '/channels', data),
  // Returns { messages, seenBy }
  getMessages: (channelId) => req('GET', `/channels/${channelId}/messages`),
  sendMessage: (channelId, text) => req('POST', `/channels/${channelId}/messages`, { text }),
  uploadFile: (channelId, file, text) => {
    const fd = new FormData();
    fd.append('file', file);
    if (text) fd.append('text', text);
    return req('POST', `/channels/${channelId}/upload`, fd, true);
  },
  react: (channelId, messageId, emoji) => req('POST', `/channels/${channelId}/react`, { messageId, emoji }),
  ensureDm: (otherUserId) => req('POST', '/dm/ensure', { otherUserId }),
  // Unread / read receipts
  getUnread: () => req('GET', '/channels/unread'),
  markRead: (channelId) => req('POST', `/channels/${channelId}/read`),
  // Typing
  setTyping: (channelId, name) => req('POST', `/channels/${channelId}/typing`, { name }),
  getTyping: (channelId) => req('GET', `/channels/${channelId}/typing`),
};

// ── Announcements ─────────────────────────────────────────────────────────────
export const announcementsApi = {
  list: () => req('GET', '/announcements'),
  create: (data) => req('POST', '/announcements', data),
  update: (id, data) => req('PATCH', `/announcements/${id}`, data),
  remove: (id) => req('DELETE', `/announcements/${id}`),
  react: (id, emoji) => req('POST', `/announcements/${id}/react`, { emoji }),
};

// ── Documents ─────────────────────────────────────────────────────────────────
export const documentsApi = {
  list: () => req('GET', '/documents'),
  upload: (file, folder, description) => {
    const fd = new FormData();
    fd.append('file', file);
    if (folder) fd.append('folder', folder);
    if (description) fd.append('description', description);
    return req('POST', '/documents/upload', fd, true);
  },
  remove: (id) => req('DELETE', `/documents/${id}`),
};

// ── Meetings ──────────────────────────────────────────────────────────────────
export const meetingsApi = {
  list: () => req('GET', '/meetings'),
  create: (data) => req('POST', '/meetings', data),
  update: (id, data) => req('PATCH', `/meetings/${id}`, data),
  remove: (id) => req('DELETE', `/meetings/${id}`),
};
