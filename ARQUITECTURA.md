ARQUITECTURA IDEAL FINAL
                           ┌──────────────────────────┐
                           │        FIREBASE          │
                           │--------------------------│
                           │ • Auth (usuarios)       │
                           │ • Firestore (realtime)  │
                           │ • Chats / comentarios   │
                           │ • Seguidores / likes    │
                           └─────────────┬────────────┘
                                         │
                                         │ Firebase ID Token
                                         │
──────────────────────────────────────────────────────────────────────
                                         │
                                         ▼
                          ┌──────────────────────────┐
                          │        BACKEND API       │
                          │  (Express + Prisma)      │
                          │--------------------------│
                          │ • RBAC multi-tenant      │
                          │ • RRPP / Productores     │
                          │ • Tickets oficiales      │
                          │ • Pagos / validaciones   │
                          │ • Seguridad / auditoría  │
                          └─────────────┬────────────┘
                                         │
                                         │ Prisma
                                         ▼
                               ┌────────────────┐
                               │ PostgreSQL DB  │
                               │----------------│
                               │ • Orgs         │
                               │ • Events       │
                               │ • Tickets      │
                               │ • Memberships  │
                               │ • Roles        │
                               └────────────────┘
🎯 DOMINIOS CLAROS
1️⃣ Dominio Público (Usuarios comunes)

Qué hace:

Comprar tickets

Comentar

Chatear

Seguir artistas

Compartir

Perfil público

Tecnología:

Firebase Auth

Firestore

Frontend directo a Firebase

Backend solo interviene cuando:

Se valida ticket real

Se crea ticket oficial

Se procesa pago

Se da acceso a espacio físico

2️⃣ Dominio Organizacional (RRPP / Productores)

Qué hace:

Crear eventos

Gestionar tickets

Ver métricas

Gestionar RRPP

Asignar roles

Escanear entradas

Panel admin

Tecnología:

Backend Express

Prisma

PostgreSQL

RBAC profesional

NO usa Firestore como fuente de verdad.
NO depende de datos locales.

🔐 AUTENTICACIÓN IDEAL

Unificamos identidad:

Fuente única de identidad → Firebase Auth

Todos inician sesión con Firebase:

Usuario común

RRPP

Productor

Luego el backend hace esto:

requireAuth:
   1. Verifica Firebase ID Token
   2. Busca usuario interno en PostgreSQL
   3. Carga memberships
   4. Aplica RBAC

De esta forma:

No existe JWT propio separado

No existen dos sistemas paralelos

Un solo token

Un solo flujo mental

Tu backend deja de emitir JWT propio.
Se vuelve consumidor de Firebase como identidad primaria.

Eso simplifica TODO.

📦 ESTRUCTURA DE PROYECTO IDEAL
/apps
   /web-public        → App usuarios
   /web-admin         → Panel RRPP/Productores

/backend
   /src
      /modules
         /auth
         /events
         /tickets
         /organizations
      /middlewares
         requireAuth (Firebase)
         resolveOrganization
         requireRole
      /services
      /routes
      /config
   prisma/
🧱 FRONTEND IDEAL

Hoy tu frontend es demo con DATABASE local.

Ideal:

Web Público

React / Next / Vite

Firebase SDK

Firestore realtime

Compra real integrada a backend

Web Admin

Consume backend únicamente

No usa DATABASE local

No simula pagos

No usa datos hardcodeados

🛑 ERRORES QUE NUNCA DEBEN VOLVER A PASAR

Password hardcodeada

Dos tokens distintos compitiendo

Endpoints debug públicos

Docs diciendo “production ready” cuando no lo está

Front funcionando con base local falsa

🧭 DEFINICIÓN FINAL DE “QUÉ ES LA APP”

La app es:

Plataforma híbrida B2C + B2B para gestión de eventos,
donde Firebase gestiona identidad y experiencia social,
y el backend gestiona control empresarial multi-tenant con RBAC.

Eso es profesional.
Eso escala.
Eso es coherente.