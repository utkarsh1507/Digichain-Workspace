const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { broadcast } = require('../lib/events');
const prisma = new PrismaClient();

const include = {
  organizer: { select: { id: true, name: true, avatar: true, title: true } }
};

// GET /api/meetings
router.get('/', auth, async (req, res) => {
  try {
    const meetings = await prisma.meeting.findMany({
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
    const { title, date, time, duration, attendeeIds, meetLink, description } = req.body;
    const meeting = await prisma.meeting.create({
      data: {
        title,
        date,
        time,
        duration: duration || '30 min',
        attendeeIds: JSON.stringify(attendeeIds || []),
        meetLink: meetLink || null,
        description: description || null,
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
    res.status(500).json({ error: 'Server error' });
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
    if (attendeeIds !== undefined) data.attendeeIds = JSON.stringify(attendeeIds);
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
    res.status(500).json({ error: 'Server error' });
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
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
