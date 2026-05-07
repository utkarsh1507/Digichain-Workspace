export const STATUS_PRESETS = [
  { value: 'working', label: 'Working', emoji: '💻', tone: 'success' },
  { value: 'on-break', label: 'On break', emoji: '☕', tone: 'warning' },
  { value: 'on-leave', label: 'On leave', emoji: '🌴', tone: 'danger' },
  { value: 'busy', label: 'Busy', emoji: '⛔', tone: 'info' },
  { value: 'custom', label: 'Custom', emoji: '✨', tone: 'accent' },
];

const STATUS_BY_VALUE = Object.fromEntries(STATUS_PRESETS.map((status) => [status.value, status]));
const ONLINE_MS = 6 * 60 * 1000;
const AWAY_MS = 30 * 60 * 1000;

export function getStatusMeta(value) {
  return STATUS_BY_VALUE[value] || STATUS_BY_VALUE.working;
}

export function getStatusText(user) {
  if (!user) return '';
  const meta = getStatusMeta(user.statusPreset);
  if (user.statusPreset === 'custom' && user.statusMessage) return `${meta.emoji} ${user.statusMessage}`;
  return `${meta.emoji} ${meta.label}`;
}

function minutesAgo(ms) {
  return Math.max(1, Math.round(ms / 60000));
}

export function formatRelativePresence(dateValue, now = Date.now()) {
  if (!dateValue) return 'Last seen unknown';
  const diff = Math.max(0, now - new Date(dateValue).getTime());
  if (diff < ONLINE_MS) return 'Active now';
  const mins = minutesAgo(diff);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export function getPresence(user, now = Date.now()) {
  const lastActiveAt = user?.lastActiveAt || user?.updatedAt || user?.createdAt;
  if (!lastActiveAt) return { state: 'offline', label: 'Offline', detail: 'Last seen unknown' };

  const diff = Math.max(0, now - new Date(lastActiveAt).getTime());
  if (diff < ONLINE_MS) {
    return { state: 'online', label: 'Online', detail: 'Active now' };
  }
  if (diff < AWAY_MS) {
    return { state: 'away', label: 'Away', detail: `Away ${formatRelativePresence(lastActiveAt, now)}` };
  }
  return { state: 'offline', label: 'Offline', detail: `Last seen ${formatRelativePresence(lastActiveAt, now)}` };
}

export function getUserSubtitle(user, now = Date.now()) {
  const statusText = getStatusText(user);
  const presence = getPresence(user, now);
  return statusText ? `${statusText} · ${presence.detail}` : presence.detail;
}
