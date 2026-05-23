const cloudinary = require('cloudinary').v2;

exports.getUploadSignature = (req, res) => {
  const folder = req.query.folder || 'healthchat/images';
  // Use a canonical, sorted allowed_formats string so the client and server match.
  const allowedFormatsArr = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'];
  const allowed_formats = allowedFormatsArr.join(',');

  const paramsToSign = {
    allowed_formats,
    folder,
    resource_type: 'auto',
    timestamp: Math.floor(Date.now() / 1000),
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET
  );

  res.json({
    success: true,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    allowed_formats: paramsToSign.allowed_formats,
    folder: paramsToSign.folder,
    resource_type: paramsToSign.resource_type,
    timestamp: paramsToSign.timestamp,
  });
};
