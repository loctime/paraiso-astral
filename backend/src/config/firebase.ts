import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

/**
 * Carga las credenciales de Firebase:
 * - En producción (Render/Vercel): desde FIREBASE_PRIVATE_KEY o FIREBASE_SERVICE_ACCOUNT_JSON (JSON completo del service account).
 * - En local: desde archivo astral.serviceAccount.json.
 */
let serviceAccount: admin.ServiceAccount;

const envJson = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (envJson) {
  try {
    serviceAccount = JSON.parse(envJson) as admin.ServiceAccount;
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is set but contains invalid JSON');
  }
} else {
  const serviceAccountPath = path.join(__dirname, '..', '..', 'astral.serviceAccount.json');
  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(
      `Firebase credentials not found. Set FIREBASE_PRIVATE_KEY or FIREBASE_SERVICE_ACCOUNT_JSON (full JSON) in production, or place astral.serviceAccount.json at: ${serviceAccountPath}`
    );
  }
  serviceAccount = require(serviceAccountPath) as admin.ServiceAccount;
}

// Inicializar Firebase Admin solo si no está inicializado
let firebaseApp: admin.app.App;

if (admin.apps.length > 0) {
  firebaseApp = admin.apps[0]!;
} else {
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
}

export const firestore = firebaseApp.firestore();
export const auth = firebaseApp.auth();
export { firebaseApp };
