/**
 * Access Engine — tipos para autorización de espectadores (visibilidad de eventos).
 * Separado de RBAC: RBAC controla acceso de staff (org/panel); Access Engine controla
 * quién puede ver contenido de eventos (PUBLIC/PRIVATE + REGISTERED/HAS_TICKET/FOLLOWER).
 */

export interface AccessDecision {
  allowed: boolean;
  reason: string;
}

export interface AccessContext {
  now?: Date;
}
