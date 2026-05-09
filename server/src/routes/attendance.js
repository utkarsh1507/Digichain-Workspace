const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { broadcast } = require('../lib/events');
const prisma = new PrismaClient();
const IST_TIME_ZONE = 'Asia/Kolkata';
const MAX_HISTORY_DAYS = 30;
const DEFAULT_EMPLOYEE_HISTORY_DAYS = 30;

// In-memory founder ID cache — avoids a DB read on every sign-in/out broadcast
let founderIds = null;
async function getFounderIds() {
  if (founderIds) return founderIds;
  const founders = await prisma.user.findMany({ where: { role: 'founder' }, select: { id: true } });
  founderIds = founders.map(u => u.id);
  return founderIds;
}
function invalidateFounderCache() { founderIds = null; }
const SIGN_WINDOW_START_MIN = 9 * 60;
const SIGN_WINDOW_END_MIN = 19 * 60;

function getIstParts(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-IN', {
      timeZone: IST_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      hourCycle: 'h23',
    }).formatToParts(date).map((part) => [part.type, part.value])
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function parseIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function formatIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDaysToIsoDate(isoDate, days) {
  const date = parseIsoDate(isoDate);
  if (!date) return null;
  date.setUTCDate(date.getUTCDate() + days);
  return formatIsoDate(date);
}

function requireFounder(req, res) {
  if (req.user.role === 'founder') return true;
  res.status(403).json({ error: 'Founder access required' });
  return false;
}

function resolveHistoryRange(query) {
  const today = getIstParts().date;
  const exactDate = query.date;

  if (exactDate) {
    if (!parseIsoDate(exactDate)) {
      return { error: 'Please select a valid date.' };
    }
    return {
      from: exactDate,
      to: exactDate,
      label: exactDate,
      mode: 'date',
      days: 1,
    };
  }

  const parsedDays = Number.parseInt(query.days || '10', 10);
  if (!Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > MAX_HISTORY_DAYS) {
    return { error: `Days must be between 1 and ${MAX_HISTORY_DAYS}.` };
  }

  return {
    from: addDaysToIsoDate(today, -(parsedDays - 1)),
    to: today,
    label: `Last ${parsedDays} day${parsedDays === 1 ? '' : 's'}`,
    mode: 'days',
    days: parsedDays,
  };
}

