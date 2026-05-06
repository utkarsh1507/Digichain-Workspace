require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const DEFAULT_CLIENT_URLS = [
  'https://digichain-workspace.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
];
const DEFAULT_CLIENT_URL_REGEX = [
  '^https://digichain-workspace(-git-[a-z0-9-]+)?\\.vercel\\.app$',
];

function parseAllowedOrigins() {
  const configured = (process.env.CLIENT_URL || DEFAULT_CLIENT_URLS.join(','))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return Array.from(new Set([
    ...configured,
    ...DEFAULT_CLIENT_URLS,
  ]));
}

function parseAllowedOriginRegexes() {
  return (process.env.CLIENT_URL_REGEX || DEFAULT_CLIENT_URL_REGEX.join(','))
    .split(',')
    .map((pattern) => pattern.trim())
    .filter(Boolean)
    .map((pattern) => {
      try {
        return new RegExp(pattern);
      } catch (err) {
        console.warn(`Ignoring invalid CLIENT_URL_REGEX pattern "${pattern}"`);
        return null;
      }
    })
    .filter(Boolean);
}

const allowedOrigins = parseAllowedOrigins();
const allowedOriginRegexes = parseAllowedOriginRegexes();
const uploadsDir = path.join(__dirname, '../uploads');

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  return allowedOriginRegexes.some((pattern) => pattern.test(origin));
}

// Middleware
app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Keep legacy local uploads reachable in dev if the folder exists.
if (fs.existsSync(uploadsDir)) {
  app.use('/uploads', express.static(uploadsDir));
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/leaves', require('./routes/leaves'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api', require('./routes/messages'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/meetings', require('./routes/meetings'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Digichain Workspace Server running on http://localhost:${PORT}`);
  if (fs.existsSync(uploadsDir)) {
    console.log('   Serving legacy local uploads from /uploads');
  }
  console.log(`   CORS enabled for: ${allowedOrigins.join(', ')}\n`);
  if (allowedOriginRegexes.length > 0) {
    console.log(`   CORS regex patterns: ${allowedOriginRegexes.map((pattern) => pattern.toString()).join(', ')}\n`);
  }
});
