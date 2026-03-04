import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../../middlewares/requireAuth';
import { uploadEventCover } from './upload.controller';

const router = Router();
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Solo imágenes (JPEG, PNG, WebP, GIF)'));
  },
});

router.post('/event-cover', requireAuth, upload.single('file'), uploadEventCover);

export { router as uploadRoutes };
