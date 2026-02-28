const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Ruta al archivo de service account
const serviceAccountPath = path.join(__dirname, '..', 'astral.serviceAccount.json');

// Validar que el archivo exista
if (!fs.existsSync(serviceAccountPath)) {
  throw new Error(`Service account file not found: ${serviceAccountPath}`);
}

// Cargar el archivo JSON
const serviceAccount = require(serviceAccountPath);

// Inicializar Firebase Admin solo si no está inicializado
let firebaseApp;

if (admin.apps.length > 0) {
  firebaseApp = admin.apps[0];
} else {
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
}

// Exportar servicios
module.exports = {
  app: firebaseApp,
  auth: admin.auth(),
  firestore: admin.firestore(),
  storage: admin.storage()
};
