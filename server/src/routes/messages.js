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

function parseMemberIds(memberIds) {
  try {
    return JSON.parse(memberIds || '[]');
  } catch {
    return [];
  }
}

function parseChannel(c) {
  return { ...c, memberIds: parseMemberIds(c.memberIds) };
}

function isChannelMember(channel, userId) {
  return parseMemberIds(channel.memberIds).includes(userId);
}

async function getChannel(channelId) {
  return prisma.channel.findUnique({ where: { id: channelId } });
}

async function requireChannelAccess(channelId, userId, res) {
  const channel = await getChannel(channelId);
  if (!channel) {
    res.status(404).json({ error: 'Channel not found' });
    return null;
  }
  if (!isChannelMember(channel, userId)) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  return channel;
}

// ── IMPORTANT: /channels/unread MUST be defined before /channels/:id ─────────

// GET /api/channels/unread — unread counts per channel
router.get('/channels/unread', auth, async (req, res) => {
  try {
    const all = await prisma.channel.findMany();
    const mine = all.filter(c => parseMemberIds(c.memberIds).includes(req.user.id));

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
    const mine = all.filter(c => parseMemberIds(c.memberIds).includes(req.user.id));
    res.json(mine.map(parseChannel));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/channels
router.post('/channels', auth, async (req, res) => {
  try {
    const { name, description, memberIds, type } = req.body;
    const finalMemberIds = Array.from(new Set([...(memberIds || []), req.user.id]));
    const channel = await prisma.channel.create({
      data: {
        name,
        description,
        memberIds: JSON.stringify(finalMemberIds),
        type: type || 'channel',
        createdById: req.user.id,
      }
    });
    const parsed = parseChannel(channel);
    broadcast('channel:new', parsed, parsed.memberIds);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/channels/:id/messages — returns { messages, seenBy }
router.get('/channels/:id/messages', auth, async (req, res) => {
  try {
    const channel = await requireChannelAccess(req.params.id, req.user.id, res);
    if (!channel) return;

    const [messages, seenRecords] = await Promise.all([
      prisma.message.findMany({
        where: { channelId: channel.id },
        include: msgInclude,
        orderBy: { timestamp: 'asc' },
        take: 100,
      }),
      prisma.channelRead.findMany({ where: { channelId: channel.id } }),
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
    const channel = await requireChannelAccess(req.params.id, req.user.id, res);
    if (!channel) return;

    const { text } = req.body;
    const msg = await prisma.message.create({
      data: { channelId: channel.id, senderId: req.user.id, text },
      include: msgInclude,
    });
    const payload = { ...msg, reactions: [] };
    broadcast('message:new', payload, parseMemberIds(channel.memberIds));
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/channels/:id/upload — file/image attachment
router.post('/channels/:id/upload', auth, uploadFile.single('file'), async (req, res) => {
  try {
    const channel = await requireChannelAccess(req.params.id, req.user.id, res);
    if (!channel) return;

    if (!req.file) return res.status(400).json({ error: 'No file' });
    const attachmentUrl = req.file.path; // Cloudinary permanent URL
    const isImage = req.file.mimetype.startsWith('image/');
    const msg = await prisma.message.create({
      data: {
        channelId: channel.id,
        senderId: req.user.id,
        text: req.body.text || null,
        attachmentUrl,
        attachmentName: req.file.originalname,
        attachmentType: isImage ? 'image' : 'file',
      },
      include: msgInclude,
    });
    const payload = { ...msg, reactions: [] };
    broadcast('message:new', payload, parseMemberIds(channel.memberIds));
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/channels/:id/react
router.post('/channels/:id/react', auth, async (req, res) => {
  try {
    const channel = await requireChannelAccess(req.params.id, req.user.id, res);
    if (!channel) return;

    const { messageId, emoji } = req.body;
    const msg = await prisma.message.findFirst({ where: { id: messageId, channelId: channel.id } });
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
    broadcast('message:update', payload, parseMemberIds(channel.memberIds));
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/channels/:channelId/messages/:messageId
router.delete('/channels/:channelId/messages/:messageId', auth, async (req, res) => {
  try {
    const channel = await requireChannelAccess(req.params.channelId, req.user.id, res);
    if (!channel) return;

    const msg = await prisma.message.findFirst({
      where: { id: req.params.messageId, channelId: channel.id },
    });
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.senderId !== req.user.id && req.user.role !== 'founder') {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    await prisma.message.delete({ where: { id: msg.id } });
    broadcast('message:delete', { channelId: channel.id, id: msg.id }, parseMemberIds(channel.memberIds));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/channels/:id
router.delete('/channels/:id', auth, async (req, res) => {
  try {
    const channel = await requireChannelAccess(req.params.id, req.user.id, res);
    if (!channel) return;

    const memberIds = parseMemberIds(channel.memberIds);
    const canDelete = channel.type === 'dm'
      ? memberIds.includes(req.user.id)
      : channel.createdById === req.user.id || req.user.role === 'founder';

    if (!canDelete) {
      return res.status(403).json({
        error: channel.type === 'dm'
          ? 'Forbidden'
          : 'Only the channel creator can delete this channel',
      });
    }

    await prisma.$transaction([
      prisma.channelRead.deleteMany({ where: { channelId: channel.id } }),
      prisma.channel.delete({ where: { id: channel.id } }),
    ]);

    delete typingStore[channel.id];
    broadcast('channel:delete', { id: channel.id }, memberIds);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/channels/:id/read — mark channel as fully read
router.post('/channels/:id/read', auth, async (req, res) => {
  try {
    const channel = await requireChannelAccess(req.params.id, req.user.id, res);
    if (!channel) return;

    const now = new Date();
    await prisma.channelRead.upsert({
      where: { channelId_userId: { channelId: channel.id, userId: req.user.id } },
      create: { channelId: channel.id, userId: req.user.id, lastReadAt: now },
      update: { lastReadAt: now },
    });
    // Notify all channel members (including sender) so seen receipts update live
    broadcast('channel:read', {
      channelId: channel.id,
      userId: req.user.id,
      lastReadAt: now.toISOString(),
    }, parseMemberIds(channel.memberIds));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/channels/:id/typing — set user typing
router.post('/channels/:id/typing', auth, async (req, res) => {
  const channel = await requireChannelAccess(req.params.id, req.user.id, res);
  if (!channel) return;

  const { id } = req.params;
  if (!typingStore[id]) typingStore[id] = {};
  typingStore[id][req.user.id] = {
    name: req.body.name || 'Someone',
    timestamp: Date.now(),
  };
  // Push typing state via SSE so other users get it instantly
  const memberIds = parseMemberIds(channel.memberIds);
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
  const channel = await requireChannelAccess(req.params.id, req.user.id, res);
  if (!channel) return;

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
    let created = false;
    if (!channel) {
      channel = await prisma.channel.create({
        data: { name: dmName, type: 'dm', memberIds: JSON.stringify(ids), createdById: req.user.id }
      });
      created = true;
    }
    const parsed = parseChannel(channel);
    if (created) {
      broadcast('channel:new', parsed, parsed.memberIds);
    }
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
