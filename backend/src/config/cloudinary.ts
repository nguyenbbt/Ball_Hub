import { v2 as cloudinary } from 'cloudinary';

const cloudinaryUrl = process.env.CLOUDINARY_URL;
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const fromCloudinaryUrl = () => {
  if (!cloudinaryUrl) return null;

  try {
    const parsed = new URL(cloudinaryUrl);
    return {
      cloud_name: parsed.hostname,
      api_key: decodeURIComponent(parsed.username),
      api_secret: decodeURIComponent(parsed.password),
    };
  } catch {
    console.warn('[Cloudinary] Invalid CLOUDINARY_URL format. Falling back to discrete env variables.');
    return null;
  }
};

const resolvedConfig = fromCloudinaryUrl() ?? {
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
};

if (!resolvedConfig.cloud_name || !resolvedConfig.api_key || !resolvedConfig.api_secret) {
  console.warn('[Cloudinary] Missing Cloudinary environment variables. Avatar upload endpoint will fail until configured.');
}

cloudinary.config(resolvedConfig);

export { cloudinary };
