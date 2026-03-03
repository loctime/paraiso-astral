# Despliegue en producción (ej. astral.controldoc.app)

## Por qué falla si solo subes el repo

- **`js/env.public.js`** está en `.gitignore` (tiene claves). En producción ese archivo **no existe** → 404.
- Sin él, `window.__ENV__` queda vacío: no hay API key de Firebase ni URL del API.
- La app ya **no se rompe**: si falta la config, Firebase no se inicializa y se trata como “no logueado”; el resto de la app sigue cargando.

## Cómo tener login y API en producción

Tienes que hacer que en producción exista **configuración pública** (Firebase + URL del API). Dos formas habituales:

### Opción 1: Generar `env.public.js` en el build y desplegarlo

En tu pipeline de despliegue (Netlify, Vercel, GitHub Actions, etc.):

1. Definir en el panel de la plataforma las **variables de entorno** (solo las que empiezan por `VITE_`):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - **`VITE_API_BASE_URL`** → URL real de tu API en producción (ej. `https://api.controldoc.app` o la que uses).

2. En el **comando de build** (o un paso previo), generar el archivo desde esas variables:
   ```bash
   node scripts/generate-env.js
   ```
   (El script lee `.env`; en CI sueles crear un `.env` desde las variables de entorno o adaptar el script para leer `process.env`.)

3. Asegurarte de que **`js/env.public.js`** se incluye en lo que subes/sirves (no lo pongas en `.gitignore` en la carpeta de build; en el repo puede seguir ignorado).

Así, en producción el front carga `env.public.js`, tiene `__ENV__` con Firebase y `VITE_API_BASE_URL`, y el login y las llamadas al API funcionan.

### Opción 2: Inyectar `window.__ENV__` en el HTML

Si tu hosting puede ejecutar un poco de código al servir (o tienes un build que toca el HTML):

- Que el servidor o el build inyecte un `<script>window.__ENV__ = { ... };</script>` **antes** de `config.js`, con las mismas claves (solo las públicas: `VITE_*` y `VITE_API_BASE_URL`).
- Así no necesitas el archivo `env.public.js` en producción.

## API en producción

Si tu backend está en otro dominio (por ejemplo `https://api.controldoc.app`), **tienes que** definir en producción:

- **`VITE_API_BASE_URL`** = `https://tu-api-real.com`

Si no, la app usa el fallback `https://api.paraiso-astral.com` y verás `ERR_NAME_NOT_RESOLVED` si ese dominio no existe.

## Resumen

| Qué quieres        | Qué hacer |
|--------------------|-----------|
| Que la app no se caiga en producción | Ya está: si falta `env.public.js`, no hay error fatal. |
| Login y datos reales en producción   | Generar/inyectar config (env.public.js o `window.__ENV__`) con Firebase y `VITE_API_BASE_URL` en el despliegue. |
