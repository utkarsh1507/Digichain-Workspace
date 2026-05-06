const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

function getCloudinaryConfig() {
  if (process.env.CLOUDINARY_URL) {
    const parsed = new URL(process.env.CLOUDINARY_URL);
    return {
      cloud_name: parsed.hostname,
      api_key: parsed.username,
      api_secret: parsed.password,
      secure: true,
    };
  }

  return {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  };
}

cloudinary.config(getCloudinaryConfig());

// ── Profile photo uploads ─────────────────────────────────────────────────────
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'digichain/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

// ── Message file/photo attachments ───────────────────────────────────────────
const messageStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: 'digichain/messages',
    resource_type: file.mimetype.startsWith('image/') ? 'image' : 'raw',
  }),
});

// ── Company document uploads ──────────────────────────────────────────────────
const documentStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: 'digichain/documents',
    resource_type: 'raw',
    public_id: `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`,
  }),
});

module.exports = {
  uploadAvatar:   multer({ storage: avatarStorage,   limits: { fileSize: 5  * 1024 * 1024 } }),
  uploadMessage:  multer({ storage: messageStorage,  limits: { fileSize: 20 * 1024 * 1024 } }),
  uploadDocument: multer({ storage: documentStorage, limits: { fileSize: 50 * 1024 * 1024 } }),
};
