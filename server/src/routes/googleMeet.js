const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const prisma = new PrismaClient();
const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI  = process.env.GOOGLE_REDIRECT_URI;

// In-memory cache: userId → tokens object. Warm on first use, survives within a process.
// DB is the source of truth so tokens survive Render restarts.
const tokenCache = {};

function getGoogleAPIs() {
  try { return require('googleapis'); }
  catch { return null; }
}

function isConfigured() {
  return !!(CLIENT_ID && CLIENT_SECRET && REDIRECT_URI);
}

function makeOAuth2Client() {
  const { google } = getGoogleAPIs();
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

// Persist tokens to DB and warm the in-memory cache
async function saveTokens(userId, tokens) {
  tokenCache[userId] = tokens;
  await prisma.user.update({
    where: { id: userId },
    data: {
      googleAccessToken:  tokens.access_token  || null,
      googleRefreshToken: tokens.refresh_token  || null,
      googleTokenExpiry:  tokens.expiry_date != null ? BigInt(tokens.expiry_date) : null,
    },
  });
}

// Load tokens from cache or DB
async function loadTokens(userId) {
  if (tokenCache[userId]) return tokenCache[userId];
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleAccessToken: true, googleRefreshToken: true, googleTokenExpiry: true },
  });
  if (!user?.googleAccessToken) return null;
  const tokens = {
    access_token:  user.googleAccessToken,
    refresh_token: user.googleRefreshToken || undefined,
    expiry_date:   user.googleTokenExpiry != null ? Number(user.googleTokenExpiry) : undefined,
  };
  tokenCache[userId] = tokens;
  return tokens;
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

function istWallClock(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, hourCycle: 'h23',
    }).formatToParts(date).map(p => [p.type, p.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}

function pickClientUrl() {
  const urls = (process.env.CLIENT_URL || 'http://localhost:5174')
    .split(',').map(u => u.trim()).filter(Boolean);
  return urls.find(u => !u.includes('localhost') && !u.includes('127.0.0.1')) || urls[0];
}

// ── GET /api/google/auth ─────────────────────────────────────────────────────
// Auth-protected: userId always comes from the JWT, never from query params.
router.get('/auth', auth, (req, res) => {
  if (!isConfigured()) {
    return res.status(503).send('Google Meet API is not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.');
  }
  const userId = req.user.id;
  const origin = req.get('Referer') ? new URL(req.get('Referer')).origin : pickClientUrl();
  const url = makeOAuth2Client().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state: JSON.stringify({ userId, origin }),
  });
  res.redirect(url);
});

// ── GET /api/google/callback ─────────────────────────────────────────────────
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;
  let userId = '';
  let clientUrl = pickClientUrl();
  try {
    const parsed = JSON.parse(state || '{}');
    userId = parsed.userId || '';
    if (parsed.origin) clientUrl = parsed.origin;
  } catch {}

  if (error || !code) {
    return res.redirect(`${clientUrl}/google-callback?error=${encodeURIComponent(error || 'access_denied')}`);
  }

  try {
    const oauth2Client = makeOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    if (userId) await saveTokens(userId, tokens);
    res.redirect(`${clientUrl}/google-callback?success=1`);
  } catch (err) {
    console.error('Google OAuth callback error:', err.message);
    res.redirect(`${clientUrl}/google-callback?error=${encodeURIComponent('token_exchange_failed')}`);
  }
});

// ── GET /api/google/status ───────────────────────────────────────────────────
router.get('/status', auth, async (req, res) => {
  const tokens = await loadTokens(req.user.id);
  res.json({ configured: isConfigured(), connected: !!tokens });
});

// ── DELETE /api/google/disconnect ────────────────────────────────────────────
router.delete('/disconnect', auth, async (req, res) => {
  const userId = req.user.id;
  delete tokenCache[userId];
  await prisma.user.update({
    where: { id: userId },
    data: { googleAccessToken: null, googleRefreshToken: null, googleTokenExpiry: null },
  });
  res.json({ ok: true });
});

// ── POST /api/google/create-meet ─────────────────────────────────────────────
router.post('/create-meet', auth, async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: 'Google Meet API not configured', notConfigured: true });
  }

  const userId = req.user.id;
  const { title, description, date, time, duration } = req.body;

  const tokens = await loadTokens(userId);
  if (!tokens) {
    return res.status(401).json({ error: 'Google account not connected', needsAuth: true });
  }

  try {
    const { google } = getGoogleAPIs();
    const oauth2Client = makeOAuth2Client();
    oauth2Client.setCredentials(tokens);

    // Persist refreshed tokens back to DB so they stay valid long-term
    oauth2Client.on('tokens', async (newTokens) => {
      const merged = { ...tokens, ...newTokens };
      tokenCache[userId] = merged;
      await prisma.user.update({
        where: { id: userId },
        data: {
          googleAccessToken:  merged.access_token  || null,
          googleRefreshToken: merged.refresh_token  || null,
          googleTokenExpiry:  merged.expiry_date != null ? BigInt(merged.expiry_date) : null,
        },
      }).catch(e => console.error('Token persist error:', e.message));
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const durationMins = parseInt(duration) || 30;
    let startISO;
    if (date) {
      const { hours, minutes } = parseTime(time || '10:00 AM');
      startISO = `${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
    } else {
      startISO = istWallClock();
    }

    const endISO = istWallClock(new Date(new Date(startISO + '+05:30').getTime() + durationMins * 60000));

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
      // Revoke stale tokens so the user gets a clean re-auth prompt
      delete tokenCache[userId];
      await prisma.user.update({
        where: { id: userId },
        data: { googleAccessToken: null, googleRefreshToken: null, googleTokenExpiry: null },
      }).catch(() => {});
      return res.status(401).json({ error: 'Google session expired', needsAuth: true });
    }
    res.status(500).json({ error: err.message || 'Failed to create Google Meet' });
  }
});

module.exports = router;
