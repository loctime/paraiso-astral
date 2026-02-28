// EJEMPLO DE USO DE FIREBASE ADMIN EN OTRO ARCHIVO

const { auth, firestore, storage } = require('./config/firebaseAdmin');

// Ejemplo: Verificar token de usuario
async function verifyUserToken(idToken) {
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying token:', error);
    throw error;
  }
}

// Ejemplo: Crear usuario en Firestore
async function createUserDocument(uid, userData) {
  try {
    const userRef = firestore.collection('users').doc(uid);
    await userRef.set(userData);
    return userRef.id;
  } catch (error) {
    console.error('Error creating user document:', error);
    throw error;
  }
}

// Ejemplo: Obtener datos de evento
async function getEvent(eventId) {
  try {
    const eventDoc = await firestore.collection('events').doc(eventId).get();
    return eventDoc.exists ? eventDoc.data() : null;
  } catch (error) {
    console.error('Error getting event:', error);
    throw error;
  }
}

// Ejemplo: Subir archivo a Storage
async function uploadFile(filePath, fileBuffer) {
  try {
    const bucket = storage.bucket();
    const file = bucket.file(filePath);
    await file.save(fileBuffer);
    return file.publicUrl();
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

module.exports = {
  verifyUserToken,
  createUserDocument,
  getEvent,
  uploadFile
};
