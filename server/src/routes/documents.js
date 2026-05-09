const router = require('express').Router();
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const {
  uploadDocument: uploadDoc,
  getUploadedFileUrl,
  getSignedDownloadUrl,
  normalizeStoredFileUrl,
} = require('../lib/cloudinary');
const { broadcast } = require('../lib/events');
const prisma = new PrismaClient();

// GET /api/documents
router.get('/', auth, async (req, res) => {
  try {
    const documents = await prisma.document.findMany({
      orderBy: { uploadedAt: 'desc' },
      include: { uploader: { select: { id: true, name: true, avatar: true } } }
    });
    res.json(documents.map((doc) => ({
      ...doc,
      url: normalizeStoredFileUrl(doc.url, doc.name),
    })));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/documents/upload — multipart file upload
router.post('/upload', auth, uploadDoc.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const { folder, description } = req.body;
    const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    const typeMap = {
      pdf: 'PDF', doc: 'Word', docx: 'Word',
      xls: 'Excel', xlsx: 'Excel',
      ppt: 'PowerPoint', pptx: 'PowerPoint',
      png: 'Image', jpg: 'Image', jpeg: 'Image', gif: 'Image',
      zip: 'Archive', rar: 'Archive',
      mp4: 'Video', mp3: 'Audio',
    };
    const fileType = typeMap[ext] || 'Other';
    const fileSizeKB = Math.round(req.file.size / 1024);
    const fileSize = fileSizeKB > 1024 ? `${(fileSizeKB / 1024).toFixed(1)} MB` : `${fileSizeKB} KB`;

    const document = await prisma.document.create({
      data: {
        name: req.file.originalname,
        type: fileType,
        size: fileSize,
        folder: folder || 'General',
        url: getUploadedFileUrl(req.file), // Cloudinary permanent URL
        description: description || null,
        uploaderId: req.user.id,
      },
      include: { uploader: { select: { id: true, name: true, avatar: true } } }
    });
    const normalizedDocument = {
      ...document,
      url: normalizeStoredFileUrl(document.url, document.name),
    };
    broadcast('document:new', normalizedDocument);
    res.json(normalizedDocument);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/documents/:id/download
router.get('/:id/download', auth, async (req, res) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) return res.status(404).json({ error: 'Not found' });

    if (!doc.url) return res.status(404).json({ error: 'File URL missing' });

    const downloadUrl = getSignedDownloadUrl(doc.url, doc.name, {
      attachmentName: doc.name,
    });

    res.redirect(downloadUrl);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    if (doc.uploaderId !== req.user.id && req.user.role !== 'founder') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    // File lives in Cloudinary — no local file to delete
    await prisma.document.delete({ where: { id: req.params.id } });
    broadcast('document:delete', { id: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
