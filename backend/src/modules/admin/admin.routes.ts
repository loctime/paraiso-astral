import { Router } from 'express';
import { createInvitation } from './admin-invitations.controller';
import { requireAuth } from '../../middlewares/requireAuth';
import { requireRole } from '../../middlewares/requireRole';
import { UserRole } from '@prisma/client';

const router = Router();

// ADMIN — Crear invitación
router.post('/invitations', requireAuth, requireRole([UserRole.ADMIN]), createInvitation);

export { router as adminRoutes };
