# Arquitectura — Paraíso Astral

> **Alcance actual:** sitio simple de presentación de la productora. Backend Express/Postgres quedó deshabilitado. Todo corre client-side contra Firestore.

## Decisiones clave

### 1. Backend off, Firestore como única fuente
- No hay API REST propia. El frontend habla directo con Firestore.
- Simplifica infra: no hay Render, no hay Postgres, no hay container.
- Escala para un sitio de productora con docenas de eventos y decenas de artistas — Firestore tier gratuito alcanza.

### 2. Capa `DataSource` como punto de swap
- `js/dataSource.js` es la única puerta de entrada a datos para los renders.
- Intenta Firestore primero; si falla (SDK no inicializado, rules, red) cae a datos mock en memoria.
- Beneficio: durante desarrollo o si falla Firestore, el sitio sigue mostrando algo decente en vez de errores crudos.

### 3. Auth + custom claims para admin
- Firebase Auth maneja login con email+password.
- El rol `admin` se implementa con un **custom claim** de Firebase Auth (no como un campo en Firestore).
- Ventaja: las reglas de Firestore pueden leer `request.auth.token.admin == true` sin necesidad de un `get()` extra (que cuesta lectura).
- Para setear el claim se usa el Firebase Admin SDK (ver `scripts/set-admin.js`).

### 4. Cloudinary para imágenes
- Upload preset **unsigned** → el frontend sube directo sin pasar por un backend.
- URLs públicas se guardan en los docs de Firestore (`coverImage`, `photo`, `heroImage`).
- Cloudinary da transformaciones (resize, crop) en la URL misma si eventualmente las necesitamos.

## Modelo de datos

### Colecciones Firestore

**events/{eventId}**
- `title: string`
- `venue: string`
- `startAt: Timestamp`
- `endAt: Timestamp | null`
- `status: 'DRAFT' | 'PUBLISHED'`
- `coverImage: string` (URL Cloudinary)
- `description: string`
- `lineup: string[]`
- `tags: string[]`
- `createdAt, updatedAt: Timestamp`

**artists/{artistId}**
- `name: string`
- `role: string` (Headliner / Resident / Guest)
- `genre: string`
- `emoji: string` (fallback si no hay foto)
- `photo: string` (URL Cloudinary)
- `bio: string`
- `events: string[]` (IDs de eventos donde toca)
- `socials: { instagram, soundcloud, spotify }`

**siteConfig/main** (único doc)
- `name: string`
- `tagline: string`
- `bio: string`
- `logo: string`
- `heroImage: string`
- `contact: { email, whatsapp, phone }`
- `socials: { instagram, facebook, soundcloud, spotify, youtube }`

### Reglas Firestore (resumen)

```
events/{id}     — read: public, write: admin
artists/{id}    — read: public, write: admin
siteConfig/{id} — read: public, write: admin
```

Ver `firestore.rules` para el detalle.

## Layout del frontend

- `index.html` declara todas las páginas como `<div class="page" id="page-X">`. El router (`navigate()` en `app.js`) activa una a la vez.
- Páginas públicas: `home`, `events`, `event-detail`, `artists`, `artist-detail`, `contact`, `login`, `register`.
- Página protegida: `admin` (requiere user logueado).
- Nav inferior: Inicio, Eventos, Contacto (FAB central), Artistas. El link a Admin está al pie del home, discreto.

## Archivos clave

| Archivo | Responsabilidad |
|---|---|
| `js/config.js` | lee `.env` público, define `PUBLIC_ROUTES` y `PROTECTED_ROUTES` |
| `js/firebase.js` | inicializa `firebaseAuth` + `firebaseDb` |
| `js/firestoreClient.js` | wrapper CRUD sobre Firestore (3 colecciones) |
| `js/cloudinaryClient.js` | upload unsigned a Cloudinary |
| `js/dataSource.js` | abstracción Firestore↔mock para los renders |
| `js/auth.js` | login/logout/getIdToken (Firebase Auth) |
| `js/app.js` | router + todos los renders + admin panel |
| `scripts/generate-env.js` | genera `js/env.public.js` desde `.env` |
| `scripts/set-admin.js` | setea custom claim `admin:true` a un user |

## Features deshabilitadas (código presente pero no accesible)

- Tickets / pasarela de pago
- RRPP (gestión del equipo de relaciones públicas)
- News / notificaciones / feed
- Followers / comentarios
- Backend Express + Postgres en `backend/`

Estas features quedan en el código por si se reactivan más adelante, pero no son reachable desde el nav ni se renderizan.

## Próximos pasos posibles

- **Storage de imágenes**: migrar de Cloudinary a Firebase Storage (más integrado con Auth)
- **Galería de fotos de eventos pasados**
- **Multi-idioma** (ES/EN)
- **Analytics** (Google Analytics o similar)
- **Newsletter integration** (Mailchimp / Sendinblue)
- **Reactivar tickets** con Mercado Pago o Stripe cuando haga falta
