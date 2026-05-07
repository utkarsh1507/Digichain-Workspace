import { API_BASE } from '../api/index.js';

function token() {
  return localStorage.getItem('dw_token');
}

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` };
}

export async function getGoogleStatus() {
  const res = await fetch(`${API_BASE}/google/status`, { headers: authHeaders() });
  if (!res.ok) return { configured: false, connected: false };
  return res.json();
}

export async function disconnectGoogle() {
  const res = await fetch(`${API_BASE}/google/disconnect`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to disconnect Google account');
}

// Opens the OAuth popup. The server reads the user from the JWT,
// so no userId is passed in the URL (prevents cross-user token hijacking).
export function openGoogleAuthPopup() {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}/google/auth`;
    // Append token as query param so the auth middleware on the server can read it
    // (the popup is a plain browser redirect, not an XHR, so headers aren't available)
    const fullUrl = `${url}?token=${encodeURIComponent(token())}`;
    const popup = window.open(fullUrl, 'google-oauth', 'width=520,height=640,left=200,top=100');

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

    // Wait 600ms after popup closes before rejecting — gives postMessage
    // time to arrive and prevents the race-condition auth loop.
    let graceTimer = null;
    const pollTimer = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollTimer);
        graceTimer = setTimeout(() => {
          cleanup();
          reject(new Error('Google sign-in was cancelled.'));
        }, 600);
      }
    }, 300);

    function cleanup() {
      clearInterval(pollTimer);
      clearTimeout(graceTimer);
      window.removeEventListener('message', onMessage);
    }

    window.addEventListener('message', onMessage);
  });
}

// Ensure the current user is authenticated with Google.
// Returns true if already connected, opens popup if not.
export async function ensureGoogleConnected() {
  const status = await getGoogleStatus();
  if (!status.configured) throw new Error('Google Meet is not configured on the server. Ask your admin to add the Google API credentials.');
  if (status.connected) return true;
  await openGoogleAuthPopup();
  return true;
}

// Create a Google Meet. userId is read from the JWT on the server.
export async function createGoogleMeet({ title, description, date, time, duration }) {
  const res = await fetch(`${API_BASE}/google/create-meet`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ title, description, date, time, duration }),
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
