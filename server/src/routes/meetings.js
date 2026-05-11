const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { broadcast } = require('../lib/events');
const prisma = new PrismaClient();
const GOOGLE_MEET_REGEX = /^https?:\/\/meet\.google\.com\/[a-z0-9-]+(?:[/?][^\s]*)?$/i;

const include = {
  organizer: { select: { id: true, name: true, avatar: true, title: true } }
};

function sanitizeMeetLink(rawLink) {
  const trimmed = String(rawLink || '').trim();
  if (!trimmed) {
    throw new Error('Google Meet link is required');
  }
  if (!GOOGLE_MEET_REGEX.test(trimmed)) {
    throw new Error('Please provide a valid Google Meet link');
  }
  return trimmed;
}

function normalizeRecurring(value) {
  return value === 'daily' ? 'daily' : null;
}

function normalizeAttendees(attendeeIds, organizerId) {
  const ids = Array.isArray(attendeeIds) ? attendeeIds.filter(Boolean) : [];
  return Array.from(new Set([organizerId, ...ids]));
}

function getErrorStatus(message = '') {
  return /required|valid/i.test(message) ? 400 : 500;
}

function getDateStringWithOffset(offsetDays = 0) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split('T')[0];
}

// GET /api/meetings
router.get('/', auth, async (req, res) => {
  try {
    const retentionStart = getDateStringWithOffset(-7);
    const meetings = await prisma.meeting.findMany({
      where: {
        OR: [
          { recurring: 'daily' },
          { date: { gte: retentionStart } },
        ],
      },
      orderBy: { date: 'asc' },
      include
    });
    res.json(meetings.map(m => ({ ...m, attendeeIds: JSON.parse(m.attendeeIds || '[]') })));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/meetings
router.post('/', auth, async (req, res) => {
  try {
    const { title, date, time, duration, attendeeIds, meetLink, description, recurring } = req.body;
    const normalizedAttendees = normalizeAttendees(attendeeIds, req.user.id);
    const meeting = await prisma.meeting.create({
      data: {
        title,
        date,
        time,
        duration: duration || '30 min',
        attendeeIds: JSON.stringify(normalizedAttendees),
        meetLink: sanitizeMeetLink(meetLink),
        description: description || null,
        recurring: normalizeRecurring(recurring),
        organizerId: req.user.id,
      },
      include
    });
    const payload = { ...meeting, attendeeIds: JSON.parse(meeting.attendeeIds || '[]') };
    // Notify all attendees + the organizer
    const targets = Array.from(new Set([payload.organizerId, ...payload.attendeeIds]));
    broadcast('meeting:new', payload, targets);
    res.json(payload);
  } catch (err) {
    console.error('Create meeting failed:', err);
    res.status(getErrorStatus(err.message)).json({ error: err.message || 'Server error' });
  }
});

// PATCH /api/meetings/:id
router.patch('/:id', auth, async (req, res) => {
  try {
    const meeting = await prisma.meeting.findUnique({ where: { id: req.params.id } });
    if (!meeting) return res.status(404).json({ error: 'Not found' });
    if (meeting.organizerId !== req.user.id && req.user.role !== 'founder') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { attendeeIds, ...data } = req.body;
    if (attendeeIds !== undefined) data.attendeeIds = JSON.stringify(normalizeAttendees(attendeeIds, meeting.organizerId));
    if (data.meetLink !== undefined) data.meetLink = sanitizeMeetLink(data.meetLink);
    if (data.recurring !== undefined) data.recurring = normalizeRecurring(data.recurring);
    const updated = await prisma.meeting.update({
      where: { id: req.params.id },
      data,
      include
    });
    const payload = { ...updated, attendeeIds: JSON.parse(updated.attendeeIds || '[]') };
    const targets = Array.from(new Set([payload.organizerId, ...payload.attendeeIds]));
    broadcast('meeting:update', payload, targets);
    res.json(payload);
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ error: err.message || 'Server error' });
  }
});

// DELETE /api/meetings/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const meeting = await prisma.meeting.findUnique({ where: { id: req.params.id } });
    if (!meeting) return res.status(404).json({ error: 'Not found' });
    if (meeting.organizerId !== req.user.id && req.user.role !== 'founder') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const targets = Array.from(new Set([meeting.organizerId, ...JSON.parse(meeting.attendeeIds || '[]')]));
    await prisma.meeting.delete({ where: { id: req.params.id } });
    broadcast('meeting:delete', { id: req.params.id }, targets);
    res.json({ ok: true });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ error: err.message || 'Server error' });
  }
});

module.exports = router;
