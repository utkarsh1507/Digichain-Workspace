const router = require('express').Router();
const auth = require('../middleware/auth');
const { addClient, removeClient } = require('../lib/events');

// GET /api/events — Server-Sent Events stream
router.get('/', auth, (req, res) => {
  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');     // disable nginx buffering on prod
  res.flushHeaders?.();

  // Initial hello so the client knows the connection is open
  res.write(`event: connected\ndata: ${JSON.stringify({ userId: req.user.id, time: Date.now() })}\n\n`);

  addClient(req.user.id, res);

  // Heartbeat every 25s to keep the connection alive across proxies
  const heartbeat = setInterval(() => {
    try { res.write(`: ping ${Date.now()}\n\n`); } catch { /* ignore */ }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(req.user.id, res);
  });
});

module.exports = router;
