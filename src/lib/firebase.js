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

// Export with proper type annotations
export { db, auth, storage, googleProvider };

// Collection names
const COLLECTIONS = {
  TECHNICIANS: 'technicians',
  USERS: 'users',
  THANK_YOUS: 'thankYous',
  TIPS: 'tips'
};

// Helper functions for unique ID generation
/**
 * Create a unique ID from email, first name, and last name
 * @param {string} email - User's email address
 * @param {string} firstName - User's first name (optional)
 * @param {string} lastName - User's last name (optional)
 * @returns {string} Unique ID string
 */
function createUniqueId(email, firstName = '', lastName = '') {
  const emailPart = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const namePart = `${firstName}_${lastName}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `${namePart}_${emailPart}`.replace(/_+/g, '_').replace(/^_|_$/g, '');
}

/**
 * Create a unique ID from email only (for cases where names aren't available)
 * @param {string} email - User's email address
 * @returns {string} Unique ID string
 */
function createUniqueIdFromEmail(email) {
  return email.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

/**
 * Register a new technician in Firebase
 */
export async function registerTechnician(technicianData) {
  if (!db) {
    console.warn('Firebase not configured. Returning mock data.');
    return { id: 'mock-tech-' + Date.now(), ...technicianData, points: 0 };
  }

  try {
    // Generate unique ID from email and names
    const uniqueId = createUniqueId(
      technicianData.email, 
      technicianData.name?.split(' ')[0] || '', 
      technicianData.name?.split(' ').slice(1).join(' ') || ''
    );
    
    // Check if unique ID is already taken
    const existingUser = await findUserByUniqueId(uniqueId);
    if (existingUser) {
      throw new Error(`An account is already registered with this name and email combination. Please sign in instead or use different details.`);
    }
    
    // Double-check by email for legacy users
    const existingTechnician = await findTechnicianByEmail(technicianData.email);
    if (existingTechnician && !existingTechnician.uniqueId) {
      // Migrate existing technician to use unique ID
      await updateDoc(doc(db, COLLECTIONS.TECHNICIANS, existingTechnician.id), {
        uniqueId: uniqueId
      });
      return { ...existingTechnician, uniqueId };
    } else if (existingTechnician) {
      throw new Error(`A technician is already registered with email ${technicianData.email}. Please sign in instead or use a different email.`);
    }
    // Create a complete technician profile
    const technicianProfile = {
      // Unique identifier
      uniqueId: uniqueId,
      username: technicianData.username?.toLowerCase().trim(),
      
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
    // Generate unique ID from email and display name
    const displayName = userData.displayName || userData.name || '';
    const firstName = displayName.split(' ')[0] || '';
    const lastName = displayName.split(' ').slice(1).join(' ') || '';
    const uniqueId = createUniqueId(userData.email, firstName, lastName);
    
    // Check if unique ID is already taken
    const existingUser = await findUserByUniqueId(uniqueId);
    if (existingUser) {
      throw new Error(`An account is already registered with this name and email combination. Please sign in instead.`);
    }
    
    const docRef = await addDoc(collection(db, COLLECTIONS.USERS), {
      ...userData,
      uniqueId: uniqueId,
      createdAt: new Date(),
      totalThankYousSent: 0,
      totalTipsSent: 0,
      totalSpent: 0,
      // Store profile image if available from Google
      profileImage: userData.photoURL || null
    });
    
    const newUser = { id: docRef.id, uniqueId, ...userData };

    // Send welcome email (in background, don't block registration)
    if (userData.email && userData.name) {
      try {
        // Import EmailService dynamically to avoid issues with server-side rendering
        const { EmailService } = await import('./email');
        EmailService.sendWelcomeEmail(
          userData.email,
          userData.name,
          userData.userType || 'customer'
        ).catch(error => {
          console.error('Failed to send welcome email:', error);
          // Don't throw - email failure shouldn't fail registration
        });
      } catch (error) {
        console.error('Error importing EmailService:', error);
      }
    }
    
    return newUser;
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
 * Check if user has reached daily thank you limit for a specific technician
 */
export async function checkDailyThankYouLimit(technicianId, userId) {
  if (!db) {
    console.warn('Firebase not configured. Mock limit check.');
    return { canSend: true, remaining: 3 };
  }

  try {
    // Get start and end of today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Query thank yous sent by this user to this technician today
    const q = query(
      collection(db, COLLECTIONS.THANK_YOUS),
      where('technicianId', '==', technicianId),
      where('userId', '==', userId),
      where('timestamp', '>=', today),
      where('timestamp', '<', tomorrow)
    );

    const querySnapshot = await getDocs(q);
    const todayCount = querySnapshot.size;
    const dailyLimit = 3;
    
    return {
      canSend: todayCount < dailyLimit,
      remaining: Math.max(0, dailyLimit - todayCount),
      todayCount: todayCount
    };
  } catch (error) {
    console.error('Error checking daily thank you limit:', error);
    // In case of error, allow the thank you but log the issue
    return { canSend: true, remaining: 3, todayCount: 0 };
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
    // Check daily limit first
    const limitCheck = await checkDailyThankYouLimit(technicianId, userId);
    if (!limitCheck.canSend) {
      return { 
        success: false, 
        error: `Daily limit reached. You can send ${limitCheck.remaining} more thank yous to this technician today.`,
        remaining: limitCheck.remaining
      };
    }
    // Add thank you record
    await addDoc(collection(db, COLLECTIONS.THANK_YOUS), {
      technicianId,
      userId,
      message,
      timestamp: new Date(),
      points: 10 // 10 points per thank you
    });

    // Update technician points (with existence check for mock data)
    const technicianRef = doc(db, COLLECTIONS.TECHNICIANS, technicianId);
    let technicianData = null;
    try {
      // First check if the document exists
      const techDoc = await getDoc(technicianRef);
      if (techDoc.exists()) {
        technicianData = techDoc.data();
        await updateDoc(technicianRef, {
          points: increment(10),
          totalThankYous: increment(1)
        });
      } else {
        console.warn(`Technician document ${technicianId} not found in Firestore. This is normal for mock data.`);
      }
    } catch (error) {
      console.warn(`Unable to update technician document ${technicianId}:`, error.message);
      // Continue execution - this is OK for mock data
    }

    // Update user stats (with existence check)
    let userData = null;
    if (userId) {
      try {
        const userRef = doc(db, COLLECTIONS.USERS, userId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          userData = userDoc.data();
          await updateDoc(userRef, {
            totalThankYousSent: increment(1)
          });
        }
      } catch (error) {
        console.warn(`User document ${userId} not found in users collection, skipping user stats update:`, error.message);
        // This is OK - user might be a technician or the document might not exist
      }
    }

    // Send email notification to technician (in background, don't block the request)
    if (technicianData && technicianData.email && userData) {
      try {
        // Import EmailService dynamically to avoid issues with server-side rendering
        const { EmailService } = await import('./email');
        EmailService.sendThankYouNotification(
          technicianData.email,
          technicianData.name || 'Technician',
          userData.name || 'A customer',
          message
        ).catch(error => {
          console.error('Failed to send thank you email notification:', error);
          // Don't throw - email failure shouldn't fail the thank you
        });
      } catch (error) {
        console.error('Error importing EmailService:', error);
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

    // Update technician points (with existence check for mock data)
    const technicianRef = doc(db, COLLECTIONS.TECHNICIANS, technicianId);
    let technicianData = null;
    try {
      // First check if the document exists
      const techDoc = await getDoc(technicianRef);
      if (techDoc.exists()) {
        technicianData = techDoc.data();
        await updateDoc(technicianRef, {
          points: increment(points),
          totalTips: increment(1), // Count of tips, not dollar amount
          totalEarnings: increment(amount) // Track total earnings separately
        });
      } else {
        console.warn(`Technician document ${technicianId} not found in Firestore. This is normal for mock data.`);
      }
    } catch (error) {
      console.warn(`Unable to update technician document ${technicianId}:`, error.message);
      // Continue execution - this is OK for mock data
    }

    // Update user stats (with existence check)
    let userData = null;
    if (userId) {
      try {
        const userRef = doc(db, COLLECTIONS.USERS, userId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          userData = userDoc.data();
          await updateDoc(userRef, {
            totalTipsSent: increment(amount),
            totalSpent: increment(amount)
          });
        }
      } catch (error) {
        console.warn(`User document ${userId} not found in users collection, skipping user stats update:`, error.message);
        // This is OK - user might be a technician or the document might not exist
      }
    }

    // Send email notification to technician (in background, don't block the request)
    if (technicianData && technicianData.email && userData) {
      try {
        // Import EmailService dynamically to avoid issues with server-side rendering
        const { EmailService } = await import('./email');
        EmailService.sendTipNotification(
          technicianData.email,
          technicianData.name || 'Technician',
          userData.name || 'A customer',
          amount,
          message
        ).catch(error => {
          console.error('Failed to send tip email notification:', error);
          // Don't throw - email failure shouldn't fail the tip
        });
      } catch (error) {
        console.error('Error importing EmailService:', error);
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
    
    // Update technician record with photo URL (with existence check)
    const technicianRef = doc(db, COLLECTIONS.TECHNICIANS, technicianId);
    try {
      const techDoc = await getDoc(technicianRef);
      if (techDoc.exists()) {
        await updateDoc(technicianRef, {
          image: downloadURL
        });
      } else {
        console.warn(`Technician document ${technicianId} not found for photo update. This is normal for mock data.`);
      }
    } catch (error) {
      console.warn(`Unable to update technician photo for ${technicianId}:`, error.message);
    }
    
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

    // Update the technician record to mark as claimed (with existence check)
    const technicianRef = doc(db, COLLECTIONS.TECHNICIANS, technicianId);
    try {
      const techDoc = await getDoc(technicianRef);
      if (techDoc.exists()) {
        await updateDoc(technicianRef, {
          isClaimed: true,
          claimedBy: claimData.ownerName,
          claimedAt: new Date(),
          claimId: docRef.id
        });
      } else {
        console.warn(`Technician document ${technicianId} not found for business claim. This is normal for mock data.`);
      }
    } catch (error) {
      console.warn(`Unable to update technician claim status for ${technicianId}:`, error.message);
    }

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
  // Sign in with Google with unified technician handling
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
      
      
      // Generate unique ID for this user
      const displayName = user.displayName || '';
      const firstName = displayName.split(' ')[0] || '';
      const lastName = displayName.split(' ').slice(1).join(' ') || '';
      const uniqueId = createUniqueId(user.email, firstName, lastName);
      
      // Check if user already exists with this unique ID
      const existingUser = await findUserByUniqueId(uniqueId);
      
      if (existingUser) {
        
        // Link Google account to existing user if not already linked
        if (existingUser.uid !== user.uid) {
          const collectionName = existingUser.userType === 'technician' ? COLLECTIONS.TECHNICIANS : COLLECTIONS.USERS;
          await updateDoc(doc(db, collectionName, existingUser.id), {
            uid: user.uid,
            photoURL: user.photoURL // Update photo from Google
          });
        }
        
        return {
          user: { ...existingUser, uid: user.uid, photoURL: user.photoURL },
          isNewUser: false,
          firebaseUser: user,
          linkedExisting: true
        };
      } else {
        // Check legacy users by email (for migration)
        const legacyTechnician = await findTechnicianByEmail(user.email);
        if (legacyTechnician && !legacyTechnician.uniqueId) {
          await updateDoc(doc(db, COLLECTIONS.TECHNICIANS, legacyTechnician.id), {
            uniqueId: uniqueId,
            uid: user.uid,
            photoURL: user.photoURL
          });
          
          return {
            user: { ...legacyTechnician, uniqueId, uid: user.uid, photoURL: user.photoURL },
            isNewUser: false,
            firebaseUser: user,
            linkedExisting: true
          };
        }
        
        const legacyUser = await getUserByEmail(user.email);
        if (legacyUser && !legacyUser.uniqueId) {
          await updateDoc(doc(db, COLLECTIONS.USERS, legacyUser.id), {
            uniqueId: uniqueId,
            uid: user.uid,
            photoURL: user.photoURL
          });
          
          return {
            user: { ...legacyUser, uniqueId, uid: user.uid, photoURL: user.photoURL },
            isNewUser: false,
            firebaseUser: user
          };
        }
        
        // New user, they'll need to complete registration
        return {
          user: {
            uid: user.uid,
            email: user.email,
            name: user.displayName,
            photoURL: user.photoURL,
            uniqueId: uniqueId
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
      return null;
    }
    
    const userData = userDoc.data();
    
    // Check if user is a technician
    if (userData.userType !== 'technician') {
      return null;
    }
    
    // Check if already exists in technicians collection
    const existingTechDoc = await getDoc(doc(db, 'technicians', userId));
    if (existingTechDoc.exists()) {
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
    
    return { id: userId, ...technicianProfile };
    
  } catch (error) {
    console.error('Error migrating technician profile:', error);
    throw error;
  }
}

// Delete user profile and related data
export async function deleteUserProfile(userId, userType = 'customer') {
  if (!isFirebaseConfigured) {
    return;
  }

  let userEmail = null;
  let userName = null;

  try {
    const { deleteDoc, getDoc } = await import('firebase/firestore');
    
    // Retrieve user information before deletion for email notification
    try {
      let userDoc;
      if (userType === 'technician') {
        userDoc = await getDoc(doc(db, COLLECTIONS.TECHNICIANS, userId));
      } else {
        userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
      }
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        userEmail = userData.email;
        userName = userData.name || userData.displayName;
      }
    } catch (retrievalError) {
      console.error('Error retrieving user data for email notification:', retrievalError);
    }
    
    // Delete from appropriate collection based on user type
    if (userType === 'technician') {
      // Delete from technicians collection
      // This automatically removes them from rolodex cards since 
      // getRegisteredTechnicians() fetches from this collection
      await deleteDoc(doc(db, COLLECTIONS.TECHNICIANS, userId));
      
      // Also check and delete from users collection if exists (for dual registrations)
      try {
        await deleteDoc(doc(db, COLLECTIONS.USERS, userId));
      } catch (userError) {
        // User document may not exist, which is fine
      }
    } else {
      // Delete from users collection
      await deleteDoc(doc(db, COLLECTIONS.USERS, userId));
    }

    // Send account deletion confirmation email (in background)
    if (userEmail && userName) {
      try {
        const { EmailService } = await import('./email');
        EmailService.sendAccountDeletionEmail(
          userEmail,
          userName,
          userType
        ).catch(error => {
          console.error('Failed to send account deletion email:', error);
          // Don't throw - email failure shouldn't fail deletion
        });
      } catch (error) {
        console.error('Error importing EmailService:', error);
      }
    }
    
    // TODO: Future enhancements for production:
    // - Delete user's photos from Firebase Storage
    // - Clean up related data (tips, thank yous, ratings, etc.)
    // - Delete the Firebase Auth user account (requires admin SDK)
    // - Archive data for compliance/recovery purposes
    
    
  } catch (error) {
    console.error('Error deleting user profile:', error);
    throw error;
  }
}

/**
 * Record a successful tip transaction
 * @param {Object} transactionData - Transaction details
 * @returns {Promise<string>} Transaction ID
 */
export async function recordTransaction(transactionData) {
  
  if (!db) {
    console.warn('❌ Firebase not configured - transaction not recorded');
    return null;
  }
  
  try {
    // Find the technician to get their unique ID
    const technician = transactionData.technicianId ? 
      await getTechnician(transactionData.technicianId) : 
      await findTechnicianByEmail(transactionData.technicianEmail);
      
    if (!technician) {
      console.error('❌ Technician not found for transaction');
      throw new Error('Technician not found');
    }
    
    // Find customer if provided
    let clientUniqueId = null;
    if (transactionData.customerId) {
      const client = await getUser(transactionData.customerId);
      clientUniqueId = client?.uniqueId;
    } else if (transactionData.customerEmail) {
      const client = await getUserByEmail(transactionData.customerEmail);
      clientUniqueId = client?.uniqueId;
    }
    
    const transaction = {
      ...transactionData,
      technicianUniqueId: technician.uniqueId || technician.id, // Fallback for legacy data
      clientUniqueId: clientUniqueId,
      createdAt: new Date().toISOString(),
      status: 'completed'
    };
    
    
    // Add to tips collection
    const docRef = await addDoc(collection(db, COLLECTIONS.TIPS), transaction);
    
    // Update technician's total earnings and tip count (only if technician document exists)
    if (transactionData.technicianId) {
      try {
        const technicianRef = doc(db, COLLECTIONS.TECHNICIANS, transactionData.technicianId);
        
        await updateDoc(technicianRef, {
          totalEarnings: increment(transactionData.amount),
          totalTips: increment(1), // Count of tips received, not dollar amount
          totalThankYous: increment(1), // Each tip also counts as appreciation
          lastTipDate: new Date().toISOString()
        });
      } catch (updateError) {
        console.warn('⚠️ Could not update technician document earnings:', updateError);
        // Continue execution - the transaction is still recorded in tips collection
      }
    }

    // Update customer's tip totals if customer exists
    if (transactionData.customerId) {
      try {
        const clientRef = doc(db, COLLECTIONS.USERS, transactionData.customerId);
        const tipAmountInDollars = transactionData.amount / 100; // Convert cents to dollars
        
        await updateDoc(clientRef, {
          totalTipsSent: increment(1), // Count of tips sent, not dollar amount
          totalSpent: increment(tipAmountInDollars) // Dollar amount spent
        });
      } catch (updateError) {
        console.warn('⚠️ Could not update customer document totals:', updateError);
        // Continue execution - the transaction is still recorded
      }
    }
    
    return docRef.id;
  } catch (error) {
    console.error('❌ Error recording transaction:', error);
    throw error;
  }
}

/**
 * Get a single technician by ID
 * @param {string} technicianId - Technician ID
 * @returns {Promise<Object|null>} Technician data or null
 */
export async function getTechnician(technicianId) {
  if (!db || !technicianId) return null;
  
  try {
    
    // Try technicians collection first
    const techDoc = await getDoc(doc(db, COLLECTIONS.TECHNICIANS, technicianId));
    if (techDoc.exists()) {
      const techData = { id: techDoc.id, ...techDoc.data() };
      return techData;
    }
    
    // Try users collection as fallback
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, technicianId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      if (userData.userType === 'technician') {
        const techData = { id: userDoc.id, ...userData };
        return techData;
      }
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error getting technician:', error);
    return null;
  }
}

/**
 * Get a single user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User data or null
 */
export async function getUser(userId) {
  if (!db || !userId) return null;
  
  try {
    
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
    if (userDoc.exists()) {
      const userData = { id: userDoc.id, ...userDoc.data() };
      return userData;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error getting user:', error);
    return null;
  }
}

/**
 * Get technician's earnings from Firebase
 * @param {string} technicianId - Technician ID
 * @returns {Promise<Object>} Earnings data
 */
/**
 * Find user by unique ID across all collections
 * @param {string} uniqueId - Unique ID to search for
 * @returns {Promise<Object|null>} User profile or null
 */
export async function findUserByUniqueId(uniqueId) {
  if (!db || !uniqueId) return null;
  
  try {
    
    // Search in technicians collection first
    const techQuery = query(
      collection(db, COLLECTIONS.TECHNICIANS),
      where('uniqueId', '==', uniqueId),
      limit(1)
    );
    const techSnapshot = await getDocs(techQuery);
    
    if (!techSnapshot.empty) {
      const techDoc = techSnapshot.docs[0];
      const techData = { id: techDoc.id, ...techDoc.data() };
      return techData;
    }
    
    // Search in users collection
    const userQuery = query(
      collection(db, COLLECTIONS.USERS),
      where('uniqueId', '==', uniqueId),
      limit(1)
    );
    const userSnapshot = await getDocs(userQuery);
    
    if (!userSnapshot.empty) {
      const userDoc = userSnapshot.docs[0];
      const userData = { id: userDoc.id, ...userDoc.data() };
      return userData;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error finding user by unique ID:', error);
    return null;
  }
}

/**
 * Check if a unique ID is already taken
 * @param {string} uniqueId - Unique ID to check
 * @returns {Promise<boolean>} True if taken, false if available
 */
export async function isUniqueIdTaken(uniqueId) {
  const existingUser = await findUserByUniqueId(uniqueId);
  return existingUser !== null;
}

/**
 * Find technician by email across all collections
 * @param {string} email - Email to search for
 * @returns {Promise<Object|null>} Technician profile or null
 */
export async function findTechnicianByEmail(email) {
  if (!db || !email) return null;
  
  try {
    
    // Search in technicians collection first
    const techQuery = query(
      collection(db, COLLECTIONS.TECHNICIANS),
      where('email', '==', email),
      limit(1)
    );
    const techSnapshot = await getDocs(techQuery);
    
    if (!techSnapshot.empty) {
      const techDoc = techSnapshot.docs[0];
      const techData = { id: techDoc.id, ...techDoc.data() };
      return techData;
    }
    
    // Search in users collection for technician userType
    const userQuery = query(
      collection(db, COLLECTIONS.USERS),
      where('email', '==', email),
      where('userType', '==', 'technician'),
      limit(1)
    );
    const userSnapshot = await getDocs(userQuery);
    
    if (!userSnapshot.empty) {
      const userDoc = userSnapshot.docs[0];
      const userData = { id: userDoc.id, ...userDoc.data() };
      return userData;
    }
    
    return null;
  } catch (error) {
    console.error('Error finding technician by email:', error);
    return null;
  }
}

/**
 * Link Google account to existing technician
 * @param {string} technicianId - Existing technician ID
 * @param {Object} googleUser - Google user data
 */
export async function linkGoogleAccountToTechnician(technicianId, googleUser) {
  if (!db) return;
  
  try {
    
    // Update technician with Google data
    const techRef = doc(db, COLLECTIONS.TECHNICIANS, technicianId);
    await updateDoc(techRef, {
      uid: googleUser.uid,
      photoURL: googleUser.photoURL || null,
      googleLinked: true,
      googleLinkedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error linking Google account:', error);
  }
}

/**
 * Prevent duplicate technician registration
 * @param {string} email - Email to check
 * @returns {Promise<boolean>} True if email is already registered as technician
 */
export async function isTechnicianEmailTaken(email) {
  const existingTechnician = await findTechnicianByEmail(email);
  return existingTechnician !== null;
}

/**
 * Get all tips for a technician using unified lookup
 * @param {string} technicianId - Technician ID
 * @param {string} technicianEmail - Technician email
 * @returns {Promise<Array>} Array of tip documents
 */
export async function getTipsForTechnician(technicianId, technicianEmail, technicianUniqueId = null) {
  if (!db) return [];
  
  try {
    let allTips = [];
    
    // First priority: Get tips by unique ID (most accurate)
    if (technicianUniqueId) {
      const uniqueIdTipsQuery = query(
        collection(db, COLLECTIONS.TIPS),
        where('technicianUniqueId', '==', technicianUniqueId),
        where('status', '==', 'completed')
      );
      const uniqueIdTipsSnapshot = await getDocs(uniqueIdTipsQuery);
      
      uniqueIdTipsSnapshot.forEach(doc => {
        allTips.push({ id: doc.id, ...doc.data() });
      });
      
    }
    
    // Second priority: Get tips by direct technician ID
    if (technicianId) {
      const directTipsQuery = query(
        collection(db, COLLECTIONS.TIPS),
        where('technicianId', '==', technicianId),
        where('status', '==', 'completed')
      );
      const directTipsSnapshot = await getDocs(directTipsQuery);
      
      directTipsSnapshot.forEach(doc => {
        const tipId = doc.id;
        // Skip if we already have this tip from unique ID search
        if (allTips.some(t => t.id === tipId)) return;
        allTips.push({ id: tipId, ...doc.data() });
      });
      
    }
    
    // Third priority: Legacy email-based matching for migration
    if (technicianEmail) {
      const emailTipsQuery = query(
        collection(db, COLLECTIONS.TIPS),
        where('technicianEmail', '==', technicianEmail),
        where('status', '==', 'completed')
      );
      const emailTipsSnapshot = await getDocs(emailTipsQuery);
      
      emailTipsSnapshot.forEach(doc => {
        const tipId = doc.id;
        // Skip if we already have this tip
        if (allTips.some(t => t.id === tipId)) return;
        allTips.push({ id: tipId, ...doc.data() });
      });
      
      // Handle legacy tips for testing scenarios  
      if (technicianEmail.includes('k00lrav')) {
        const allTipsQuery = query(
          collection(db, COLLECTIONS.TIPS),
          where('status', '==', 'completed')
        );
        const allTipsSnapshot = await getDocs(allTipsQuery);
        
        allTipsSnapshot.forEach(doc => {
          const tip = doc.data();
          const tipId = doc.id;
          
          // Skip if we already have this tip
          if (allTips.some(t => t.id === tipId)) return;
          
          // Match tips sent to "Ray" sample technician for k00lrav email
          if (tip.technicianName && tip.technicianName.toLowerCase().includes('ray')) {
            allTips.push({ id: tipId, ...tip });
          }
        });
      }
      
    }
    
    // Remove duplicates
    const uniqueTips = allTips.filter((tip, index, self) => 
      index === self.findIndex(t => t.id === tip.id)
    );
    
    return uniqueTips;
  } catch (error) {
    console.error('Error getting tips for technician:', error);
    return [];
  }
}

export async function getTechnicianEarnings(technicianId) {
  
  if (!db) {
    console.warn('❌ Firebase not configured - using mock earnings');
    return {
      totalEarnings: 0,
      availableBalance: 0,
      pendingBalance: 0
    };
  }
  
  try {
    // Get unified technician data - handle both document IDs and Firebase Auth UIDs
    let technicianData = null;
    let actualTechnicianId = technicianId;
    
    // First try as a document ID in technicians collection
    const techDoc = await getDoc(doc(db, COLLECTIONS.TECHNICIANS, technicianId));
    if (techDoc.exists()) {
      technicianData = techDoc.data();
      actualTechnicianId = techDoc.id;
    } else {
      // Try users collection as document ID
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, technicianId));
      if (userDoc.exists()) {
        technicianData = userDoc.data();
        actualTechnicianId = userDoc.id;
      } else {
        // If not found as document ID, try as Firebase Auth UID
        
        // Search technicians collection by authUid
        const techQuery = query(
          collection(db, COLLECTIONS.TECHNICIANS),
          where('authUid', '==', technicianId),
          limit(1)
        );
        const techSnapshot = await getDocs(techQuery);
        
        if (!techSnapshot.empty) {
          const doc = techSnapshot.docs[0];
          technicianData = doc.data();
          actualTechnicianId = doc.id;
        } else {
          // Search users collection by authUid
          const userQuery = query(
            collection(db, COLLECTIONS.USERS),
            where('authUid', '==', technicianId),
            where('userType', '==', 'technician'),
            limit(1)
          );
          const userSnapshot = await getDocs(userQuery);
          
          if (!userSnapshot.empty) {
            const doc = userSnapshot.docs[0];
            technicianData = doc.data();
            actualTechnicianId = doc.id;
          } else {
            // Last resort: try to find by Firebase Auth UID using auth.currentUser.email
            // This handles cases where authUid is not stored properly
            try {
              const { auth } = await import('../lib/firebase');
              const currentUser = auth?.currentUser;
              if (currentUser?.email) {
                
                // Search technicians collection by email
                const emailTechQuery = query(
                  collection(db, COLLECTIONS.TECHNICIANS),
                  where('email', '==', currentUser.email),
                  limit(1)
                );
                const emailTechSnapshot = await getDocs(emailTechQuery);
                
                if (!emailTechSnapshot.empty) {
                  const doc = emailTechSnapshot.docs[0];
                  technicianData = doc.data();
                  actualTechnicianId = doc.id;
                } else {
                  // Search users collection by email
                  const emailUserQuery = query(
                    collection(db, COLLECTIONS.USERS),
                    where('email', '==', currentUser.email),
                    where('userType', '==', 'technician'),
                    limit(1)
                  );
                  const emailUserSnapshot = await getDocs(emailUserQuery);
                  
                  if (!emailUserSnapshot.empty) {
                    const doc = emailUserSnapshot.docs[0];
                    technicianData = doc.data();
                    actualTechnicianId = doc.id;
                  }
                }
              }
            } catch (emailError) {
              console.warn('💰 Email-based lookup failed:', emailError);
            }
          }
        }
      }
    }
    
    
    if (!technicianData?.email) {
      console.warn('💰 No email found for technician:', technicianId);
      return { totalEarnings: 0, availableBalance: 0, pendingBalance: 0, tipCount: 0 };
    }
    
    // Get all tips for this technician using unified lookup
    const allTips = await getTipsForTechnician(actualTechnicianId, technicianData.email, technicianData.uniqueId);
    
    let totalGrossAmount = 0;
    let totalNetAmount = 0;
    allTips.forEach(tip => {
      const grossAmount = tip.amount || 0;
      totalGrossAmount += grossAmount;
      
      // Calculate technician payout if missing or zero
      let technicianPayout = tip.technicianPayout;
      if (!technicianPayout || technicianPayout === 0) {
        // Platform fee is $0.99 (99 cents) per tip
        const platformFee = 99;
        technicianPayout = grossAmount - platformFee;
      }
      
      totalNetAmount += technicianPayout;
    });
    
    
    const result = {
      totalEarnings: totalNetAmount / 100, // Convert to dollars - what technician actually earned
      availableBalance: totalNetAmount / 100, // Convert to dollars - available to withdraw
      pendingBalance: 0, // For now, no pending payments
      tipCount: allTips.length
    };
    
    return result;
  } catch (error) {
    console.error('❌ Error fetching technician earnings:', error);
    return {
      totalEarnings: 0,
      availableBalance: 0,
      pendingBalance: 0
    };
  }
}

/**
 * Get transaction history for a technician
 * @param {string} technicianId - Technician ID
 * @param {string} technicianEmail - Technician email
 * @param {string} technicianUniqueId - Technician unique ID
 * @returns {Promise<Array>} Array of transactions
 */
export async function getTechnicianTransactions(technicianId, technicianEmail, technicianUniqueId = null) {
  if (!db) return [];
  
  try {
    const tips = await getTipsForTechnician(technicianId, technicianEmail, technicianUniqueId);
    
    // Convert tips to transaction format expected by dashboard
    const transactions = tips.map(tip => {
      const amountInCents = tip.amount || 0;
      const platformFeeInCents = parseInt(process.env.PLATFORM_FLAT_FEE || '99');
      const technicianPayoutInCents = tip.technicianPayout || (amountInCents - platformFeeInCents);
      
      return {
        id: tip.id,
        amount: amountInCents, // Keep in cents for formatCurrency
        customerName: tip.customerName || tip.customerEmail || tip.fromName || 'Anonymous Tipper',
        date: tip.createdAt ? new Date(tip.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
        status: tip.status || 'completed',
        platformFee: platformFeeInCents, // Keep in cents for formatCurrency
        technicianPayout: technicianPayoutInCents, // Add the missing field
        paymentIntent: tip.paymentIntent,
        technicianName: tip.technicianName
      };
    });
    
    // Sort by date, newest first
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return transactions;
  } catch (error) {
    console.error('❌ Error loading technician transactions:', error);
    return [];
  }
}

/**
 * Get client transactions (tips they've sent)
 * @param {string} clientId - Client ID
 * @param {string} clientEmail - Client email
 * @returns {Promise<Array>} Array of tips sent by client
 */
export async function getClientTransactions(clientId, clientEmail) {
  if (!db) return [];
  
  try {
    
    const { collection, query, where, orderBy, getDocs } = await import('firebase/firestore');
    const tipsRef = collection(db, 'tips');
    
    // Query tips where this client is the sender
    let q;
    if (clientId) {
      q = query(
        tipsRef,
        where('customerId', '==', clientId),
        orderBy('createdAt', 'desc')
      );
    } else if (clientEmail) {
      q = query(
        tipsRef,
        where('customerEmail', '==', clientEmail),
        orderBy('createdAt', 'desc')
      );
    } else {
      console.warn('No client ID or email provided');
      return [];
    }
    
    const querySnapshot = await getDocs(q);
    const tips = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      tips.push({
        id: doc.id,
        ...data
      });
    });
    
    // Convert tips to transaction format expected by profile
    const transactions = tips.map(tip => {
      const amountInCents = tip.amount || 0;
      
      return {
        id: tip.id,
        amount: amountInCents, // Keep in cents for formatCurrency
        technicianName: tip.technicianName || 'Unknown Technician',
        technicianEmail: tip.technicianEmail,
        date: tip.createdAt ? new Date(tip.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
        status: tip.status || 'completed',
        paymentIntentId: tip.paymentIntentId,
        description: `Tip to ${tip.technicianName || 'technician'}`
      };
    });
    
    return transactions;
  } catch (error) {
    console.error('❌ Error loading client transactions:', error);
    return [];
  }
}

/**
 * Check if a username is already taken
 * @param {string} username - The username to check
 * @returns {Promise<boolean>} True if username is taken, false if available
 */
export async function isUsernameTaken(username) {
  if (!db) {
    console.warn('Firebase not configured');
    return false;
  }

  try {
    // Normalize username (lowercase, trim)
    const normalizedUsername = username.toLowerCase().trim();
    
    // Check in technicians collection
    const techQuery = query(
      collection(db, COLLECTIONS.TECHNICIANS),
      where('username', '==', normalizedUsername)
    );
    const techSnapshot = await getDocs(techQuery);
    
    // Check in users collection
    const userQuery = query(
      collection(db, COLLECTIONS.USERS),
      where('username', '==', normalizedUsername)
    );
    const userSnapshot = await getDocs(userQuery);
    
    return techSnapshot.size > 0 || userSnapshot.size > 0;
  } catch (error) {
    console.error('Error checking username availability:', error);
    return true; // Assume taken on error for safety
  }
}

/**
 * Generate username suggestions when the desired username is taken
 * @param {string} baseUsername - The base username to generate suggestions from
 * @returns {Promise<string[]>} Array of available username suggestions
 */
export async function generateUsernameSuggestions(baseUsername) {
  const suggestions = [];
  const base = baseUsername.toLowerCase().trim();
  
  // Generate variations
  const variations = [
    `${base}_tech`,
    `${base}_pro`,
    `${base}123`,
    `${base}_service`,
    `${base}2024`,
    `the_${base}`,
    `${base}_official`,
    `${base}_expert`
  ];
  
  // Check each variation
  for (const variation of variations) {
    const isTaken = await isUsernameTaken(variation);
    if (!isTaken) {
      suggestions.push(variation);
    }
    
    // Return first 3 available suggestions
    if (suggestions.length >= 3) {
      break;
    }
  }
  
  return suggestions;
}

/**
 * Find technician by username
 * @param {string} username - The username to search for
 * @returns {Promise<Object|null>} Technician profile or null if not found
 */
export async function findTechnicianByUsername(username) {
  if (!db) {
    console.warn('Firebase not configured');
    return null;
  }

  try {
    const normalizedUsername = username.toLowerCase().trim();
    const q = query(
      collection(db, COLLECTIONS.TECHNICIANS),
      where('username', '==', normalizedUsername)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Error finding technician by username:', error);
    return null;
  }
}

/**
 * Validate username format
 * @param {string} username - The username to validate
 * @returns {Object} Validation result with isValid and error message
 */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { isValid: false, error: 'Username is required' };
  }
  
  const trimmed = username.trim();
  
  if (trimmed.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters long' };
  }
  
  if (trimmed.length > 20) {
    return { isValid: false, error: 'Username must be 20 characters or less' };
  }
  
  // Allow letters, numbers, underscores, hyphens
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(trimmed)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }
  
  // Can't start or end with underscore or hyphen
  if (trimmed.startsWith('_') || trimmed.startsWith('-') || trimmed.endsWith('_') || trimmed.endsWith('-')) {
    return { isValid: false, error: 'Username cannot start or end with underscore or hyphen' };
  }
  
  // Reserved usernames
  const reserved = ['admin', 'api', 'www', 'mail', 'ftp', 'localhost', 'dashboard', 'profile', 'about', 'contact', 'privacy', 'terms'];
  if (reserved.includes(trimmed.toLowerCase())) {
    return { isValid: false, error: 'This username is reserved and cannot be used' };
  }
  
  return { isValid: true, error: null };
}

// Function to add username to existing technician profile
export async function addUsernameToTechnician(technicianId, username) {
  try {
    // Validate the username format first
    const validation = validateUsername(username);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Check if username is already taken
    const isTaken = await isUsernameTaken(username);
    if (isTaken) {
      throw new Error('Username is already taken');
    }

    // Update the technician document
    const technicianRef = doc(db, 'technicians', technicianId);
    await updateDoc(technicianRef, {
      username: username.toLowerCase()
    });

    console.log(`✅ Successfully added username "${username}" to technician ${technicianId}`);
    return { success: true, username: username.toLowerCase() };
  } catch (error) {
    console.error('Error adding username to technician:', error);
    throw error;
  }
}

export default app;
