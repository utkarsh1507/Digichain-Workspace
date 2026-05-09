const path = require('path');
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

function sanitizePublicIdPart(value) {
  return String(value || 'file')
    .trim()
    .replace(/\.[^/.]+$/, '')
    .replace(/[^\w-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 180) || 'file';
}

function getFileExtension(filename) {
  return path.extname(filename || '').replace('.', '').toLowerCase();
}

function buildPublicId(filename) {
  return `${Date.now()}-${sanitizePublicIdPart(filename)}`;
}

function normalizePublicId(publicId, format) {
  if (!publicId || !format) return publicId;
  const suffix = `.${format.toLowerCase()}`;
  return publicId.toLowerCase().endsWith(suffix)
    ? publicId.slice(0, -suffix.length)
    : publicId;
}

function getUploadedFileUrl(file, fallbackName) {
  if (!file) return null;

  const originalName = file.originalname || fallbackName || '';
  const format = (file.format || getFileExtension(originalName) || '').toLowerCase();
  const resourceType = file.resource_type || (file.mimetype?.startsWith('image/') ? 'image' : 'raw');
  const publicId = normalizePublicId(file.filename || file.public_id, format);

  if (!publicId) return file.path || file.secure_url || null;

  return cloudinary.url(publicId, {
    secure: true,
    resource_type: resourceType,
    type: 'upload',
    format: format || undefined,
  });
}

function normalizeStoredFileUrl(url, filename) {
  if (!url || !filename || !/res\.cloudinary\.com/i.test(url)) return url;

  const ext = getFileExtension(filename);
  if (ext !== 'pdf') return url;

  return url.replace('/image/upload/', '/raw/upload/').replace('/video/upload/', '/raw/upload/');
}

const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'digichain/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

const messageStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const isImage = file.mimetype.startsWith('image/');
    const format = getFileExtension(file.originalname);

    return {
      folder: 'digichain/messages',
      resource_type: isImage ? 'image' : 'raw',
      public_id: isImage ? undefined : buildPublicId(file.originalname),
      format: !isImage && format ? format : undefined,
      use_filename: false,
      unique_filename: false,
    };
  },
});

const documentStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: 'digichain/documents',
    resource_type: 'raw',
    public_id: buildPublicId(file.originalname),
    format: getFileExtension(file.originalname) || undefined,
    use_filename: false,
    unique_filename: false,
  }),
});

module.exports = {
  cloudinary,
  getUploadedFileUrl,
  normalizeStoredFileUrl,
  uploadAvatar: multer({ storage: avatarStorage, limits: { fileSize: 5 * 1024 * 1024 } }),
  uploadMessage: multer({ storage: messageStorage, limits: { fileSize: 20 * 1024 * 1024 } }),
  uploadDocument: multer({ storage: documentStorage, limits: { fileSize: 50 * 1024 * 1024 } }),
};
