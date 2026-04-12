#!/usr/bin/env node
/**
 * Setea el custom claim `admin: true` en un usuario de Firebase Auth.
 * Este claim es el que habilita las reglas de Firestore para escribir
 * eventos/artistas/siteConfig.
 *
 * Uso:
 *   node scripts/set-admin.js <email>
 *
 * Ejemplo:
 *   node scripts/set-admin.js mi@email.com
 *
 * Requisitos:
 *   - Service account en ./astral.serviceAccount.json (ya está en gitignore)
 *   - El usuario debe existir previamente en Firebase Auth (registrate con
 *     ese email desde la pantalla de registro, o creá el usuario desde la
 *     consola de Firebase).
 *   - Después de correr el script, el usuario debe CERRAR SESIÓN y
 *     volver a entrar para que el ID token tenga el claim.
 *
 * Para instalar firebase-admin una sola vez:
 *   npm install firebase-admin
 */
const path = require('path');
const fs = require('fs');

const admin = require('firebase-admin');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'astral.serviceAccount.json');

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('❌ No encontré el service account en:', SERVICE_ACCOUNT_PATH);
  console.error('   Descargá la clave privada desde Firebase Console → Project Settings → Service Accounts → Generate new private key');
  process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Uso: node scripts/set-admin.js <email>');
    process.exit(1);
  }

  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log('✅ Custom claim admin:true aplicado a', email, '(uid:', user.uid + ')');
    console.log('   Importante: el usuario debe cerrar sesión y volver a loguearse para que el token incluya el claim.');
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.error('❌ Usuario no encontrado:', email);
      console.error('   Registrá ese email en la app primero, o creá el usuario desde Firebase Console.');
    } else {
      console.error('❌ Error:', err.message || err);
    }
    process.exit(1);
  }
}

main();
