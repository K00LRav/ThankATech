// Firebase Admin SDK configuration for server-side operations
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp;
let adminDb;

// Only initialize during runtime, not build time
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  try {
    // Check if admin app already exists
    if (getApps().length === 0) {
      // Initialize Firebase Admin SDK
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        // Using service account key from environment variable
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        adminApp = initializeApp({
          credential: cert(serviceAccount),
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
        // Using individual credentials (Vercel environment variables)
        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        adminApp = initializeApp({
          credential: cert({
            projectId: projectId,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
          projectId: projectId,
        });
      } else if (process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
        // Using default credentials (for deployed environments)
        adminApp = initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      } else {
        console.warn('Firebase Admin SDK not configured - no service account or project ID found');
      }
    } else {
      adminApp = getApps()[0];
    }

    if (adminApp) {
      adminDb = getFirestore(adminApp);
      console.log('✅ Firebase Admin SDK initialized successfully');
    }
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error);
    adminDb = null;
  }
} else {
  console.log('Firebase Admin SDK initialization skipped during build or in browser');
  adminDb = null;
}

export { adminDb };
export default adminApp;