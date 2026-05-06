const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { broadcast } = require('../lib/events');
const prisma = new PrismaClient();

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
    const today = new Date().toISOString().split('T')[0];
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
    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

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
    const today = new Date().toISOString().split('T')[0];
    const signOut = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
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

module.exports = router;
