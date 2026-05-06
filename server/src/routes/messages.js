const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { uploadMessage: uploadFile } = require('../lib/cloudinary');
const { broadcast } = require('../lib/events');
const prisma = new PrismaClient();

// ── In-memory typing store ────────────────────────────────────────────────────
// { channelId: { userId: { name, timestamp } } }
const typingStore = {};

const msgInclude = {
  sender: { select: { id: true, name: true, avatar: true } },
};

function parseChannel(c) {
  return { ...c, memberIds: JSON.parse(c.memberIds || '[]') };
}

// ── IMPORTANT: /channels/unread MUST be defined before /channels/:id ─────────

// GET /api/channels/unread — unread counts per channel
router.get('/channels/unread', auth, async (req, res) => {
  try {
    const all = await prisma.channel.findMany();
    const mine = all.filter(c => JSON.parse(c.memberIds || '[]').includes(req.user.id));

    const readRecords = await prisma.channelRead.findMany({ where: { userId: req.user.id } });
    const readMap = {};
    readRecords.forEach(r => { readMap[r.channelId] = r.lastReadAt; });

    const counts = {};
    for (const ch of mine) {
      const readAt = readMap[ch.id];
      const where = {
        channelId: ch.id,
        senderId: { not: req.user.id },
        ...(readAt ? { timestamp: { gt: readAt } } : {}),
      };
      counts[ch.id] = await prisma.message.count({ where });
    }
    res.json(counts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/channels
router.get('/channels', auth, async (req, res) => {
  try {
    const all = await prisma.channel.findMany({ orderBy: { createdAt: 'asc' } });
    const mine = all.filter(c => JSON.parse(c.memberIds || '[]').includes(req.user.id));
    res.json(mine.map(parseChannel));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/channels
router.post('/channels', auth, async (req, res) => {
  try {
    const { name, description, memberIds, type } = req.body;
    const channel = await prisma.channel.create({
      data: { name, description, memberIds: JSON.stringify(memberIds || [req.user.id]), type: type || 'channel' }
    });
    const parsed = parseChannel(channel);
    broadcast('channel:new', parsed, parsed.memberIds);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper: get member IDs of a channel
async function getChannelMembers(channelId) {
  const ch = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!ch) return [];
  return JSON.parse(ch.memberIds || '[]');
}

// GET /api/channels/:id/messages — returns { messages, seenBy }
router.get('/channels/:id/messages', auth, async (req, res) => {
  try {
    const [messages, seenRecords] = await Promise.all([
      prisma.message.findMany({
        where: { channelId: req.params.id },
        include: msgInclude,
        orderBy: { timestamp: 'asc' },
        take: 100,
      }),
      prisma.channelRead.findMany({ where: { channelId: req.params.id } }),
    ]);

    const seenBy = {};
    seenRecords.forEach(r => { seenBy[r.userId] = r.lastReadAt; });

    res.json({
      messages: messages.map(m => ({ ...m, reactions: JSON.parse(m.reactions || '[]') })),
      seenBy,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/channels/:id/messages — text message
router.post('/channels/:id/messages', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const msg = await prisma.message.create({
      data: { channelId: req.params.id, senderId: req.user.id, text },
      include: msgInclude,
    });
    const payload = { ...msg, reactions: [] };
    const memberIds = await getChannelMembers(req.params.id);
    broadcast('message:new', payload, memberIds);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/channels/:id/upload — file/image attachment
router.post('/channels/:id/upload', auth, uploadFile.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const attachmentUrl = req.file.path; // Cloudinary permanent URL
    const isImage = req.file.mimetype.startsWith('image/');
    const msg = await prisma.message.create({
      data: {
        channelId: req.params.id,
        senderId: req.user.id,
        text: req.body.text || null,
        attachmentUrl,
        attachmentName: req.file.originalname,
        attachmentType: isImage ? 'image' : 'file',
      },
      include: msgInclude,
    });
    const payload = { ...msg, reactions: [] };
    const memberIds = await getChannelMembers(req.params.id);
    broadcast('message:new', payload, memberIds);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/channels/:id/react
router.post('/channels/:id/react', auth, async (req, res) => {
  try {
    const { messageId, emoji } = req.body;
    const msg = await prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) return res.status(404).json({ error: 'Not found' });

    let reactions = JSON.parse(msg.reactions || '[]');
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

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { reactions: JSON.stringify(reactions) },
      include: msgInclude,
    });
    const payload = { ...updated, reactions };
    const memberIds = await getChannelMembers(req.params.id);
    broadcast('message:update', payload, memberIds);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/channels/:id/read — mark channel as fully read
router.post('/channels/:id/read', auth, async (req, res) => {
  try {
    const now = new Date();
    await prisma.channelRead.upsert({
      where: { channelId_userId: { channelId: req.params.id, userId: req.user.id } },
      create: { channelId: req.params.id, userId: req.user.id, lastReadAt: now },
      update: { lastReadAt: now },
    });
    // Notify all channel members (including sender) so seen receipts update live
    const memberIds = await getChannelMembers(req.params.id);
    broadcast('channel:read', {
      channelId: req.params.id,
      userId: req.user.id,
      lastReadAt: now.toISOString(),
    }, memberIds);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/channels/:id/typing — set user typing
router.post('/channels/:id/typing', auth, async (req, res) => {
  const { id } = req.params;
  if (!typingStore[id]) typingStore[id] = {};
  typingStore[id][req.user.id] = {
    name: req.body.name || 'Someone',
    timestamp: Date.now(),
  };
  // Push typing state via SSE so other users get it instantly
  const memberIds = await getChannelMembers(id);
  broadcast('channel:typing', {
    channelId: id,
    userId: req.user.id,
    name: req.body.name || 'Someone',
    timestamp: Date.now(),
  }, memberIds.filter(uid => uid !== req.user.id));
  res.json({ ok: true });
});

// GET /api/channels/:id/typing — get who is currently typing
router.get('/channels/:id/typing', auth, async (req, res) => {
  const { id } = req.params;
  const store = typingStore[id] || {};
  const now = Date.now();
  const typers = Object.entries(store)
    .filter(([uid, data]) => uid !== req.user.id && (now - data.timestamp) < 4000)
    .map(([, data]) => data.name);
  res.json(typers);
});

// POST /api/dm/ensure — ensure DM channel exists between two users
router.post('/dm/ensure', auth, async (req, res) => {
  try {
    const { otherUserId } = req.body;
    const ids = [req.user.id, otherUserId].sort();
    const dmName = `dm:${ids.join(':')}`;

    let channel = await prisma.channel.findFirst({ where: { name: dmName } });
    if (!channel) {
      channel = await prisma.channel.create({
        data: { name: dmName, type: 'dm', memberIds: JSON.stringify(ids) }
      });
    }
    res.json(parseChannel(channel));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
