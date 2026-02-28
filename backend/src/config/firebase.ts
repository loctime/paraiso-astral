import admin from 'firebase-admin';
import { env } from './env';

// Initialize Firebase Admin SDK
let firebaseApp: admin.app.App;

if (admin.apps.length > 0) {
  firebaseApp = admin.apps[0]!;
} else {
  const serviceAccount = {
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: env.FIREBASE_PROJECT_ID,
  });
}

export const firestore = firebaseApp.firestore();
export const auth = firebaseApp.auth();

export { firebaseApp };
