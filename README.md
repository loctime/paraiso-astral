# 🌌 Paraíso Astral

Sitio web de **Paraíso Astral**, productora de música electrónica.
PWA estática con Firestore como backend y Cloudinary para imágenes.

## 🎯 Alcance

Sitio simple de presentación de la productora — **no** es una red social ni plataforma de tickets. Un visitante puede:

- Ver información de la productora (hero, tagline, bio)
- Ver eventos publicados (próximos y pasados)
- Ver artistas del roster con bio y redes
- Ver datos de contacto / redes sociales

El dueño administra todo desde un panel protegido con Firebase Auth + custom claim `admin: true`.

## 🏗️ Arquitectura

```
┌─────────────────────────────────────┐
│  Frontend (HTML/CSS/Vanilla JS)     │
│  index.html + js/ + styles/         │
└────────────┬────────────────────────┘
             │ reads/writes
             ▼
┌─────────────────────────────────────┐
│  DataSource (js/dataSource.js)      │
│  abstraction: Firestore → mock      │
│  fallback si Firestore no disponible│
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  FirestoreClient                    │
│  wraps firebase-firestore-compat    │
│  CRUD sobre events/artists/siteConfig│
└─────────────────────────────────────┘
```

**Colecciones Firestore:**
- `events` — docs de eventos (título, venue, startAt, lineup, flyer, status)
- `artists` — docs de artistas (nombre, bio, foto, redes)
- `siteConfig/main` — un solo doc con config de la productora (nombre, contacto, redes)

**Reglas de seguridad:** ver `firestore.rules`. Lectura pública, escritura solo con custom claim `admin: true`.

**Imágenes:** `js/cloudinaryClient.js` sube con preset unsigned. Ver sección Setup abajo.

## 📁 Estructura

```
paraiso-astral/
├── index.html              # entry point + estructura de páginas
├── manifest.json           # PWA manifest
├── sw.js                   # service worker
├── firestore.rules         # reglas de seguridad Firestore
├── css/, styles/           # CSS (base + theme + components)
├── js/
│   ├── config.js           # lee window.__ENV__ + PUBLIC/PROTECTED routes
│   ├── env.public.js       # (gitignored) generado desde .env
│   ├── firebase.js         # inicializa firebaseAuth + firebaseDb
│   ├── firestoreClient.js  # CRUD sobre Firestore
│   ├── cloudinaryClient.js # upload a Cloudinary (unsigned preset)
│   ├── dataSource.js       # abstracción Firestore ↔ mock
│   ├── auth.js             # wrapper sobre Firebase Auth
│   ├── apiClient.js        # legacy (no se usa con backend off)
│   └── app.js              # router + renders + admin panel
├── scripts/
│   ├── generate-env.js     # genera js/env.public.js desde .env
│   ├── set-admin.js        # setea custom claim admin:true a un user
│   └── secret-scan.js      # escaneo de secretos
└── backend/                # (no se usa con backend off)
```

## 🚀 Setup local

### 1. Configurar entorno

```bash
# Copiá el ejemplo y completá con tus credenciales
cp .env.example .env
# Editá .env con tus valores de Firebase y Cloudinary
```

Generar el archivo público que consume el frontend:

```bash
node scripts/generate-env.js
```

### 2. Servidor local

```bash
# Python
python -m http.server 8787

# O con Node:
npx serve .
```

Luego abrí http://localhost:8787/

### 3. Configurar Firestore

En tu proyecto de Firebase (`paraiso-astral`):

1. **Habilitar Firestore** (si no está): Firebase Console → Firestore Database → Create database
2. **Deployar reglas**:
   ```bash
   firebase deploy --only firestore:rules
   ```
   O copiar `firestore.rules` manualmente en la consola.

### 4. Configurar Cloudinary

Necesitás un upload preset **unsigned** para que el frontend pueda subir imágenes:

1. Cloudinary Console → Settings → Upload → Upload presets → **Add upload preset**
2. Signing Mode: **Unsigned**
3. Preset name: `paraiso_astral` (o el que configures en `VITE_CLOUDINARY_UPLOAD_PRESET` del .env)
4. Folder: `paraiso-astral` (opcional)
5. Save

### 5. Setear tu usuario como admin

El admin se maneja con un **custom claim** de Firebase Auth. Necesitás correrlo **una sola vez** por usuario admin:

```bash
# Primero registrate en la app con tu email/password desde la pantalla de registro
# (o creá el usuario desde Firebase Console)

# Luego:
npm install firebase-admin   # una sola vez
node scripts/set-admin.js tu@email.com
```

El script usa el service account `astral.serviceAccount.json` (en gitignore).

**Después de correrlo, cerrá sesión y volvé a entrar** para que el token incluya el claim.

## 🎛️ Uso del panel admin

1. Entrá a `#admin` en la URL, o hacé click en el link discreto "🔐 Admin" al pie del home
2. Logueate con tu email + password
3. Tabs disponibles:
   - **Resumen** — stats del sitio + estado de Firestore
   - **Eventos** — crear, editar, eliminar (con upload de flyer a Cloudinary)
   - **Artistas** — crear, editar, eliminar (con upload de foto)
   - **Configuración** — nombre, tagline, bio, hero image, contacto, redes

## 🧩 Tecnologías

- HTML5 + CSS3 + Vanilla JS (sin frameworks)
- Firebase Auth + Firestore (compat SDK)
- Cloudinary (unsigned uploads)
- PWA: manifest + service worker

## 🔐 Seguridad

- `.env` y `astral.serviceAccount.json` están en `.gitignore`
- Firestore rules: lectura pública en `events`/`artists`/`siteConfig`, escritura solo con `admin: true`
- Escaneo de secretos: `node scripts/secret-scan.js`
- Hook opcional: `git config core.hooksPath .githooks`
