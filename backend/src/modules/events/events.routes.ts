import { Router } from 'express';
import { getEvents, getEventById, createEvent, updateEvent } from './events.controller';
import { optionalAuth, requireAuth } from '../../middlewares/requireAuth';
import { requireEventAccess } from '../../middlewares/requireEventAccess';

const router: Router = Router();

/**
 * GET /api/events
 * Listado público: solo eventos con visibility PUBLIC.
 */
router.get('/', getEvents);

/**
 * POST /api/events
 * Crear evento. Requiere autenticación y rol ADMIN u OWNER en una organización.
 */
router.post('/', requireAuth, createEvent);

/**
 * PATCH /api/events/:eventId
 * Actualizar evento (coverImage, etc.). Solo quien puede editar (ADMIN/OWNER de la org o admin global).
 */
router.patch('/:eventId', requireAuth, updateEvent);

/**
 * GET /api/events/:eventId
 * Detalle de evento. Access Engine: PUBLIC siempre; PRIVATE según accessMode (REGISTERED/HAS_TICKET/FOLLOWER).
 * optionalAuth permite que usuarios logueados accedan a privados si cumplen reglas.
 */
router.get('/:eventId', optionalAuth, requireEventAccess, getEventById);

export { router as eventsRoutes };
