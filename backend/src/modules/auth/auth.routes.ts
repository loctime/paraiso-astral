import { Router } from 'express';
import { getCurrentUser } from './auth.controller';
import { requireAuth } from '../../middlewares/requireAuth';
import { requireActiveUser } from '../../middlewares/requireActiveUser';

const router: Router = Router();

// GET /me - Get current user profile
router.get('/me', requireAuth, requireActiveUser, getCurrentUser);

export { router as authRoutes };
