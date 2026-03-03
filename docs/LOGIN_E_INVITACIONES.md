# 🔐 Login e invitaciones – Cómo funciona

## Resumen

- **No hay registro público**: los usuarios entran solo por **login con Firebase** (email + contraseña).
- El **primer admin** se crea con un script (bootstrap) y ese mismo email debe existir en **Firebase Console**.
- El **resto de usuarios** (ARTIST, PR, MEMBER) entran **por invitación**: un admin crea la invitación y el invitado usa ese email en Firebase y luego “acepta” la invitación.

---

## 1) Tu cuenta de admin (primer uso)

### Paso 1: Crear el usuario admin en la base de datos

En el **backend** necesitas un usuario en PostgreSQL con rol `ADMIN`. Para eso se usa el script de bootstrap.

1. En la carpeta **`backend/`** crea o edita el archivo **`.env`** con al menos:
   - `DATABASE_URL` (PostgreSQL)
   - **`BOOTSTRAP_ADMIN_EMAIL`** = el email con el que quieres ser admin (ej: `tu@email.com`).

2. Ejecuta el script de bootstrap (desde la carpeta `backend/`):

   ```bash
   cd backend
   npx ts-node scripts/bootstrap-admin.ts
   ```

   Eso crea (o actualiza) un usuario en la tabla `User` con ese email y rol `ADMIN`.

### Paso 2: Crear el mismo usuario en Firebase (Authentication)

El login usa **solo Firebase Auth** (email + contraseña). La base de datos no guarda la contraseña; Firebase sí.

1. Entra en [Firebase Console](https://console.firebase.google.com) → tu proyecto **Paraíso Astral**.
2. **Authentication** → pestaña **Users** → **Add user**.
3. Pon **el mismo email** que usaste en `BOOTSTRAP_ADMIN_EMAIL` y una contraseña. Guarda.

### Paso 3: Iniciar sesión en la app

1. Backend en marcha: `cd backend && pnpm run dev`.
2. Front en marcha: desde la raíz `npx serve . -p 3000`.
3. Abre **http://localhost:3000**, ve a la pantalla de login e inicia sesión con ese **email** y la **contraseña** que creaste en Firebase.

El backend hace lo siguiente: recibe el token de Firebase, busca en PostgreSQL por el **email** (si no encuentra por `firebaseUid`), te identifica como ese User y actualiza tu `firebaseUid`. A partir de ahí ya quedas como admin y puedes invitar a más gente.

---

## 2) Invitar a más gente (admin)

Como **admin** puedes crear invitaciones. Cada invitación es para un **email** y un **rol** (ARTIST, PR, MEMBER).

### Cómo se crea una invitación (por ahora, por API)

El backend expone:

- **`POST /admin/invitations`**  
  - Header: `Authorization: Bearer <tu_token_firebase>`.  
  - Body (JSON): `{ "email": "invitado@ejemplo.com", "role": "PR" }`.  
  - Respuesta: incluye un **token** de invitación (válido 7 días).

Ejemplo con `curl` (reemplaza `TU_TOKEN` por el token que obtienes al hacer login en la app):

```bash
curl -X POST http://localhost:4000/admin/invitations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d "{\"email\":\"invitado@ejemplo.com\",\"role\":\"PR\"}"
```

En el futuro esto puede estar en el panel de admin (botón “Invitar”, formulario email + rol).

### Qué hace el invitado

1. **Recibe** el email al que enviaste la invitación y el **link o token** (por ahora tú se lo pasas; luego puede ser un link tipo `https://tu-app.com/accept?token=...`).
2. **En Firebase**: ese email debe existir como usuario (email + contraseña).  
   - O el invitado se “registra” en una pantalla de registro (si la tienes),  
   - O tú, como admin, puedes crear ese usuario en Firebase Console (Authentication → Add user) con ese email y una contraseña temporal que le das.
3. **En la app**: el invitado inicia sesión con ese email y contraseña (pantalla de login normal).
4. **Aceptar invitación**: el backend tiene **`POST /invitation/accept`** con body `{ "token": "..." }` y header `Authorization: Bearer <token_firebase>`.  
   Cuando el invitado (ya logueado) llama a ese endpoint con el token que le diste, el backend:
   - Comprueba que el email del token de Firebase coincida con el email de la invitación.
   - Crea el usuario en PostgreSQL con ese email, su `firebaseUid` y el **rol** de la invitación (ARTIST, PR, MEMBER).
   - Marca la invitación como usada.

Por ahora en el front no hay pantalla de “Aceptar invitación”; se puede añadir una ruta tipo `/accept?token=xxx` que, con el usuario ya logueado, llame a `POST /invitation/accept`.

---

## 3) Resumen de flujos

| Quién            | Cómo entra                                                                 |
|------------------|----------------------------------------------------------------------------|
| **Primer admin** | 1) Bootstrap con `BOOTSTRAP_ADMIN_EMAIL` → 2) Crear mismo usuario en Firebase → 3) Login en la app. |
| **Invitados**    | 1) Admin crea invitación (email + rol) → 2) Ese email existe en Firebase (registro o creado por admin) → 3) Invitado hace login → 4) Invitado acepta invitación (POST /invitation/accept con el token). |

**Registro público**: en el front se quitó el enlace de “Regístrate”; el registro solo tiene sentido para invitados (mismo email que la invitación) o para que el admin cree usuarios en Firebase Console. Si quieres, se puede volver a mostrar una pantalla de registro solo para quienes tengan un link de invitación (token en la URL).
