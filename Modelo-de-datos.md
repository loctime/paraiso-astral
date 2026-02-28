1) Modelo de datos definitivo (mínimo profesional)
Organizations (multi-tenant desde el día 1)

organizations

id

name

slug

timezone

currency_default

createdAt

Hoy tenés 1 fila (tu productora). Mañana agregás más.

Users + Memberships (solo staff)

El comprador NO es user.

users (staff: admin/organizer/scanner/rrpp-manager)

id

email (único)

name

passwordHash (o SSO)

status

createdAt

memberships

id

userId

organizationId

role (Owner/Admin/Organizer/Scanner/RRPPManager)

createdAt

Events

events

id

organizationId

title

venue

address

city

startAt

endAt

status (draft/published/ended/canceled)

capacityTotal (opcional si usás cupos por tipo)

createdAt

Ticket Types (precios y cupos viven en backend)

ticketTypes

id

organizationId

eventId

name (General/VIP/Backstage)

price (decimal)

currency

capacity (cupos)

soldCount (contador cacheado)

salesStartAt

salesEndAt

status (active/hidden/soldout)

createdAt

El frontend nunca define precios.

Orders (compras guest)

orders

id

organizationId

eventId

buyerEmail

buyerName (opcional)

status (pending/paid/canceled/expired/refunded)

amountTotal (snapshot)

currency

rrppPromoLinkId (opcional)

stripeCheckoutSessionId

stripePaymentIntentId

createdAt

paidAt

orderItems

id

organizationId

orderId

ticketTypeId

qty

unitPriceSnapshot

createdAt

Tickets (emitidos post-pago)

tickets

id

organizationId

eventId

ticketTypeId

orderId

serial (único y no adivinable)

status (valid/used/refunded/void)

usedAt

usedByUserId (scanner staff)

qrTokenVersion

createdAt

Scanner logs (auditoría)

ticketScans

id

organizationId

ticketId

eventId

scannerUserId

result (ok/already_used/invalid/refunded/wrong_event)

createdAt

2) Flujo de compra (seguro, sin manipulación)
Paso A — Crear checkout (backend)

El frontend envía SOLO:

eventId

items: [{ ticketTypeId, qty }]

buyerEmail (para prefill)

promoCode (si RRPP)

Backend hace:

valida que ticketType pertenece al event + org

valida salesStartAt/salesEndAt

valida stock disponible

calcula precio desde DB

crea order pending + orderItems con snapshot de precios

crea Stripe Checkout Session (monto sale del backend)

responde con URL de Stripe

3) Evitar doble venta por concurrencia (importante)

Estrategia recomendada (robusta y simple para Stripe):

“Hold” temporal de cupos

Al crear el checkout: crear una reserva con TTL (10–15 min)

Esa reserva descuenta disponibilidad “temporal”

Si expira o cancela: se libera

Si paga: se convierte a venta

Esto evita que 200 personas compren el último ticket a la vez.

4) Webhook Stripe (la verdad del pago)

Cuando Stripe confirma pago:

Verifica firma del webhook (Stripe signing secret)

Busca order por stripeCheckoutSessionId

Marca order paid

Incrementa soldCount por ticketType

Emite tickets (1 por unidad)

Genera QR token firmado para cada ticket

(Opcional) envía email al comprador con link a sus tickets

5) QR seguro (no falsificable)

El QR debe contener un token firmado por backend.

Recomendación: JWT firmado (HS256 o RS256).

Payload mínimo:

ticketId

eventId

organizationId

serial

iat

No hace falta que expire si la validación siempre consulta DB (pero podés expirar igual si querés).

6) Verificación en puerta (scanner)

Scanner staff logueado (JWT staff) hace:

Escanea QR

App envía token al backend

Backend:

verifica firma JWT

carga ticket en DB

valida: status=valid, eventId correcto, org correcta

marca used en operación atómica

crea ticketScans log

