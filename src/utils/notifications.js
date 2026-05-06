// ────────────────────────────────────────────────────────────────────────────────
// Notifications: sound (Web Audio) + desktop (Notification API)
// ────────────────────────────────────────────────────────────────────────────────

let audioCtx = null;
function getAudioCtx() {
  if (audioCtx) return audioCtx;
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
    return audioCtx;
  } catch {
    return null;
  }
}

/** Two-note ascending "ping" — used for new messages. */
export function playMessageSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1320, t + 0.08);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.16, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    osc.start(t);
    osc.stop(t + 0.4);
  } catch {}
}

/** Lower-pitched longer chime — used for announcements / meetings. */
export function playAnnouncementSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const gain = ctx.createGain();
    o1.connect(gain);
    o2.connect(gain);
    gain.connect(ctx.destination);
    o1.type = 'sine';
    o2.type = 'sine';
    o1.frequency.setValueAtTime(523.25, t);   // C5
    o2.frequency.setValueAtTime(659.25, t);   // E5
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o1.start(t);
    o2.start(t + 0.06);
    o1.stop(t + 0.65);
    o2.stop(t + 0.65);
  } catch {}
}

// ── Desktop notifications ──────────────────────────────────────────────────────

export function getNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

const ICON = '/digichain-logo.png';

/**
 * Show a desktop notification only when the tab/window is hidden or unfocused
 * (so we don't double-notify when the user is already looking at the app).
 */
export function showDesktopNotification({ title, body, tag, onClick }) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  // Don't pop a desktop notification if the user is actively looking at the app
  const focused = document.hasFocus() && !document.hidden;
  if (focused) return;
  try {
    const n = new Notification(title || 'Digichain Workspace', {
      body: body || '',
      icon: ICON,
      badge: ICON,
      tag: tag || 'digichain',
      silent: false,
    });
    setTimeout(() => { try { n.close(); } catch {} }, 6000);
    n.onclick = () => {
      try { window.focus(); n.close(); } catch {}
      if (onClick) onClick();
    };
  } catch {}
}

/**
 * Combined helper: play a sound + show a desktop notification (when appropriate).
 */
export function notify({ kind = 'message', title, body, tag, onClick }) {
  if (kind === 'message') playMessageSound();
  else playAnnouncementSound();
  showDesktopNotification({ title, body, tag, onClick });
}
