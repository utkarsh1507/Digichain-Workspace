const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { broadcast } = require('../lib/events');
const prisma = new PrismaClient();

const LEAVE_BALANCE_FIELDS = {
  Casual: 'casualLeaveTotal',
  Sick: 'sickLeaveTotal',
  Earned: 'earnedLeaveTotal',
  WFH: 'wfhLeaveTotal',
  Unpaid: 'unpaidLeaveTotal',
};

async function getApprovedUsage(userId) {
  const approvedLeaves = await prisma.leave.findMany({
    where: { userId, status: 'Approved' },
    select: { type: true, days: true },
  });

  return approvedLeaves.reduce((acc, leave) => {
    acc[leave.type] = (acc[leave.type] || 0) + (leave.days || 0);
    return acc;
  }, {});
}

async function getLeaveAvailability(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      casualLeaveTotal: true,
      sickLeaveTotal: true,
      earnedLeaveTotal: true,
      wfhLeaveTotal: true,
      unpaidLeaveTotal: true,
    },
  });
  if (!user) return null;

  const usage = await getApprovedUsage(userId);
  return { user, usage };
}

function getRemainingLeave({ user, usage }, type) {
  const field = LEAVE_BALANCE_FIELDS[type];
  if (!field) return 0;
  return Math.max(0, Number(user[field] || 0) - Number(usage[type] || 0));
}

async function getFounderIds() {
  const founders = await prisma.user.findMany({
    where: { role: 'founder' },
    select: { id: true },
  });
  return founders.map((user) => user.id);
}

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
    const balance = await getLeaveAvailability(req.user.id);
    if (!balance) return res.status(404).json({ error: 'User not found' });

    const remaining = getRemainingLeave(balance, type);
    if (days > remaining) {
      return res.status(400).json({
        error: remaining > 0
          ? `Only ${remaining} ${type} leave day${remaining === 1 ? '' : 's'} remaining. Contact admin to increase your balance.`
          : 'All leaves used. Contact admin to increase your balance.',
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const leave = await prisma.leave.create({
      data: { userId: req.user.id, type, fromDate, toDate, days, reason, appliedOn: today },
      include: { user: { select: { id: true, name: true, title: true, avatar: true } } }
    });
    const targets = Array.from(new Set([req.user.id, ...(await getFounderIds())]));
    broadcast('leave:new', leave, targets);
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
    const existingLeave = await prisma.leave.findUnique({ where: { id: req.params.id } });
    if (!existingLeave) return res.status(404).json({ error: 'Not found' });

    if (status === 'Approved') {
      const balance = await getLeaveAvailability(existingLeave.userId);
      if (!balance) return res.status(404).json({ error: 'User not found' });

      const remaining = getRemainingLeave(balance, existingLeave.type);
      const alreadyApproved = existingLeave.status === 'Approved';
      const availableForThisDecision = alreadyApproved ? remaining + existingLeave.days : remaining;
      if (existingLeave.days > availableForThisDecision) {
        return res.status(400).json({
          error: 'This employee has exhausted this leave balance. Increase the balance before approval.',
        });
      }
    }

    const leave = await prisma.leave.update({
      where: { id: req.params.id },
      data: { status, approverId: req.user.id },
      include: { user: { select: { id: true, name: true, title: true, avatar: true } } }
    });
    const targets = Array.from(new Set([leave.userId, ...(await getFounderIds())]));
    broadcast('leave:update', leave, targets);
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
    const targets = Array.from(new Set([leave.userId, ...(await getFounderIds())]));
    broadcast('leave:delete', { id: req.params.id }, targets);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
