const GOOGLE_MEET_REGEX = /https?:\/\/meet\.google\.com\/[a-z0-9-]+/i;
const ANY_CALL_REGEX = /https?:\/\/(?:meet\.google\.com|meet\.jit\.si)\/[^\s]+/i;

export function isGoogleMeetLink(url = '') {
  return GOOGLE_MEET_REGEX.test(url);
}

// Opens Google Meet's "new meeting" page — user creates their own room
export function generateMeetLink() {
  return 'https://meet.google.com/new';
}

export function extractMeetLink(text = '') {
  return text.match(GOOGLE_MEET_REGEX)?.[0] || null;
}

// Returns the link as-is if it's a valid Google Meet link,
// otherwise falls back to the "new meeting" URL
export function normalizeMeetLink(link) {
  if (!link) return 'https://meet.google.com/new';
  if (isGoogleMeetLink(link)) return link;
  return 'https://meet.google.com/new';
}

export function stripMeetLinkFromText(text = '') {
  return text
    .replace(ANY_CALL_REGEX, '')
    .replace(/\bjoin here:\s*$/i, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
