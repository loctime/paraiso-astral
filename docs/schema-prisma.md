Te diseño el schema Prisma y la arquitectura mínima para soportar:

PUBLIC / PRIVATE

privados con acceso por:

REGISTERED

HAS_TICKET

FOLLOWER

RRPP “automático” (excepción por rol/membership, sin meterlo como accessMode todavía)

Además dejo resuelto el problema crítico: HAS_TICKET con ownership real (hoy tu Order no tiene buyerUserId, así que no podés probar que el ticket sea del requester).

1) Cambios en Prisma (schema.prisma)

Archivo: backend/prisma/schema.prisma (en tu repo actual es schema.prisma)

1.1 Nuevos enums

Agregar arriba de model Organization:

enum EventVisibility {
  PUBLIC
  PRIVATE
}

enum EventAccessMode {
  REGISTERED
  HAS_TICKET
  FOLLOWER
}

enum FollowerScope {
  ORGANIZATION
  EVENT
}
1.2 Extender Event

En model Event agregar:

  visibility   EventVisibility @default(PUBLIC)
  accessMode   EventAccessMode @default(REGISTERED)
  followerScope FollowerScope  @default(ORGANIZATION)

Y agregar índices:

  @@index([organizationId, visibility, startAt])
  @@index([organizationId, visibility, status])

Nota: followerScope te permite decidir si FOLLOWER significa “sigue a la organización” o “sigue a este evento”. Te da flexibilidad sin motor complejo.

1.3 Arreglar ownership de compra (P0 para HAS_TICKET)

En model Order agregar:

  buyerUserId String?
  buyerUser   User? @relation(fields: [buyerUserId], references: [id], onDelete: SetNull)

  @@index([eventId, buyerUserId])

En model User agregar:

  orders Order[] @relation("UserOrders")

Y en model Order ajustar relación con nombre:

  buyerUser   User? @relation("UserOrders", fields: [buyerUserId], references: [id], onDelete: SetNull)

Con esto, una orden puede estar vinculada a un usuario registrado. Si en algún caso vendés sin cuenta, queda null.

1.4 Optimizar tickets para consultas de acceso (recomendado)

En model Ticket agregar:

  ownerUserId String?
  ownerUser   User? @relation(fields: [ownerUserId], references: [id], onDelete: SetNull)

  @@index([eventId, ownerUserId, status])

Esto evita hacer join siempre vía Order → mejora performance y simplifica HAS_TICKET.

1.5 Followers (mínimo viable y escalable)
Opción recomendada (seguir organización + opcional seguir evento)

Agregar:

model OrganizationFollower {
  id             String   @id @default(cuid())
  organizationId String
  userId         String
  createdAt      DateTime @default(now())

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([organizationId, userId])
  @@index([userId, createdAt])
}

model EventFollower {
  id        String   @id @default(cuid())
  eventId   String
  userId    String
  createdAt DateTime @default(now())

  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([eventId, userId])
  @@index([userId, createdAt])
}

Y en model Organization agregar:

  followers OrganizationFollower[]

En model Event agregar:

  followers EventFollower[]

En model User agregar:

  orgFollows  OrganizationFollower[]
  eventFollows EventFollower[]
2) Decisión de producto: ¿Private devuelve 404 o teaser?

Definilo ahora, porque impacta controllers:

Opción A (seguridad fuerte): si no cumple acceso → 404 (evita enumeración)

Opción B (marketing): devuelve detalle mínimo “teaser” pero bloquea secciones/beneficios/compra

Recomendación para arrancar: A (404). Luego si querés, abrimos teaser.

3) Arquitectura backend mínima (sin sobre-diseño)
3.1 Nuevo módulo “Access Engine”

Crear archivos:

backend/src/modules/access/access.types.ts

backend/src/modules/access/access.service.ts

backend/src/middlewares/requireEventAccess.ts

access.types.ts

Define tipos (sin any), por ejemplo:

AccessDecision = { allowed: boolean; reason: string }

AccessContext (si necesitás now, etc.)

access.service.ts

Función central:

canAccessEvent(user, event): AccessDecision

Reglas:

event.visibility === PUBLIC → allow

si PRIVATE:

REGISTERED: user existe

HAS_TICKET: existe ticket con eventId + ownerUserId + status=VALID

FOLLOWER:

si followerScope=ORGANIZATION: existe en OrganizationFollower

si followerScope=EVENT: existe en EventFollower

RRPP automático (por ahora): si user tiene membership rol OWNER|ADMIN|ORGANIZER|RRPP_MANAGER|SCANNER en esa org → allow (para que el staff siempre vea)

Ese “staff bypass” evita bloquear al equipo por reglas de espectador.

3.2 Middleware requireEventAccess

Archivo: backend/src/middlewares/requireEventAccess.ts

Responsabilidad:

Cargar el event por eventId

Evaluar canAccessEvent(req.user ?? null, event)

Si deniega → 404 o 403 según tu decisión

Adjuntar req.event (si querés) para no reconsultar

4) Endpoints que deben usar requireEventAccess

Aplicalo a cualquier ruta “event-scoped” que sea de consumo:

GET /api/events/:eventId (si la tenés)

GET /api/events/:eventId/sections

GET /api/events/:eventId/benefits

GET /api/events/:eventId/presale

POST /api/events/:eventId/orders (importante: compra)

Ojo acá: si accessMode=HAS_TICKET, comprar queda imposible.
Por eso compra debe tener su propia policy:

canPurchaseEvent(user, event) separado de canAccessEvent

ejemplo típico: aunque el evento sea privado, permitís compra a REGISTERED o FOLLOWER, y el contenido interno exige ticket.

Recomendación mínima:

canAccessEvent para ver contenido

canPurchaseEvent para comprar (más permisivo)

5) Cambios en tu codebase actual (lista exacta)

backend/prisma/schema.prisma

agregar enums, campos y modelos (lo de arriba)

Generar migración:

pnpm prisma migrate dev --name add_event_visibility_accessmode_followers

Ajustar creación de órdenes/tickets:

Cuando se crea una Order desde un usuario logueado: setear buyerUserId

Cuando se crean tickets: setear ownerUserId = buyerUserId

Crear Access Engine:

backend/src/modules/access/access.service.ts

backend/src/modules/access/access.types.ts

Middleware:

backend/src/middlewares/requireEventAccess.ts

Aplicarlo en rutas públicas/consumo:

donde hoy devolvés eventos públicos o validás “a mano”

Fix tipado (any) en autorización:

backend/src/middlewares/requireRole.ts (eliminar any)

6) Panel de configuración (quién puede editar)

Regla simple:

solo OWNER/ADMIN/ORGANIZER pueden setear:

visibility

accessMode

followerScope

Esto se enforcea en backend con RBAC (ya lo tenés).

En el front:

en “Crear/Editar Evento” mostrás:

Visibility (PUBLIC/PRIVATE)

Access mode (REGISTERED/HAS_TICKET/FOLLOWER)

Follower scope (ORG/EVENT) (si accessMode=FOLLOWER)