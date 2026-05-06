const CALL_URL_REGEX = /https?:\/\/(?:meet\.google\.com|meet\.jit\.si)\/[^\s]+/i;

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/https?:\/\//g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

export function buildRoomName(seed = '') {
  const base = slugify(seed) || `call-${randomId()}`;
  return `digichain-${base}`;
}

export function generateMeetLink(seed = '') {
  return `https://meet.jit.si/${buildRoomName(seed)}`;
}

export function extractMeetLink(text = '') {
  return text.match(CALL_URL_REGEX)?.[0] || null;
}

export function normalizeMeetLink(link, fallbackSeed = '') {
  if (!link) return generateMeetLink(fallbackSeed);
  if (/^https:\/\/meet\.jit\.si\//i.test(link)) return link;
  if (/^https:\/\/meet\.google\.com\//i.test(link)) return generateMeetLink(fallbackSeed || link);
  return link;
}

export function stripMeetLinkFromText(text = '') {
  return text
    .replace(CALL_URL_REGEX, '')
    .replace(/\bjoin here:\s*$/i, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
