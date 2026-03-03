# Despliegue en producción (ej. astral.controldoc.app)

## Por qué falla si solo subes el repo

- **`js/env.public.js`** no está en el repo (generado localmente o en el build). En producción ese archivo **no existe** → 404.
- Sin él, `window.__ENV__` queda vacío: no hay API key de Firebase. La **URL del API** en producción tiene fallback a `https://paraiso-astral-api.onrender.com` si no está definida.
- La app no se rompe: si falta la config, Firebase no se inicializa (no hay login) pero las llamadas al API sí funcionan si el backend está en Render.

## Cómo tener login y API en producción (ej. astral.controldoc.app)

Para que **login con Firebase** funcione, en producción tiene que existir `js/env.public.js` con las variables públicas. La forma recomendada es generarlo en el **build** desde variables de entorno.

### Opción 1: Generar `env.public.js` en el build (recomendado)

En la plataforma donde despliegas el **frontend** (Vercel, Netlify, ControlDoc, etc.):

1. **Variables de entorno** en el panel del proyecto:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN` = `paraiso-astral.firebaseapp.com`
   - `VITE_FIREBASE_PROJECT_ID` = `paraiso-astral`
   - `VITE_FIREBASE_STORAGE_BUCKET` = `paraiso-astral.firebasestorage.app`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - **`VITE_API_BASE_URL`** = `https://paraiso-astral-api.onrender.com` (o la URL de tu API)

2. **Comando de build**: que incluya la generación del env antes de servir/subir los estáticos, por ejemplo:
   ```bash
   node scripts/generate-env.js
   ```
   (Si usas solo “static deploy” sin build, añade un build step que ejecute ese comando; el script lee **process.env** en CI, no hace falta archivo `.env`.)

3. El resultado del build debe **incluir** `js/env.public.js` (no debe estar en `.gitignore` en la carpeta de despliegue).

Así, en producción el front carga `env.public.js`, tiene `__ENV__` con Firebase y `VITE_API_BASE_URL`, y el login y las llamadas al API funcionan.

### Opción 2: Inyectar `window.__ENV__` en el HTML

Si tu hosting puede ejecutar un poco de código al servir (o tienes un build que toca el HTML):

- Que el servidor o el build inyecte un `<script>window.__ENV__ = { ... };</script>` **antes** de `config.js`, con las mismas claves (solo las públicas: `VITE_*` y `VITE_API_BASE_URL`).
- Así no necesitas el archivo `env.public.js` en producción.

## Backend en Render

Variables **obligatorias** en el servicio backend:

1. **`FIREBASE_PRIVATE_KEY`** (o `FIREBASE_SERVICE_ACCOUNT_JSON`): contenido completo del JSON del service account. Sin esto el backend no arranca.

2. **`CORS_ORIGIN`**: origen del frontend para que el navegador permita las peticiones al API. Si no la pones, en producción sigue en localhost y verás **"Network error"** en la app.
   - Valor: **`https://astral.controldoc.app`** (o la URL donde tengas el front).
   - Varios orígenes: **`https://astral.controldoc.app,http://localhost:3000`** (separados por coma).

Pasos en Render: Dashboard → servicio backend → Environment → añadir `CORS_ORIGIN` = `https://astral.controldoc.app`.

## API en producción

- Si **no** defines `VITE_API_BASE_URL` en el front, en producción la app usa por defecto **`https://paraiso-astral-api.onrender.com`** (fallback en `config.js`).
- Si tu API está en otra URL, define **`VITE_API_BASE_URL`** en las variables de entorno del despliegue del frontend.

## Resumen

| Qué quieres        | Qué hacer |
|--------------------|-----------|
| Que la app no se caiga y que el API responda en producción | Fallback a `paraiso-astral-api.onrender.com`; sin `env.public.js` el login no funciona pero el resto sí. |
| Login (Firebase) en producción   | En el despliegue del **front**, definir variables `VITE_*` y `VITE_API_BASE_URL`, y ejecutar `node scripts/generate-env.js` en el build para generar `js/env.public.js`. |
