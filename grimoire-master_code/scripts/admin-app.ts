import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });
loadEnv();

// Credentials come from GOOGLE_APPLICATION_CREDENTIALS (path to a service account JSON kept outside git).
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to the path of your Firebase service account JSON.');
  process.exit(1);
}

const databaseId = process.env.FIRESTORE_DB_ID || process.env.VITE_FIREBASE_FIRESTORE_DB_ID;
if (!databaseId) {
  console.error('Set FIRESTORE_DB_ID (or VITE_FIREBASE_FIRESTORE_DB_ID) to the Firestore database ID.');
  process.exit(1);
}

const app = initializeApp({
  credential: applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
});

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app, databaseId);
