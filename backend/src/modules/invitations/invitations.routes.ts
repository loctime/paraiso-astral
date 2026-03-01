import { Router } from 'express';
import { validateInvitation, acceptInvitation } from './invitations.controller';
import { requireAuth } from '../../middlewares/requireAuth';

const router = Router();

// VALIDAR INVITACIÓN (público)
router.get('/validate', validateInvitation);

// ACEPTAR INVITACIÓN (requiere auth)
router.post('/accept', requireAuth, acceptInvitation);

export { router as invitationsRoutes };
