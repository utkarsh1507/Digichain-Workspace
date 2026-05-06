const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const prisma = new PrismaClient();

// GET /api/leaves
router.get('/', auth, async (req, res) => {
  try {
    const where = req.user.role === 'founder' ? {} : { userId: req.user.id };
    const leaves = await prisma.leave.findMany({
      where, orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, title: true, avatar: true } } }
    });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/leaves — apply
router.post('/', auth, async (req, res) => {
  try {
    const { type, fromDate, toDate, days, reason } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const leave = await prisma.leave.create({
      data: { userId: req.user.id, type, fromDate, toDate, days, reason, appliedOn: today },
      include: { user: { select: { id: true, name: true, title: true, avatar: true } } }
    });
    res.json(leave);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/leaves/:id — approve/reject (founder)
router.patch('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'founder') return res.status(403).json({ error: 'Forbidden' });
    const { status } = req.body;
    if (!['Approved', 'Rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const leave = await prisma.leave.update({
      where: { id: req.params.id },
      data: { status, approverId: req.user.id },
      include: { user: { select: { id: true, name: true, title: true, avatar: true } } }
    });
    res.json(leave);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/leaves/:id — cancel own pending leave
router.delete('/:id', auth, async (req, res) => {
  try {
    const leave = await prisma.leave.findUnique({ where: { id: req.params.id } });
    if (!leave) return res.status(404).json({ error: 'Not found' });
    if (leave.userId !== req.user.id && req.user.role !== 'founder') return res.status(403).json({ error: 'Forbidden' });
    if (leave.status !== 'Pending' && req.user.role !== 'founder') return res.status(400).json({ error: 'Cannot cancel non-pending leave' });
    await prisma.leave.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
