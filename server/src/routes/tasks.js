const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { broadcast } = require('../lib/events');
const prisma = new PrismaClient();

const include = {
  assignee: { select: { id: true, name: true, avatar: true, title: true } },
  reporter: { select: { id: true, name: true, avatar: true, title: true } },
  comments: { include: { user: { select: { id: true, name: true, avatar: true } } }, orderBy: { createdAt: 'asc' } }
};

// GET /api/tasks
router.get('/', auth, async (req, res) => {
  try {
    const where = req.user.role === 'intern' ? { assigneeId: req.user.id } : {};
    const tasks = await prisma.task.findMany({ where, include, orderBy: { createdAt: 'desc' } });
    const result = tasks.map(t => ({ ...t, tags: t.tags ? JSON.parse(t.tags) : [] }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, priority, dueDate, status, assigneeId, tags } = req.body;
    const task = await prisma.task.create({
      data: { title, description, priority, dueDate, status: status || 'Pending', assigneeId, reporterId: req.user.id, tags: JSON.stringify(tags || []) },
      include
    });
    const payload = { ...task, tags: task.tags ? JSON.parse(task.tags) : [] };
    broadcast('task:new', payload);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/tasks/:id
router.patch('/:id', auth, async (req, res) => {
  try {
    const { tags, ...data } = req.body;
    if (tags !== undefined) data.tags = JSON.stringify(tags);
    const task = await prisma.task.update({ where: { id: req.params.id }, data, include });
    const payload = { ...task, tags: task.tags ? JSON.parse(task.tags) : [] };
    broadcast('task:update', payload);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'intern') return res.status(403).json({ error: 'Forbidden' });
    await prisma.task.delete({ where: { id: req.params.id } });
    broadcast('task:delete', { id: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks/:id/comments
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const comment = await prisma.taskComment.create({
      data: { taskId: req.params.id, userId: req.user.id, text: req.body.text },
      include: { user: { select: { id: true, name: true, avatar: true } } }
    });
    broadcast('task:comment', { taskId: req.params.id, comment });
    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
