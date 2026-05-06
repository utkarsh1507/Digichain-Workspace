const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { broadcast } = require('../lib/events');
const prisma = new PrismaClient();

// GET /api/announcements
router.get('/', auth, async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true, avatar: true, title: true } } }
    });
    res.json(announcements.map(a => ({ ...a, reactions: JSON.parse(a.reactions || '[]') })));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/announcements — founder/employee can post
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, category, pinned } = req.body;
    const announcement = await prisma.announcement.create({
      data: { title, content, category: category || 'General', pinned: pinned || false, authorId: req.user.id },
      include: { author: { select: { id: true, name: true, avatar: true, title: true } } }
    });
    const payload = { ...announcement, reactions: [] };
    // Broadcast to everyone — announcements are company-wide
    broadcast('announcement:new', payload);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/announcements/:id
router.patch('/:id', auth, async (req, res) => {
  try {
    const ann = await prisma.announcement.findUnique({ where: { id: req.params.id } });
    if (!ann) return res.status(404).json({ error: 'Not found' });
    if (ann.authorId !== req.user.id && req.user.role !== 'founder') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { title, content, category, pinned } = req.body;
    const updated = await prisma.announcement.update({
      where: { id: req.params.id },
      data: { title, content, category, pinned },
      include: { author: { select: { id: true, name: true, avatar: true, title: true } } }
    });
    const payload = { ...updated, reactions: JSON.parse(updated.reactions || '[]') };
    broadcast('announcement:update', payload);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/announcements/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const ann = await prisma.announcement.findUnique({ where: { id: req.params.id } });
    if (!ann) return res.status(404).json({ error: 'Not found' });
    if (ann.authorId !== req.user.id && req.user.role !== 'founder') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await prisma.announcement.delete({ where: { id: req.params.id } });
    broadcast('announcement:delete', { id: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/announcements/:id/react
router.post('/:id/react', auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    const ann = await prisma.announcement.findUnique({ where: { id: req.params.id } });
    if (!ann) return res.status(404).json({ error: 'Not found' });

    let reactions = JSON.parse(ann.reactions || '[]');
    const existing = reactions.find(r => r.emoji === emoji);
    if (existing) {
      if (existing.userIds.includes(req.user.id)) {
        existing.userIds = existing.userIds.filter(id => id !== req.user.id);
        if (!existing.userIds.length) reactions = reactions.filter(r => r.emoji !== emoji);
      } else {
        existing.userIds.push(req.user.id);
      }
    } else {
      reactions.push({ emoji, userIds: [req.user.id] });
    }

    const updated = await prisma.announcement.update({
      where: { id: req.params.id },
      data: { reactions: JSON.stringify(reactions) },
      include: { author: { select: { id: true, name: true, avatar: true, title: true } } }
    });
    const payload = { ...updated, reactions };
    broadcast('announcement:update', payload);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
