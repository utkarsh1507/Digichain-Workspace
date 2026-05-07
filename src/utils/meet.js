const GOOGLE_MEET_REGEX = /^https?:\/\/meet\.google\.com\/[a-z0-9-]+(?:[/?][^\s]*)?$/i;
const ANY_CALL_REGEX = /https?:\/\/(?:meet\.google\.com|meet\.jit\.si)\/[^\s]+/i;

export function isGoogleMeetLink(url = '') {
  return GOOGLE_MEET_REGEX.test(url.trim());
}

export function extractMeetLink(text = '') {
  return text.match(/https?:\/\/meet\.google\.com\/[^\s]+/i)?.[0] || null;
}

export function normalizeMeetLink(link) {
  const trimmed = link?.trim() || '';
  return isGoogleMeetLink(trimmed) ? trimmed : '';
}

export function stripMeetLinkFromText(text = '') {
  return text
    .replace(ANY_CALL_REGEX, '')
    .replace(/\bjoin here:\s*$/i, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
