const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { broadcast } = require('../lib/events');
const prisma = new PrismaClient();
const IST_TIME_ZONE = 'Asia/Kolkata';
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
  const founders = await prisma.user.findMany({
    where: { role: 'founder' },
    select: { id: true },
  });
  return Array.from(new Set([userId, ...founders.map((user) => user.id)]));
}

// GET /api/attendance — all (founder) or own
router.get('/', auth, async (req, res) => {
  try {
    const where = req.user.role === 'founder' ? {} : { userId: req.user.id };
    const records = await prisma.attendance.findMany({
      where, orderBy: [{ date: 'desc' }], include: { user: { select: { name: true, title: true, avatar: true } } }
    });
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
    const records = await prisma.attendance.findMany({
      where, include: { user: { select: { id: true, name: true, title: true, avatar: true } } }
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
    if (!ensureSignWindow(res)) return;
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
