const router = require('express').Router();

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI  = process.env.GOOGLE_REDIRECT_URI; // e.g. https://your-render-server.onrender.com/api/google/callback

// In-memory token store  userId → { access_token, refresh_token, expiry_date }
// Acceptable for a 15-person team; survives until server restarts.
const tokenStore = {};

// Lazy-load googleapis so the server still starts if the package isn't installed yet
function getGoogleAPIs() {
  try { return require('googleapis'); }
  catch { return null; }
}

function isConfigured() {
  return !!(CLIENT_ID && CLIENT_SECRET && REDIRECT_URI);
}

function makeOAuth2Client() {
  const { google } = getGoogleAPIs();
  const client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  return client;
}

// Parse "10:30 AM" / "14:00" → { hours, minutes }
function parseTime(timeStr = '') {
  const upper = timeStr.trim().toUpperCase();
  const ampm = upper.endsWith('AM') || upper.endsWith('PM') ? upper.slice(-2) : null;
  const base = ampm ? upper.slice(0, -2).trim() : upper;
  let [h, m] = base.split(':').map(Number);
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return { hours: h || 0, minutes: m || 0 };
}

// ── GET /api/google/auth?userId=xxx ─────────────────────────────────────────
// Starts the OAuth popup flow
router.get('/auth', (req, res) => {
  if (!isConfigured()) {
    return res.status(503).send('Google Meet API is not configured on this server. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI to your environment variables.');
  }
  const { userId } = req.query;
  const oauth2Client = makeOAuth2Client();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state: JSON.stringify({ userId: userId || '' }),
  });
  res.redirect(url);
});

// ── GET /api/google/callback ─────────────────────────────────────────────────
// Google redirects here after the user grants permission
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5174').split(',')[0].trim();

  if (error || !code) {
    return res.redirect(`${clientUrl}/google-callback?error=${encodeURIComponent(error || 'access_denied')}`);
  }

  let userId = '';
  try { ({ userId } = JSON.parse(state || '{}')); } catch {}

  try {
    const oauth2Client = makeOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    if (userId) tokenStore[userId] = tokens;
    res.redirect(`${clientUrl}/google-callback?success=1`);
  } catch (err) {
    console.error('Google OAuth callback error:', err.message);
    res.redirect(`${clientUrl}/google-callback?error=${encodeURIComponent('token_exchange_failed')}`);
  }
});

// ── GET /api/google/status?userId=xxx ───────────────────────────────────────
router.get('/status', (req, res) => {
  const { userId } = req.query;
  res.json({
    configured: isConfigured(),
    connected: !!(userId && tokenStore[userId]),
  });
});

// ── POST /api/google/create-meet ─────────────────────────────────────────────
// Body: { userId, title, description, date, time, duration }
// Returns: { meetLink }
router.post('/create-meet', async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: 'Google Meet API not configured', notConfigured: true });
  }

  const { userId, title, description, date, time, duration } = req.body;

  if (!userId || !tokenStore[userId]) {
    return res.status(401).json({ error: 'Google account not connected', needsAuth: true });
  }

  try {
    const { google } = getGoogleAPIs();
    const oauth2Client = makeOAuth2Client();
    oauth2Client.setCredentials(tokenStore[userId]);

    // Auto-refresh tokens
    oauth2Client.on('tokens', (newTokens) => {
      tokenStore[userId] = { ...tokenStore[userId], ...newTokens };
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Build start + end DateTimes in IST
    const { hours, minutes } = parseTime(time || '10:00 AM');
    const durationMins = parseInt(duration) || 30;

    const startISO = date
      ? `${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
      : new Date().toISOString();

    const startMs = new Date(startISO).getTime();
    const endMs   = startMs + durationMins * 60 * 1000;
    const endISO  = new Date(endMs).toISOString().slice(0, 19);

    const event = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      resource: {
        summary: title || 'Digichain Meeting',
        description: description || '',
        start: { dateTime: startISO, timeZone: 'Asia/Kolkata' },
        end:   { dateTime: endISO,   timeZone: 'Asia/Kolkata' },
        conferenceData: {
          createRequest: {
            requestId: `digichain-${userId}-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
    });

    const meetLink = event.data.hangoutLink;
    if (!meetLink) throw new Error('Google did not return a Meet link. Ensure your Google account supports Meet.');

    res.json({ meetLink, eventId: event.data.id });
  } catch (err) {
    console.error('create-meet error:', err.message);
    if (err.code === 401 || err.status === 401) {
      delete tokenStore[userId];
      return res.status(401).json({ error: 'Google session expired', needsAuth: true });
    }
    res.status(500).json({ error: err.message || 'Failed to create Google Meet' });
  }
});

module.exports = router;
