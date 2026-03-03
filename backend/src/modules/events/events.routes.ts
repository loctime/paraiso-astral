import { Router } from 'express';
import { getEvents, getEventById } from './events.controller';
import { optionalAuth } from '../../middlewares/requireAuth';
import { requireEventAccess } from '../../middlewares/requireEventAccess';

const router: Router = Router();

/**
 * GET /api/events
 * Listado público: solo eventos con visibility PUBLIC.
 */
router.get('/', getEvents);

/**
 * GET /api/events/:eventId
 * Detalle de evento. Access Engine: PUBLIC siempre; PRIVATE según accessMode (REGISTERED/HAS_TICKET/FOLLOWER).
 * optionalAuth permite que usuarios logueados accedan a privados si cumplen reglas.
 */
router.get('/:eventId', optionalAuth, requireEventAccess, getEventById);

export { router as eventsRoutes };
