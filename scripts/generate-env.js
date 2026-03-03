/**
 * Genera js/env.public.js desde .env para el frontend.
 * Solo incluye variables VITE_* y VITE_API_BASE_URL (públicas).
 * Ejecutar: node scripts/generate-env.js
 * Requiere: .env en la raíz del proyecto.
 */
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const outPath = path.join(__dirname, '..', 'js', 'env.public.js');

if (!fs.existsSync(envPath)) {
  console.warn('No se encontró .env. Crea js/env.public.js manualmente o copia .env.example a .env.');
  process.exit(1);
}

const content = fs.readFileSync(envPath, 'utf8');
const env = {};
content.split('\n').forEach(function (line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const eq = trimmed.indexOf('=');
  if (eq === -1) return;
  const key = trimmed.slice(0, eq).trim();
  const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  if (key.startsWith('VITE_')) env[key] = value;
});

const output = '// Generado desde .env por scripts/generate-env.js. No editar a mano.\n' +
  'window.__ENV__ = ' + JSON.stringify(env, null, 2) + ';\n';

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, output, 'utf8');
console.log('Escrito: js/env.public.js');