function serializeAttendanceForExport(records) {
  const header = ['Date', 'Employee', 'Title', 'Status', 'Sign In', 'Sign Out', 'Hours', 'Location'];
  const rows = records.map((record) => [
    record.date,
    record.user?.name || '',
    record.user?.title || '',
    record.status || '',
    record.signIn || '',
    record.signOut || '',
    record.hours || '',
    record.location || '',
  ]);

  const csvEscape = (value) => {
    const stringValue = String(value ?? '');
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  return [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

function isWithinSignWindow() {
  const { minutes } = getIstParts();
  return minutes >= SIGN_WINDOW_START_MIN && minutes <= SIGN_WINDOW_END_MIN;
}

function ensureSignWindow(res) {
  if (isWithinSignWindow()) return true;
  res.status(403).json({ error: 'Attendance is available from 9:00 AM to 7:00 PM IST.' });
  return false;
}

async function getAttendanceTargets(userId) {
  const ids = await getFounderIds();
  return Array.from(new Set([userId, ...ids]));
}

async function fetchAttendanceRecords(where) {
  return prisma.attendance.findMany({
    where,
    orderBy: [{ date: 'desc' }, { user: { name: 'asc' } }],
    include: {
      user: {
        select: { id: true, name: true, title: true, avatar: true },
      },
    },
  });
}

// GET /api/attendance — all (founder) or own
router.get('/', auth, async (req, res) => {
  try {
    const today = getIstParts().date;
    const where = req.user.role === 'founder'
      ? { date: today }
      : { userId: req.user.id, date: { gte: addDaysToIsoDate(today, -(DEFAULT_EMPLOYEE_HISTORY_DAYS - 1)), lte: today } };
    const records = await fetchAttendanceRecords(where);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/attendance/today — today's records for all (founder) or self
router.get('/today', auth, async (req, res) => {
  try {
    const today = getIstParts().date;
    const where = req.user.role === 'founder' ? { date: today } : { userId: req.user.id, date: today };
    const records = await fetchAttendanceRecords(where);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/attendance/history — founder-only exact date or last N days (max 30)
router.get('/history', auth, async (req, res) => {
  try {
    if (!requireFounder(req, res)) return;
    const range = resolveHistoryRange(req.query);
    if (range.error) return res.status(400).json({ error: range.error });

    const records = await fetchAttendanceRecords({
      date: { gte: range.from, lte: range.to },
    });

    res.json({
      range,
      records,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/attendance/history/export — founder-only Excel-compatible CSV
router.get('/history/export', auth, async (req, res) => {
  try {
    if (!requireFounder(req, res)) return;
    const range = resolveHistoryRange(req.query);
    if (range.error) return res.status(400).json({ error: range.error });

    const records = await fetchAttendanceRecords({
      date: { gte: range.from, lte: range.to },
    });

    const csv = serializeAttendanceForExport(records);
    const suffix = range.mode === 'date'
      ? range.from
      : `${range.from}_to_${range.to}`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_${suffix}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/attendance/users/:userId — self or founder, capped to 30 days by default
router.get('/users/:userId', auth, async (req, res) => {
  try {
    const canView = req.user.role === 'founder' || req.user.id === req.params.userId;
    if (!canView) return res.status(403).json({ error: 'Forbidden' });

    const today = getIstParts().date;
    const parsedDays = Number.parseInt(req.query.days || String(DEFAULT_EMPLOYEE_HISTORY_DAYS), 10);
    if (!Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > MAX_HISTORY_DAYS) {
      return res.status(400).json({ error: `Days must be between 1 and ${MAX_HISTORY_DAYS}.` });
    }

    const from = addDaysToIsoDate(today, -(parsedDays - 1));
    const records = await fetchAttendanceRecords({
      userId: req.params.userId,
      date: { gte: from, lte: today },
    });

    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/attendance/signin
router.post('/signin', auth, async (req, res) => {
  try {
    const { location } = req.body;
    if (!ensureSignWindow(res)) return;
    const { date: today, time } = getIstParts();

    const existing = await prisma.attendance.findUnique({ where: { userId_date: { userId: req.user.id, date: today } } });
    if (existing) return res.status(409).json({ error: 'Already signed in today' });

    const record = await prisma.attendance.create({
      data: { userId: req.user.id, date: today, signIn: time, status: 'Present', location: location || 'Office' },
      include: { user: { select: { id: true, name: true, title: true, avatar: true } } }
    });
    broadcast('attendance:upsert', record, await getAttendanceTargets(req.user.id));
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/attendance/signout
router.post('/signout', auth, async (req, res) => {
  try {
    // Sign-out is allowed at any time so employees can clock out if they forgot before 7 PM
    const { date: today, time: signOut } = getIstParts();
    const record = await prisma.attendance.findUnique({ where: { userId_date: { userId: req.user.id, date: today } } });
    if (!record) return res.status(404).json({ error: 'No sign-in record for today' });

    // Calculate hours
    let hours = '—';
    if (record.signIn) {
      const [ih, im] = record.signIn.split(':').map(Number);
      const [oh, om] = signOut.split(':').map(Number);
      const mins = (oh * 60 + om) - (ih * 60 + im);
      if (mins > 0) hours = `${Math.floor(mins / 60)}h ${mins % 60}m`;
    }

    const updated = await prisma.attendance.update({
      where: { userId_date: { userId: req.user.id, date: today } },
      data: { signOut, hours },
      include: { user: { select: { id: true, name: true, title: true, avatar: true } } }
    });
    broadcast('attendance:upsert', updated, await getAttendanceTargets(req.user.id));
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/attendance/today — remove today's record so user can sign in again
router.delete('/today', auth, async (req, res) => {
  try {
    const today = getIstParts().date;
    await prisma.attendance.deleteMany({ where: { userId: req.user.id, date: today } });
    broadcast('attendance:delete', { userId: req.user.id, date: today }, await getAttendanceTargets(req.user.id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
module.exports.invalidateFounderCache = invalidateFounderCache;
