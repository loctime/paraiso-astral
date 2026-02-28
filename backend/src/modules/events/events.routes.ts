import { Router } from 'express';
import { getEvents } from './events.controller';

const router: Router = Router();

/**
 * GET /api/events
 * Public endpoint to list events with pagination and filters
 */
router.get('/', getEvents);

export { router as eventsRoutes };
