import { API_BASE } from '../api/index.js';

// Derive the server base (strips /api suffix) for redirect URLs
function serverBase() {
  return API_BASE.replace(/\/api$/, '');
}

export async function getGoogleStatus(userId) {
  const res = await fetch(`${API_BASE}/google/status?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) return { configured: false, connected: false };
  return res.json();
}

// Opens the OAuth popup and returns a promise that resolves when the flow completes.
export function openGoogleAuthPopup(userId) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}/google/auth?userId=${encodeURIComponent(userId)}`;
    const popup = window.open(url, 'google-oauth', 'width=520,height=640,left=200,top=100');

    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for this site and try again.'));
      return;
    }

    function onMessage(e) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== 'google-oauth') return;
      cleanup();
      if (e.data.success) resolve();
      else reject(new Error(e.data.error || 'Google auth failed'));
    }

    // Fallback: detect if popup was closed without posting a message
    const timer = setInterval(() => {
      if (popup.closed) {
        cleanup();
        reject(new Error('Google sign-in was cancelled.'));
      }
    }, 500);

    function cleanup() {
      clearInterval(timer);
      window.removeEventListener('message', onMessage);
    }

    window.addEventListener('message', onMessage);
  });
}

// Ensure the user is authenticated with Google.
// Returns true if already connected, opens popup if not.
// Throws if the user cancels or auth fails.
export async function ensureGoogleConnected(userId) {
  const status = await getGoogleStatus(userId);
  if (!status.configured) throw new Error('Google Meet is not configured on the server. Ask your admin to add the Google API credentials.');
  if (status.connected) return true;
  await openGoogleAuthPopup(userId);
  return true;
}

// Create a Google Meet via the server (creates a Google Calendar event).
// Returns { meetLink, eventId }
export async function createGoogleMeet({ userId, title, description, date, time, duration, token }) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/google/create-meet`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId, title, description, date, time, duration }),
  });

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || 'Failed to create Google Meet');
    err.needsAuth = !!data.needsAuth;
    err.notConfigured = !!data.notConfigured;
    throw err;
  }
  return data; // { meetLink, eventId }
}
