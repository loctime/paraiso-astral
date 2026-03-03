/**
 * Middleware que carga el evento por eventId y aplica el Access Engine.
 * Si el usuario no tiene permiso → 404 (evita enumeración).
 * Adjunta req.event para no reconsultar en el controlador.
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { canAccessEvent } from '../modules/access/access.service';

export const requireEventAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const eventId = req.params.eventId;
    if (!eventId) {
      res.status(400).json({ error: 'eventId is required' });
      return;
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const decision = await canAccessEvent(req.user ?? null, event);
    if (!decision.allowed) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    req.event = event;
    next();
  } catch (error) {
    next(error);
  }
};
