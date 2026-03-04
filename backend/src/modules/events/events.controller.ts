import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { EventPublic, EventsQueryParams, EventsResponse } from '../../types/eventPublic';
import { EventStatus, EventVisibility, MembershipRole } from '@prisma/client';
import { createBadRequestError } from '../../utils/errors';
import type { Prisma } from '@prisma/client';

/** Genera slug único a partir del título */
function slugify(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  return base ? `${base}-${Date.now().toString(36)}` : `event-${Date.now()}`;
}

/**
 * Validate and sanitize query parameters for public endpoint
 */
function validateQueryParams(query: EventsQueryParams) {
  const params: {
    status: EventStatus;
    organizationId?: string;
    upcoming?: boolean;
    page: number;
    limit: number;
  } = {
    status: EventStatus.PUBLISHED, // Default
    page: 1,
    limit: 20,
  };

  // Validate status - only PUBLISHED allowed for public endpoint
  if (query.status) {
    if (query.status.toUpperCase() === 'PUBLISHED') {
      params.status = EventStatus.PUBLISHED;
    } else {
      throw createBadRequestError('Invalid status parameter. Only PUBLISHED events are available publicly.');
    }
  }

  // Validate organizationId (non-empty string, max 128 chars)
  if (query.organizationId) {
    const orgId = query.organizationId.trim();
    if (orgId.length > 0 && orgId.length <= 128) {
      params.organizationId = orgId;
    }
  }

  // Validate upcoming filter
  if (query.upcoming === 'true') {
    params.upcoming = true;
  }

  // Validate page (must be positive integer)
  if (query.page) {
    const page = parseInt(query.page, 10);
    if (!isNaN(page) && page > 0 && page <= 1000) { // Reasonable limit
      params.page = page;
    }
  }

  // Validate limit (must be positive integer, max 100)
  if (query.limit) {
    const limit = parseInt(query.limit, 10);
    if (!isNaN(limit) && limit > 0 && limit <= 100) {
      params.limit = limit;
    }
  }

  return params;
}

/**
 * GET /api/events
 * Public endpoint to list events with pagination and filters
 */
export const getEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedParams = validateQueryParams(req.query as EventsQueryParams);
    const now = new Date();

    // Listado público: solo eventos PUBLIC (Access Engine). PRIVATE no se listan aquí.
    const where: Prisma.EventWhereInput = {
      status: validatedParams.status,
      visibility: EventVisibility.PUBLIC,
    };

    if (validatedParams.organizationId) {
      where.organizationId = validatedParams.organizationId;
    }

    if (validatedParams.upcoming) {
      where.startAt = { gte: now };
    }

    // Calculate pagination
    const skip = (validatedParams.page - 1) * validatedParams.limit;

    // Get total count for pagination
    const total = await prisma.event.count({ where });

    // Get events with pagination
    const events = await prisma.event.findMany({
      where,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        startAt: 'asc', // Default ordering as specified
      },
      skip,
      take: validatedParams.limit,
    });

    // Transform to EventPublic format
    const eventsPublic: EventPublic[] = events.map((event) => ({
      id: event.id,
      title: event.title,
      slug: event.slug,
      description: event.description,
      coverImage: event.coverImage, // Keep null as-is
      startAt: event.startAt,
      endAt: event.endAt,
      venue: event.venue,
      city: event.city,
      status: event.status,
      organization: {
        id: event.organization.id,
        name: event.organization.name,
      },
    }));

    // Build response
    const response: EventsResponse = {
      data: eventsPublic,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total,
        totalPages: Math.ceil(total / validatedParams.limit),
      },
    };

    res.json(response);

  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/events/:eventId
 * Detalle de evento. Requiere requireEventAccess (404 si sin acceso).
 * req.event está poblado por el middleware.
 */
export const getEventById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = req.event;
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const org = await prisma.organization.findUnique({
      where: { id: event.organizationId },
      select: { id: true, name: true },
    });

    const eventPublic: EventPublic = {
      id: event.id,
      title: event.title,
      slug: event.slug,
      description: event.description,
      coverImage: event.coverImage,
      startAt: event.startAt,
      endAt: event.endAt,
      venue: event.venue,
      city: event.city,
      status: event.status,
      organization: org ? { id: org.id, name: org.name } : { id: event.organizationId, name: '' },
    };

    res.json(eventPublic);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/events
 * Crear evento. Requiere auth y que el usuario sea ADMIN u OWNER en al menos una organización.
 */
export const createEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user?.id) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const membership = await prisma.membership.findFirst({
      where: {
        userId: user.id,
        role: { in: [MembershipRole.ADMIN, MembershipRole.OWNER] },
      },
      include: { organization: true },
    });
    if (!membership) {
      res.status(403).json({
        error: 'No tienes permiso para crear eventos. Se requiere rol ADMIN u OWNER en una organización.',
      });
      return;
    }

    const body = req.body as {
      title?: string;
      venue?: string;
      startAt?: string;
      endAt?: string;
      description?: string;
    };
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const venue = typeof body.venue === 'string' ? body.venue.trim() : '';
    const startAtRaw = body.startAt;

    if (!title || !venue) {
      throw createBadRequestError('title y venue son obligatorios');
    }
    let startAt: Date;
    try {
      startAt = startAtRaw ? new Date(startAtRaw) : new Date();
      if (Number.isNaN(startAt.getTime())) throw new Error('Invalid date');
    } catch {
      throw createBadRequestError('startAt debe ser una fecha válida (ISO 8601)');
    }

    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const endAtRaw = body.endAt;
    let endAt: Date | null = null;
    if (endAtRaw) {
      try {
        endAt = new Date(endAtRaw);
        if (Number.isNaN(endAt.getTime())) endAt = null;
      } catch {
        endAt = null;
      }
    }

    const slug = slugify(title);
    const event = await prisma.event.create({
      data: {
        organizationId: membership.organizationId,
        title,
        slug,
        description: description || title,
        startAt,
        endAt,
        venue,
        status: EventStatus.DRAFT,
        visibility: EventVisibility.PUBLIC,
      },
      include: {
        organization: { select: { id: true, name: true } },
      },
    });

    const eventPublic: EventPublic = {
      id: event.id,
      title: event.title,
      slug: event.slug,
      description: event.description,
      coverImage: event.coverImage,
      startAt: event.startAt,
      endAt: event.endAt,
      venue: event.venue,
      city: event.city,
      status: event.status,
      organization: event.organization,
    };
    res.status(201).json(eventPublic);
  } catch (error) {
    next(error);
  }
};
