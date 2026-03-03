/**
 * Access Engine — autorización centralizada para acceso a contenido de eventos.
 * Reglas: PUBLIC → allow; PRIVATE → REGISTERED | HAS_TICKET | FOLLOWER según accessMode.
 * Staff (OWNER/ADMIN/ORGANIZER/RRPP_MANAGER/SCANNER en la org del evento) siempre bypass.
 */

import { prisma } from '../../config/prisma';
import type { Event, User } from '@prisma/client';
import { EventVisibility, EventAccessMode, FollowerScope, MembershipRole, TicketStatus } from '@prisma/client';
import type { AccessDecision } from './access.types';

const STAFF_ROLES: MembershipRole[] = [
  MembershipRole.OWNER,
  MembershipRole.ADMIN,
  MembershipRole.ORGANIZER,
  MembershipRole.RRPP_MANAGER,
  MembershipRole.SCANNER,
];

/**
 * Comprueba si el usuario tiene un ticket válido (ownership real) para el evento.
 */
export async function hasValidTicket(userId: string, eventId: string): Promise<boolean> {
  const count = await prisma.ticket.count({
    where: {
      eventId,
      ownerUserId: userId,
      status: TicketStatus.VALID,
    },
  });
  return count > 0;
}

/**
 * Comprueba si el usuario sigue a la organización.
 */
export async function isOrganizationFollower(userId: string, organizationId: string): Promise<boolean> {
  const count = await prisma.organizationFollower.count({
    where: {
      organizationId,
      userId,
    },
  });
  return count > 0;
}

/**
 * Comprueba si el usuario sigue al evento.
 */
export async function isEventFollower(userId: string, eventId: string): Promise<boolean> {
  const count = await prisma.eventFollower.count({
    where: {
      eventId,
      userId,
    },
  });
  return count > 0;
}

/**
 * Comprueba si el usuario es staff de la organización del evento (bypass para ver siempre).
 */
async function isStaffOfEventOrganization(userId: string, organizationId: string): Promise<boolean> {
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: { userId, organizationId },
    },
    select: { role: true },
  });
  return membership !== null && STAFF_ROLES.includes(membership.role);
}

/**
 * Evalúa si el usuario puede acceder al contenido del evento (ver detalle, secciones, beneficios, etc.).
 * No mezcla con RBAC: req.user puede ser null (guest); staff se resuelve por membership en la org del evento.
 */
export async function canAccessEvent(
  user: (User & { firebaseUid?: string }) | null,
  event: Event
): Promise<AccessDecision> {
  // 1. Público → permitir
  if (event.visibility === EventVisibility.PUBLIC) {
    return { allowed: true, reason: 'event_public' };
  }

  // 2. Privado: staff de la org siempre puede (bypass RBAC vs Access Engine)
  if (user) {
    const isStaff = await isStaffOfEventOrganization(user.id, event.organizationId);
    if (isStaff) {
      return { allowed: true, reason: 'staff_bypass' };
    }
  }

  // 3. Privado sin staff → aplicar accessMode
  switch (event.accessMode) {
    case EventAccessMode.REGISTERED:
      if (user) {
        return { allowed: true, reason: 'registered' };
      }
      return { allowed: false, reason: 'private_registered_required' };

    case EventAccessMode.HAS_TICKET:
      if (!user) {
        return { allowed: false, reason: 'private_has_ticket_required' };
      }
      const hasTicket = await hasValidTicket(user.id, event.id);
      if (hasTicket) {
        return { allowed: true, reason: 'has_valid_ticket' };
      }
      return { allowed: false, reason: 'no_valid_ticket' };

    case EventAccessMode.FOLLOWER:
      if (!user) {
        return { allowed: false, reason: 'private_follower_required' };
      }
      if (event.followerScope === FollowerScope.ORGANIZATION) {
        const followsOrg = await isOrganizationFollower(user.id, event.organizationId);
        if (followsOrg) {
          return { allowed: true, reason: 'organization_follower' };
        }
      } else {
        const followsEvent = await isEventFollower(user.id, event.id);
        if (followsEvent) {
          return { allowed: true, reason: 'event_follower' };
        }
      }
      return { allowed: false, reason: 'not_follower' };

    default:
      return { allowed: false, reason: 'invalid_access_mode' };
  }
}
