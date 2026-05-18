const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { uploadAvatar } = require('../lib/cloudinary');
const { broadcast } = require('../lib/events');
const { invalidateFounderCache } = require('./attendance');
const prisma = new PrismaClient();
const PASSWORD_MIN_LENGTH = 10;
const STATUS_PRESETS = new Set(['working', 'on-break', 'on-leave', 'busy', 'custom']);
const PRESENCE_WRITE_INTERVAL_MS = 15 * 60 * 1000;

// In-memory last-write tracker — avoids a DB read on every presence ping
const presenceLastWritten = {}; // userId → timestamp (ms)

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`;
  }
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter';
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password must include a number';
  return null;
}

function normalizeLeaveBalance(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

// GET /api/users — all users (auth required)
router.get('/', auth, async (req, res) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    res.json(users.map(({ password, ...u }) => u));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users/presence - refresh own activity timestamp
router.post('/presence', auth, async (req, res) => {
  try {
    const now = Date.now();
    const lastMs = presenceLastWritten[req.user.id] ?? 0;
    const shouldWrite = (now - lastMs) >= PRESENCE_WRITE_INTERVAL_MS;

    if (!shouldWrite) {
      return res.json({ ok: true });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { lastActiveAt: new Date(now) },
    });
    presenceLastWritten[req.user.id] = now;
    const { password, ...safeUser } = user;
    broadcast('user:update', safeUser);
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'Not found' });
    const { password, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users — create (founder only)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'founder') return res.status(403).json({ error: 'Forbidden' });
    const {
      name, email, role, title, department, phone, joinDate, password: pw,
      casualLeaveTotal, sickLeaveTotal, earnedLeaveTotal, wfhLeaveTotal, unpaidLeaveTotal,
    } = req.body;
    const passwordError = validatePassword(pw);
    if (passwordError) return res.status(400).json({ error: passwordError });

    const hashed = await bcrypt.hash(pw, 10);
    const user = await prisma.user.create({
      data: {
        name: name?.trim(),
        email: normalizeEmail(email),
        password: hashed,
        role: role || 'employee',
        title: title?.trim(),
        department,
        phone: phone?.trim() || null,
        joinDate,
        casualLeaveTotal: normalizeLeaveBalance(casualLeaveTotal),
        sickLeaveTotal: normalizeLeaveBalance(sickLeaveTotal),
        earnedLeaveTotal: normalizeLeaveBalance(earnedLeaveTotal),
        wfhLeaveTotal: normalizeLeaveBalance(wfhLeaveTotal),
        unpaidLeaveTotal: normalizeLeaveBalance(unpaidLeaveTotal),
      },
    });
    const { password, ...safeUser } = user;
    invalidateFounderCache();
    broadcast('user:new', safeUser);
    res.json(safeUser);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/users/:id — update own profile or founder updates anyone
router.patch('/:id', auth, async (req, res) => {
  try {
    if (req.user.id !== req.params.id && req.user.role !== 'founder') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { password, ...data } = req.body;
    if (password) {
      const passwordError = validatePassword(password);
      if (passwordError) return res.status(400).json({ error: passwordError });
      data.password = await bcrypt.hash(password, 10);
    }
    if (data.email !== undefined) data.email = normalizeEmail(data.email);
    if (data.name !== undefined) data.name = data.name?.trim();
    if (data.title !== undefined) data.title = data.title?.trim();
    if (data.phone !== undefined) data.phone = data.phone?.trim() || null;
    if (data.statusPreset !== undefined && !STATUS_PRESETS.has(data.statusPreset)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    if (data.statusMessage !== undefined) {
      data.statusMessage = data.statusMessage?.trim().slice(0, 80) || null;
    }
    if (req.user.role !== 'founder') {
      delete data.casualLeaveTotal;
      delete data.sickLeaveTotal;
      delete data.earnedLeaveTotal;
      delete data.wfhLeaveTotal;
      delete data.unpaidLeaveTotal;
    } else {
      ['casualLeaveTotal', 'sickLeaveTotal', 'earnedLeaveTotal', 'wfhLeaveTotal', 'unpaidLeaveTotal'].forEach((key) => {
        if (data[key] !== undefined) data[key] = normalizeLeaveBalance(data[key]);
      });
    }
    const user = await prisma.user.update({ where: { id: req.params.id }, data });
    const { password: _, ...safeUser } = user;
    if (data.role !== undefined) invalidateFounderCache();
    broadcast('user:update', safeUser);
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/users/:id — founder only
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'founder') return res.status(403).json({ error: 'Forbidden' });
    if (req.user.id === req.params.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    const userId = req.params.id;
    const [channels, meetings] = await Promise.all([
      prisma.channel.findMany(),
      prisma.meeting.findMany(),
    ]);

    const channelUpdates = channels
      .map((channel) => {
        const memberIds = JSON.parse(channel.memberIds || '[]');
        if (!memberIds.includes(userId)) return null;

        const nextMemberIds = memberIds.filter((id) => id !== userId);
        return nextMemberIds.length === 0
          ? prisma.channel.delete({ where: { id: channel.id } })
          : prisma.channel.update({
              where: { id: channel.id },
              data: { memberIds: JSON.stringify(nextMemberIds) },
            });
      })
      .filter(Boolean);

    const meetingUpdates = meetings
      .filter((meeting) => meeting.organizerId !== userId)
      .map((meeting) => {
        const attendeeIds = JSON.parse(meeting.attendeeIds || '[]');
        if (!attendeeIds.includes(userId)) return null;

        return prisma.meeting.update({
          where: { id: meeting.id },
          data: { attendeeIds: JSON.stringify(attendeeIds.filter((id) => id !== userId)) },
        });
      })
      .filter(Boolean);

    await prisma.$transaction([
      ...channelUpdates,
      ...meetingUpdates,
      prisma.channelRead.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);
    invalidateFounderCache();
    broadcast('user:delete', { id: userId });
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete user failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users/:id/avatar — upload profile photo
router.post('/:id/avatar', auth, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    if (req.user.id !== req.params.id && req.user.role !== 'founder') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const avatarUrl = req.file.path; // Cloudinary permanent URL
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { avatar: avatarUrl } });
    const { password, ...safeUser } = user;
    broadcast('user:update', safeUser);
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
