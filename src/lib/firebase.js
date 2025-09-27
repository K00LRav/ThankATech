// Firebase configuration and services for ThankATech

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, increment, query, where, orderBy, limit } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:abcdef123456'
};

// Check if Firebase is properly configured
const isFirebaseConfigured = process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
                             process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// Initialize Firebase only if properly configured
let app, db, auth, storage;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
} else {
  console.warn('Firebase not configured. Using mock data mode.');
  // Create mock objects that won't throw errors
  app = null;
  db = null;
  auth = null;
  storage = null;
}

export { db, auth, storage };

// Collection names
const COLLECTIONS = {
  TECHNICIANS: 'technicians',
  USERS: 'users',
  THANK_YOUS: 'thankYous',
  TIPS: 'tips'
};

/**
 * Register a new technician in Firebase
 */
export async function registerTechnician(technicianData) {
  if (!db) {
    console.warn('Firebase not configured. Returning mock data.');
    return { id: 'mock-tech-' + Date.now(), ...technicianData, points: 0 };
  }

  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.TECHNICIANS), {
      ...technicianData,
      points: 0,
      createdAt: new Date(),
      isActive: true,
      totalThankYous: 0,
      totalTips: 0
    });
    
    return { id: docRef.id, ...technicianData };
  } catch (error) {
    console.error('Error registering technician:', error);
    throw error;
  }
}

/**
 * Register a new user in Firebase
 */
export async function registerUser(userData) {
  if (!db) {
    console.warn('Firebase not configured. Returning mock user data.');
    return { id: 'mock-user-' + Date.now(), ...userData };
  }

  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.USERS), {
      ...userData,
      createdAt: new Date(),
      totalThankYousSent: 0,
      totalTipsSent: 0
    });
    
    return { id: docRef.id, ...userData };
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
}

/**
 * Get all registered technicians from Firebase
 */
export async function getRegisteredTechnicians() {
  if (!db) {
    console.warn('Firebase not configured. Returning empty array.');
    return [];
  }

  try {
    const q = query(
      collection(db, COLLECTIONS.TECHNICIANS),
      where('isActive', '==', true),
      orderBy('points', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const technicians = [];
    
    querySnapshot.forEach((doc) => {
      technicians.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return technicians;
  } catch (error) {
    console.error('Error fetching technicians:', error);
    return [];
  }
}

/**
 * Send a "Thank You" to a technician
 */
export async function sendThankYou(technicianId, userId, message = '') {
  if (!db) {
    console.warn('Firebase not configured. Mock thank you sent.');
    return { success: true, pointsAwarded: 1 };
  }

  try {
    // Add thank you record
    await addDoc(collection(db, COLLECTIONS.THANK_YOUS), {
      technicianId,
      userId,
      message,
      timestamp: new Date(),
      points: 10 // 10 points per thank you
    });

    // Update technician points
    const technicianRef = doc(db, COLLECTIONS.TECHNICIANS, technicianId);
    await updateDoc(technicianRef, {
      points: increment(10),
      totalThankYous: increment(1)
    });

    // Update user stats
    if (userId) {
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      await updateDoc(userRef, {
        totalThankYousSent: increment(1)
      });
    }

    return { success: true, pointsAwarded: 10 };
  } catch (error) {
    console.error('Error sending thank you:', error);
    throw error;
  }
}

/**
 * Send a tip to a technician
 */
export async function sendTip(technicianId, userId, amount, message = '') {
  if (!db) {
    console.warn('Firebase not configured. Mock tip sent.');
    return { success: true, pointsAwarded: amount };
  }

  try {
    const points = Math.round(amount * 5); // $1 = 5 points
    
    // Add tip record
    await addDoc(collection(db, COLLECTIONS.TIPS), {
      technicianId,
      userId,
      amount,
      message,
      timestamp: new Date(),
      points
    });

    // Update technician points
    const technicianRef = doc(db, COLLECTIONS.TECHNICIANS, technicianId);
    await updateDoc(technicianRef, {
      points: increment(points),
      totalTips: increment(amount)
    });

    // Update user stats
    if (userId) {
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      await updateDoc(userRef, {
        totalTipsSent: increment(amount)
      });
    }

    return { success: true, pointsAwarded: points };
  } catch (error) {
    console.error('Error sending tip:', error);
    throw error;
  }
}

/**
 * Upload technician profile photo to Firebase Storage
 */
export async function uploadTechnicianPhoto(technicianId, photoFile) {
  try {
    const photoRef = ref(storage, `technicians/${technicianId}/profile.jpg`);
    await uploadBytes(photoRef, photoFile);
    const downloadURL = await getDownloadURL(photoRef);
    
    // Update technician record with photo URL
    const technicianRef = doc(db, COLLECTIONS.TECHNICIANS, technicianId);
    await updateDoc(technicianRef, {
      image: downloadURL
    });
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading photo:', error);
    throw error;
  }
}

/**
 * Get top technicians by points
 */
export async function getTopTechnicians(limitCount = 10) {
  try {
    const q = query(
      collection(db, COLLECTIONS.TECHNICIANS),
      where('isActive', '==', true),
      orderBy('points', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const technicians = [];
    
    querySnapshot.forEach((doc) => {
      technicians.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return technicians;
  } catch (error) {
    console.error('Error fetching top technicians:', error);
    return [];
  }
}

/**
 * Authentication helpers
 */
export const authHelpers = {
  // Sign up new user
  signUp: async (email, password, additionalData = {}) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Add user data to Firestore
      await registerUser({
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        ...additionalData
      });
      
      return userCredential.user;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  },

  // Sign in existing user
  signIn: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  },

  // Sign out
  signOut: async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },

  // Listen to auth state changes
  onAuthStateChanged: (callback) => {
    return onAuthStateChanged(auth, callback);
  }
};

export default app;