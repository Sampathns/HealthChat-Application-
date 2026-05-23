function getFileData(file) {
  if (!file) return null;
  const url = file.path || file.secure_url || file.url || file.location || '';
  const name = file.originalname || file.filename || file.public_id || '';
  const size = file.size || file.bytes || 0;
  const mimeType = file.mimetype || file.format || '';
  return { url, name, size, mimeType };
}

module.exports = { getFileData };
