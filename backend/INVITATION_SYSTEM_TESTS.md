# Pruebas del Sistema de Invitaciones y Roles

## Endpoints Implementados

### 1. ADMIN — Crear invitación
```
POST /admin/invitations
Authorization: Bearer <firebase-id-token-admin>
Content-Type: application/json

{
  "email": "user@example.com",
  "role": "ARTIST" | "PR" | "MEMBER"
}
```

### 2. VALIDAR INVITACIÓN (público)
```
GET /invitation/validate?token=<token>
```

### 3. ACEPTAR INVITACIÓN (requiere auth)
```
POST /invitation/accept
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{
  "token": "<token>"
}
```

## Pruebas CURL

### 1. Crear invitación como ADMIN
```bash
# Primero necesitas un token de Firebase de un usuario con rol ADMIN
curl -X POST http://localhost:3000/admin/invitations \
  -H "Authorization: Bearer <firebase-id-token-admin>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "artist@example.com",
    "role": "ARTIST"
  }'
```

Respuesta esperada:
```json
{
  "success": true,
  "invitation": {
    "id": "cuid...",
    "email": "artist@example.com",
    "role": "ARTIST",
    "expiresAt": "2026-03-07T...",
    "token": "a1b2c3d4..."
  }
}
```

### 2. Validar invitación (público)
```bash
curl -X GET "http://localhost:3000/invitation/validate?token=a1b2c3d4..."
```

Respuesta esperada:
```json
{
  "valid": true,
  "email": "artist@example.com",
  "role": "ARTIST",
  "expiresAt": "2026-03-07T..."
}
```

### 3. Aceptar invitación (requiere auth)
```bash
# El usuario debe estar autenticado con Firebase y el email debe coincidir
curl -X POST http://localhost:3000/invitation/accept \
  -H "Authorization: Bearer <firebase-id-token-user>" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "a1b2c3d4..."
  }'
```

Respuesta esperada:
```json
{
  "success": true,
  "user": {
    "id": "cuid...",
    "email": "artist@example.com",
    "role": "ARTIST",
    "status": "ACTIVE"
  }
}
```

## Casos de Error

### Token inválido
```bash
curl -X GET "http://localhost:3000/invitation/validate?token=invalid"
```
Respuesta: 400 "Invalid invitation token"

### Invitación expirada
Respuesta: 400 "Invitation has expired"

### Email no coincide
Respuesta: 400 "Invitation email does not match your account"

### Usuario ya existe
Respuesta: 400 "User with this email already exists"

### No autorizado (no ADMIN)
```bash
curl -X POST http://localhost:3000/admin/invitations \
  -H "Authorization: Bearer <token-no-admin>" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "role": "ARTIST"}'
```
Respuesta: 403 "Access denied"

## Flujo Completo

1. **Admin** crea invitación con `POST /admin/invitations`
2. **Usuario** recibe token (por email, etc.)
3. **Usuario** valida token con `GET /invitation/validate?token=...`
4. **Usuario** se autentica con Firebase
5. **Usuario** acepta invitación con `POST /invitation/accept`
6. **Sistema** crea usuario con rol asignado

## Notas Importantes

- Las invitaciones expiran en 7 días
- Solo usuarios ADMIN pueden crear invitaciones
- El email de Firebase debe coincidir con el email de la invitación
- Los eventos públicos (`/api/events`) siguen accesibles sin login
- El sistema de roles protege las rutas internas futuras