Respuesta inmediata: OK o motivo de rechazo

7) Multi-tenant hoy sin complicarte

Como hoy solo hay tu productora:

No mostrás selector de org

Backend asigna organizationId “default” al staff

Pero todo en DB ya tiene organizationId

Mañana, para habilitar socios:

Solo agregás nuevas orgs + memberships

Y (si querés) eventCollaborators/revenueShare sin migraciones dolorosas

8) Endpoints mínimos (para planificar el backend)
Público (sin login)

GET /public/events

GET /public/events/:id

POST /checkout/create-session

GET /orders/:id/status (con token de acceso por email o session)

GET /tickets/by-email?email=... (mejor con “magic link”, no abierto)

Staff (con login)

POST /auth/login

GET /me

CRUD /events

CRUD /ticket-types

CRUD /rrpp (si lo hacés)

POST /scanner/validate (scan QR)

Stripe

POST /stripe/webhook

9) Lo único delicado con “guest checkout”

Si el comprador no tiene cuenta, necesitás un mecanismo para que vea sus tickets:

Opciones:
A) Enviar email automático con “Ver mis tickets” (link con token firmado) — recomendado
B) Pantalla post-pago + “descargar tickets” (pero si pierde el link, cagó)
C) “Buscar por email” + enviar magic link

La opción A es la más sólida y simple.

🎯 Etapa 1 — Fundaciones profesionales (sin pagos todavía)

Antes de tocar Stripe necesitamos:

Backend real

Autenticación staff

Organizations + RBAC

CRUD de eventos

CRUD de ticket types

Emisión manual de tickets (simulando pago)

Generación de QR firmado

Scanner funcional

Envío de email

Eso ya convierte tu sistema en profesional.

🧠 Arquitectura inicial recomendada
Estructura general
paraiso-astral/
 ├── frontend/
 └── backend/
🏗 Backend (etapa 1)
Stack recomendado

Node

Express

TypeScript

PostgreSQL

Prisma

JWT

Nodemailer (o Resend) para email

Nada más por ahora.

Módulos backend
backend/src/
  modules/
    auth/
    organizations/
    users/
    events/
    ticketTypes/
    orders/
    tickets/
    scanner/
  middlewares/
  utils/
  server.ts
🧱 Modelo de datos simplificado (etapa 1)

Sin Stripe aún.

organizations

id

name

slug

users (staff)

id

email

passwordHash

name

memberships

userId

organizationId

role

events

id

organizationId

title

venue

startAt

status

ticketTypes

id

organizationId

eventId

name

price

capacity

soldCount

orders (simulados)

id

organizationId

eventId

buyerEmail

status (paid) ← por ahora directo paid

createdAt

tickets

id

organizationId

eventId

ticketTypeId

orderId

serial

status (valid/used)

usedAt

🔐 QR Profesional (desde el inicio)

Cada ticket emitido genera:

{
  ticketId,
  eventId,
  organizationId,
  serial
}

Se firma con JWT:

SECRET solo en backend

QR contiene el token

🎫 Flujo sin pagos (temporal)

Usuario compra (frontend)

Backend crea order status = paid

Backend crea tickets

Backend genera QR

Backend envía email con QR

Scanner valida

Esto te permite probar todo el sistema completo sin Stripe.

📩 Envío de Email

Recomendación:

Usar:

Resend (más simple)
o

Nodemailer + SMTP

Email contiene:

Evento

Datos del ticket

QR como imagen

Link a página “Mis tickets”

🔎 Scanner (clave desde ahora)

Ruta:

POST /scanner/validate

Recibe:

token QR

Valida:

firma JWT

ticket válido

no usado

evento correcto

organization correcta

Marca:

status = used

usedAt = now

🎯 Etapa 2 (cuando agreguemos Stripe)

Solo cambiamos:

creación de order (pending)

webhook

emisión post pago

Todo lo demás queda igual.

