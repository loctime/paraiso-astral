import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { EventPublic, EventsQueryParams, EventsResponse } from '../../types/eventPublic';
import { EventStatus } from '@prisma/client';
import { createBadRequestError } from '../../utils/errors';

// Valid values for status parameter (only PUBLISHED allowed for public endpoint)
const VALID_STATUSES = ['PUBLISHED'];

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
    const now = new Date(); // Single instance per request

    // Build where clause
    const where: any = {
      status: validatedParams.status,
    };

    // Add organization filter if provided
    if (validatedParams.organizationId) {
      where.organizationId = validatedParams.organizationId;
    }

    // Add upcoming filter (events starting from now)
    if (validatedParams.upcoming) {
      where.startAt = {
        gte: now,
      };
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
