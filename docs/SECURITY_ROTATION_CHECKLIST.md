# Security Rotation Checklist

Fecha: 2026-03-05

## 1) Rotar credenciales expuestas
- [ ] Firebase service account key (crear nueva y revocar la anterior)
- [ ] DATABASE_URL password/user en PostgreSQL
- [ ] CLOUDINARY_URL (api key/api secret)
- [ ] Cualquier JWT secret activo en entornos remotos
- [ ] Passwords temporales de bootstrap/admin

## 2) Actualizar entornos
- [ ] Reemplazar variables en hosting backend
- [ ] Reemplazar variables en CI/CD
- [ ] Verificar que no queden secretos en logs

## 3) Verificacion post-rotacion
- [ ] Login Firebase funcional
- [ ] /api/me responde con usuario valido
- [ ] Upload (si aplica) responde 200 con CLOUDINARY_URL vigente
- [ ] Secret scan pasa sin hallazgos

## 4) Medidas permanentes
- [ ] Mantener `.env` y `js/env.public.js` fuera de git
- [ ] Ejecutar `node scripts/secret-scan.js` antes de push
- [ ] Revisar PRs con foco en secretos y archivos de config
