#!/usr/bin/env node
/**
 * Crea (si no existe) un usuario de Firebase Auth y le aplica el custom claim
 * `admin: true`, que es el que habilita escrituras en Firestore según las
 * reglas de seguridad.
 *
 * Uso:
 *   node scripts/set-admin.js <email> [password]
 *
 *   - Si se pasa password, se usa esa.
 *   - Si no se pasa y el usuario no existe, se genera una temporal aleatoria.
 *   - Si el usuario ya existe, password se ignora.
 *
 * Además imprime un "password reset link" al final para que puedas setear
 * tu propia contraseña sin depender de la temporal.
 *
 * Requisitos:
 *   - `astral.serviceAccount.json` en la raíz del repo (gitignored)
 *   - `npm install firebase-admin` (una sola vez)
 *
 * Después de correrlo, el usuario debe CERRAR SESIÓN y volver a entrar en
 * la app para que el ID token incluya el claim.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const admin = require('firebase-admin');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'astral.serviceAccount.json');

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('❌ No encontré el service account en:', SERVICE_ACCOUNT_PATH);
  console.error('   Descargalo desde Firebase Console → Project Settings → Service Accounts → Generate new private key');
  process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

function generatePassword() {
  // 16 chars: letras + números + un símbolo — suficiente para Firebase (min 6)
  const bytes = crypto.randomBytes(12);
  const base = bytes.toString('base64').replace(/[+/=]/g, '').slice(0, 14);
  return base + '#2';
}

async function main() {
  const email = process.argv[2];
  const providedPassword = process.argv[3];

  if (!email) {
    console.error('Uso: node scripts/set-admin.js <email> [password]');
    process.exit(1);
  }

  let user;
  let wasCreated = false;
  let passwordForOutput = null;

  try {
    user = await admin.auth().getUserByEmail(email);
    console.log('ℹ️  Usuario ya existe:', email, '(uid:', user.uid + ')');
  } catch (err) {
    if (err.code !== 'auth/user-not-found') {
      console.error('❌ Error buscando usuario:', err.message || err);
      process.exit(1);
    }
    // Crear
    const pwd = providedPassword || generatePassword();
    try {
      user = await admin.auth().createUser({
        email: email,
        password: pwd,
        emailVerified: false,
        disabled: false
      });
      wasCreated = true;
      passwordForOutput = pwd;
      console.log('✅ Usuario creado:', email, '(uid:', user.uid + ')');
    } catch (createErr) {
      console.error('❌ Error creando usuario:', createErr.message || createErr);
      process.exit(1);
    }
  }

  // Aplicar custom claim
  try {
    // Preservar otros claims si existieran
    const existing = user.customClaims || {};
    const nextClaims = Object.assign({}, existing, { admin: true });
    await admin.auth().setCustomUserClaims(user.uid, nextClaims);
    console.log('✅ Custom claim admin:true aplicado');
  } catch (err) {
    console.error('❌ Error al aplicar claim:', err.message || err);
    process.exit(1);
  }

  // Link para resetear contraseña (opcional pero útil)
  let resetLink = null;
  try {
    resetLink = await admin.auth().generatePasswordResetLink(email);
  } catch (err) {
    console.warn('⚠️  No pude generar reset link:', err.message || err);
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Listo. Credenciales y próximos pasos:');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Email:      ', email);
  if (passwordForOutput) {
    console.log('  Password:   ', passwordForOutput, '(temporal — cambiala después)');
  } else if (!wasCreated) {
    console.log('  Password:    (no cambió — usá la que ya tenías)');
  }
  if (resetLink) {
    console.log('');
    console.log('  Reset link (abrí en navegador para poner tu propia password):');
    console.log('  ' + resetLink);
  }
  console.log('');
  console.log('  Importante: después de loguearte, cerrá sesión y volvé a entrar');
  console.log('  para que el ID token incluya el claim admin:true.');
  console.log('═══════════════════════════════════════════════════════');
}

main().catch(function (err) {
  console.error('❌ Error inesperado:', err);
  process.exit(1);
});
