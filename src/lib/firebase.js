// Firebase configuration and services for ThankATech

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, setDoc, updateDoc, increment, query, where, orderBy, limit } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
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
let app, db, auth, storage, googleProvider;

if (isFirebaseConfigured) {
  // Check if Firebase app already exists, if not initialize it
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
  googleProvider = new GoogleAuthProvider();
  
  // Configure Google provider
  googleProvider.addScope('email');
  googleProvider.addScope('profile');
} else {
  console.warn('Firebase not configured. Using mock data mode.');
  // Create mock objects that won't throw errors
  app = null;
  db = null;
  auth = null;
  storage = null;
  googleProvider = null;
}

export { db, auth, storage, googleProvider };

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
    // Create a complete technician profile
    const technicianProfile = {
      // Basic info
      name: technicianData.name,
      email: technicianData.email,
      phone: technicianData.phone,
      location: technicianData.location,
      
      // Business info
      businessName: technicianData.businessName,
      title: `${technicianData.businessName} - ${technicianData.category}`,
      category: technicianData.category,
      businessAddress: technicianData.businessAddress,
      businessPhone: technicianData.businessPhone,
      businessEmail: technicianData.businessEmail,
      website: technicianData.website,
      
      // Service details
      experience: technicianData.experience,
      certifications: technicianData.certifications,
      about: technicianData.description,
      serviceArea: technicianData.serviceArea,
      hourlyRate: technicianData.hourlyRate,
      availability: technicianData.availability,
      
      // Use Google profile image if available, otherwise default
      image: technicianData.photoURL || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      
      // System fields
      points: 0,
      rating: 5.0, // Start with good rating
      createdAt: new Date(),
      isActive: true,
      totalThankYous: 0,
      totalTips: 0,
      userType: 'technician'
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.TECHNICIANS), technicianProfile);
    
    return { id: docRef.id, ...technicianProfile };
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
      totalTipsSent: 0,
      // Store profile image if available from Google
      profileImage: userData.photoURL || null
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
    // Simplified query - no index needed for now
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.TECHNICIANS));
    const technicians = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Filter active technicians in code instead of query
      if (data.isActive) {
        technicians.push({
          id: doc.id,
          ...data
        });
      }
    });
    
    // Sort by points in code instead of query
    technicians.sort((a, b) => (b.points || 0) - (a.points || 0));
    
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

    // Update user stats (with existence check)
    if (userId) {
      try {
        const userRef = doc(db, COLLECTIONS.USERS, userId);
        await updateDoc(userRef, {
          totalThankYousSent: increment(1)
        });
      } catch (error) {
        console.warn(`User document ${userId} not found in users collection, skipping user stats update:`, error.message);
        // This is OK - user might be a technician or the document might not exist
      }
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

    // Update user stats (with existence check)
    if (userId) {
      try {
        const userRef = doc(db, COLLECTIONS.USERS, userId);
        await updateDoc(userRef, {
          totalTipsSent: increment(amount)
        });
      } catch (error) {
        console.warn(`User document ${userId} not found in users collection, skipping user stats update:`, error.message);
        // This is OK - user might be a technician or the document might not exist
      }
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
 * Claim a business from Google Places
 */
export async function claimBusiness(technicianId, claimData) {
  if (!db) {
    console.warn('Firebase not configured. Mock business claimed.');
    return { success: true, id: 'mock-claim-' + Date.now() };
  }

  try {
    // Add business claim record
    const docRef = await addDoc(collection(db, 'businessClaims'), {
      ...claimData,
      status: 'pending',
      createdAt: new Date()
    });

    // Update the technician record to mark as claimed
    const technicianRef = doc(db, COLLECTIONS.TECHNICIANS, technicianId);
    await updateDoc(technicianRef, {
      isClaimed: true,
      claimedBy: claimData.ownerName,
      claimedAt: new Date(),
      claimId: docRef.id
    });

    return { success: true, claimId: docRef.id };
  } catch (error) {
    console.error('Error claiming business:', error);
    throw error;
  }
}

/**
 * Get user from either users or technicians collection by ID
 */
export async function getUserById(userId) {
  if (!db) {
    console.warn('Firebase not configured.');
    return null;
  }

  try {
    // First check users collection
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data(), collection: 'users' };
    }

    // Then check technicians collection
    const techRef = doc(db, COLLECTIONS.TECHNICIANS, userId);
    const techSnap = await getDoc(techRef);
    
    if (techSnap.exists()) {
      return { id: techSnap.id, ...techSnap.data(), collection: 'technicians' };
    }

    return null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

/**
 * Check if user exists in database by email
 */
export async function getUserByEmail(email) {
  if (!db) return null;
  
  try {
    // Check in users collection
    const usersQuery = query(collection(db, COLLECTIONS.USERS), where('email', '==', email));
    const usersSnapshot = await getDocs(usersQuery);
    
    if (!usersSnapshot.empty) {
      const doc = usersSnapshot.docs[0];
      return { id: doc.id, ...doc.data(), userType: 'customer' };
    }
    
    // Check in technicians collection
    const techQuery = query(collection(db, COLLECTIONS.TECHNICIANS), where('email', '==', email));
    const techSnapshot = await getDocs(techQuery);
    
    if (!techSnapshot.empty) {
      const doc = techSnapshot.docs[0];
      return { id: doc.id, ...doc.data(), userType: 'technician' };
    }
    
    return null;
  } catch (error) {
    console.error('Error checking user:', error);
    return null;
  }
}

/**
 * Authentication helpers
 */
export const authHelpers = {
  // Sign in with Google
  signInWithGoogle: async () => {
    if (!auth || !googleProvider) {
      console.warn('Firebase not configured. Using mock Google sign-in.');
      return {
        user: {
          uid: 'mock-google-' + Date.now(),
          email: 'user@gmail.com',
          displayName: 'John Doe',
          photoURL: 'https://via.placeholder.com/150'
        },
        isNewUser: true
      };
    }

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user already exists in our database
      const existingUser = await getUserByEmail(user.email);
      
      if (existingUser) {
        // User exists, sign them in
        return {
          user: existingUser,
          isNewUser: false,
          firebaseUser: user
        };
      } else {
        // New user, they'll need to complete registration
        return {
          user: {
            uid: user.uid,
            email: user.email,
            name: user.displayName,
            photoURL: user.photoURL
          },
          isNewUser: true,
          firebaseUser: user
        };
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  },

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
      
      // Get the full user profile from our database
      const userProfile = await getUserByEmail(email);
      
      if (userProfile) {
        return userProfile;
      } else {
        // Fallback to basic Firebase user if no profile found
        return {
          ...userCredential.user,
          userType: 'customer' // Default userType
        };
      }
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

/**
 * Migration helper: Move technician from users collection to technicians collection
 */
export async function migrateTechnicianProfile(userId) {
  if (!db) {
    console.warn('Firebase not configured. Cannot migrate.');
    return null;
  }

  try {
    // Get user from users collection
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      console.log('User not found in users collection');
      return null;
    }
    
    const userData = userDoc.data();
    
    // Check if user is a technician
    if (userData.userType !== 'technician') {
      console.log('User is not a technician');
      return null;
    }
    
    // Check if already exists in technicians collection
    const existingTechDoc = await getDoc(doc(db, 'technicians', userId));
    if (existingTechDoc.exists()) {
      console.log('Technician profile already exists');
      return { id: existingTechDoc.id, ...existingTechDoc.data() };
    }
    
    // Create technician profile
    const technicianProfile = {
      // Basic info
      name: userData.name,
      email: userData.email,
      phone: userData.phone || '',
      location: userData.location || '',
      
      // Business info
      businessName: userData.businessName || '',
      title: userData.title || `${userData.businessName || 'Technician'} - ${userData.category || 'Service'}`,
      category: userData.category || '',
      businessAddress: userData.businessAddress || '',
      businessPhone: userData.businessPhone || userData.phone || '',
      businessEmail: userData.businessEmail || userData.email,
      website: userData.website || '',
      
      // Service details
      experience: userData.experience || '',
      certifications: userData.certifications || '',
      about: userData.about || userData.description || '',
      serviceArea: userData.serviceArea || '',
      hourlyRate: userData.hourlyRate || '',
      availability: userData.availability || '',
      
      // Profile image - prioritize Google photo
      image: userData.photoURL || userData.profileImage || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      photoURL: userData.photoURL || null,
      
      // Stats
      points: userData.points || 0,
      rating: userData.rating || 5.0,
      totalThankYous: userData.totalThankYous || 0,
      totalTips: userData.totalTips || 0,
      totalTipAmount: userData.totalTipAmount || 0,
      
      // System fields
      createdAt: userData.createdAt || new Date(),
      isActive: true,
      userType: 'technician'
    };
    
    // Add to technicians collection with the same ID
    await setDoc(doc(db, 'technicians', userId), technicianProfile);
    
    console.log('Successfully migrated technician profile');
    return { id: userId, ...technicianProfile };
    
  } catch (error) {
    console.error('Error migrating technician profile:', error);
    throw error;
  }
}

export default app;
