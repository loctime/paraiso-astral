import { Request, Response, NextFunction } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../../config/env';

function getCloudinaryConfig() {
  const url = env.CLOUDINARY_URL;
  if (!url || !url.startsWith('cloudinary://')) return null;
  try {
    const match = url.match(/cloudinary:\/\/([^:]+):([^@]+)@([^/]+)/);
    if (!match) return null;
    const [, apiKey, apiSecret, cloudName] = match;
    return { cloudName, apiKey, apiSecret };
  } catch {
    return null;
  }
}

export const uploadEventCover = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = getCloudinaryConfig();
    if (!config) {
      res.status(503).json({ error: 'Subida de imágenes no configurada (CLOUDINARY_URL)' });
      return;
    }
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file || !file.buffer) {
      res.status(400).json({ error: 'Falta el archivo de imagen' });
      return;
    }
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
    });
    const b64 = file.buffer.toString('base64');
    const dataUri = `data:${file.mimetype || 'image/jpeg'};base64,${b64}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'paraiso-astral/events',
      resource_type: 'image',
    });
    res.json({ url: result.secure_url });
  } catch (error) {
    console.error('[uploadEventCover] error:', error);
    next(error);
  }
};
