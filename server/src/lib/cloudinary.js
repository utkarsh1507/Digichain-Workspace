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

function buildRawPublicId(filename) {
  const ext = getFileExtension(filename);
  const base = buildPublicId(filename);
  return ext ? `${base}.${ext}` : base;
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
  const publicId = resourceType === 'raw'
    ? (file.filename || file.public_id)
    : normalizePublicId(file.filename || file.public_id, format);

  if (!publicId) return file.path || file.secure_url || null;

  return cloudinary.url(publicId, {
    secure: true,
    resource_type: resourceType,
    type: 'upload',
    format: resourceType === 'raw' ? undefined : (format || undefined),
  });
}

function normalizeStoredFileUrl(url, filename) {
  if (!url || !filename || !/res\.cloudinary\.com/i.test(url)) return url;

  const ext = getFileExtension(filename);
  if (ext !== 'pdf') return url;

  return url.replace('/image/upload/', '/raw/upload/').replace('/video/upload/', '/raw/upload/');
}

function parseCloudinaryAsset(url, fallbackName) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const uploadIndex = parts.findIndex((part) => part === 'upload');

    if (uploadIndex <= 0 || uploadIndex >= parts.length - 1) return null;

    const resourceType = parts[uploadIndex - 1] || 'raw';
    const sourceParts = parts.slice(uploadIndex + 1);
    if (sourceParts[0] && /^v\d+$/.test(sourceParts[0])) {
      sourceParts.shift();
    }

    const source = decodeURIComponent(sourceParts.join('/'));
    const format = getFileExtension(fallbackName || source);
    const publicId = resourceType === 'raw'
      ? source
      : (format ? source.replace(new RegExp(`\\.${format}$`, 'i'), '') : source);

    if (!publicId) return null;

    return {
      resourceType,
      publicId,
      format: resourceType === 'raw' ? undefined : (format || undefined),
    };
  } catch {
    return null;
  }
}

function getSignedDownloadUrl(url, filename, options = {}) {
  const asset = parseCloudinaryAsset(url, filename);
  if (!asset) return normalizeStoredFileUrl(url, filename);

  const expiresAt = Math.floor(Date.now() / 1000) + (options.ttlSeconds || 60 * 10);
  return cloudinary.utils.private_download_url(asset.publicId, asset.format, {
    resource_type: asset.resourceType,
    type: 'upload',
    attachment: options.attachmentName || filename || true,
    expires_at: expiresAt,
  });
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

    return {
      folder: 'digichain/messages',
      resource_type: isImage ? 'image' : 'raw',
      public_id: isImage ? undefined : buildRawPublicId(file.originalname),
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
    public_id: buildRawPublicId(file.originalname),
    use_filename: false,
    unique_filename: false,
  }),
});

module.exports = {
  cloudinary,
  getUploadedFileUrl,
  getSignedDownloadUrl,
  normalizeStoredFileUrl,
  uploadAvatar: multer({ storage: avatarStorage, limits: { fileSize: 5 * 1024 * 1024 } }),
  uploadMessage: multer({ storage: messageStorage, limits: { fileSize: 20 * 1024 * 1024 } }),
  uploadDocument: multer({ storage: documentStorage, limits: { fileSize: 50 * 1024 * 1024 } }),
};
