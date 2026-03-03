/**
 * Genera js/env.public.js para el frontend.
 * Lee primero process.env (CI/Render/Vercel) y luego .env si existe.
 * Incluye variables VITE_* y VITE_API_BASE_URL (públicas).
 * Ejecutar: node scripts/generate-env.js
 */
const fs = require('fs');
const path = require('path');

const outPath = path.join(__dirname, '..', 'public', 'js', 'env.public.js');
const envPath = path.join(__dirname, '..', '.env');

const PUBLIC_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_API_BASE_URL'
];

const env = {};

// 1) process.env (build en producción: Render, Vercel, etc.)
PUBLIC_KEYS.forEach(function (key) {
  if (process.env[key]) env[key] = process.env[key];
});

// 2) .env local (desarrollo)
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(function (line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (PUBLIC_KEYS.includes(key) && value) env[key] = value;
  });
}

if (Object.keys(env).length === 0) {
  console.warn('No se encontró .env ni variables VITE_* en process.env. js/env.public.js quedará vacío.');
}

const output = '// Generado por scripts/generate-env.js (process.env + .env). No editar a mano.\n' +
  'window.__ENV__ = ' + JSON.stringify(env, null, 2) + ';\n';

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, output, 'utf8');
console.log('Escrito: js/env.public.js');
