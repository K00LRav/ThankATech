// @ts-nocheck
// Firebase configuration and services for ThankATech

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, setDoc, updateDoc, increment, query, where, orderBy, limit, Firestore } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, Auth } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL, FirebaseStorage } from 'firebase/storage';
import EmailService from './email';
import { 
  UserTokenBalance, 
  TokenTransaction, 
  DailyThankYouLimit, 
  getRandomThankYouMessage,
  TOKEN_LIMITS 
} from './tokens';

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
let app: FirebaseApp | null;
let db: Firestore | null;
let auth: Auth | null;
let storage: FirebaseStorage | null;
let googleProvider: GoogleAuthProvider | null;

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
  CLIENTS: 'clients',
  THANK_YOUS: 'thankYous',
  TIPS: 'tips',
  TOKEN_BALANCES: 'tokenBalances',
  TOKEN_TRANSACTIONS: 'tokenTransactions',
  DAILY_LIMITS: 'dailyThankYouLimits'
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

    // Create Firebase Auth account if password is provided (manual registration)
    let authUser = null;
    if (technicianData.password && auth) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, technicianData.email, technicianData.password);
        authUser = userCredential.user;
      } catch (authError) {
        console.error('Error creating Firebase Auth account:', authError);
        throw new Error(`Failed to create login account: ${authError.message}`);
      }
    }
    // Create a complete technician profile
    const technicianProfile = {
      // Unique identifier
      uniqueId: uniqueId,
      username: technicianData.username?.toLowerCase().trim(),
      
      // Firebase Auth UID (if created)
      authUid: authUser?.uid || null,
      
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
    
    // Send welcome email to technician
    try {
      const technicianName = technicianData.name || 'Technician';
      await EmailService.sendWelcomeEmail(technicianData.email, technicianName, 'technician');
      // Welcome email sent to technician
    } catch (emailError) {
      console.error('❌ Failed to send technician welcome email:', emailError);
      // Don't fail registration if email fails
    }
    
    return { id: docRef.id, ...technicianProfile };
  } catch (error) {
    console.error('Error registering technician:', error);
    throw error;
  }
}

/**
 * Register a new client in Firebase
 */
export async function registerClient(userData) {
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

    // Create Firebase Auth account if password is provided (manual registration)
    let authUser = null;
    if (userData.password && auth) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
        authUser = userCredential.user;
      } catch (authError) {
        console.error('Error creating Firebase Auth account:', authError);
        throw new Error(`Failed to create login account: ${authError.message}`);
      }
    }
    
    const docRef = await addDoc(collection(db, COLLECTIONS.CLIENTS), {
      ...userData,
      uniqueId: uniqueId,
      // Firebase Auth UID (if created)
      authUid: authUser?.uid || null,
      createdAt: new Date(),
      totalThankYousSent: 0,
      totalTipsSent: 0,
      // Store profile image if available from Google
      profileImage: userData.photoURL || null
    });
    
    // Send welcome email
    try {
      const userName = userData.displayName || userData.name || 'User';
      const userType = userData.userType || 'customer';
      await EmailService.sendWelcomeEmail(userData.email, userName, userType);
      // Welcome email sent to user
    } catch (emailError) {
      console.error('❌ Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }
    
    return { id: docRef.id, uniqueId, ...userData };
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
}

/**
 * Get all registered technicians from Firebase with real-time tip calculations
 */
export async function getRegisteredTechnicians() {
  if (!db) {
    console.warn('Firebase not configured. Returning empty array.');
    return [];
  }

  try {
    // Get all technicians
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

    // Get all tips and calculate totals for each technician
    let tipsSnapshot;
    try {
      tipsSnapshot = await getDocs(collection(db, 'tips'));
    } catch (tipError) {
      console.error('❌ Error fetching tips collection:', tipError);
      // Continue without tip data if tips collection fails
      tipsSnapshot = { size: 0, forEach: () => {} };
    }
    const tipsByTechnician = new Map();
    
    // First pass: group tips by various identifiers
    const tipsByTechId = new Map();
    const tipsByEmail = new Map();
    const tipsByUniqueId = new Map();
    
    tipsSnapshot.forEach((tipDoc) => {
      const tipData = tipDoc.data();
      
      // Group by technician ID
      if (tipData.technicianId) {
        if (!tipsByTechId.has(tipData.technicianId)) {
          tipsByTechId.set(tipData.technicianId, []);
        }
        tipsByTechId.get(tipData.technicianId).push(tipData);
      }
      
      // Group by technician email
      if (tipData.technicianEmail) {
        if (!tipsByEmail.has(tipData.technicianEmail)) {
          tipsByEmail.set(tipData.technicianEmail, []);
        }
        tipsByEmail.get(tipData.technicianEmail).push(tipData);
      }
      
      // Group by technician unique ID
      if (tipData.technicianUniqueId) {
        if (!tipsByUniqueId.has(tipData.technicianUniqueId)) {
          tipsByUniqueId.set(tipData.technicianUniqueId, []);
        }
        tipsByUniqueId.get(tipData.technicianUniqueId).push(tipData);
      }
    });

    // Debug: Log tip collection summary
    
    if (tipsSnapshot.size === 0) {
      console.warn('⚠️ No tips found in database - this might be the issue!');
    }

    // Enhance technicians with calculated tip data using multiple matching strategies
    technicians.forEach(tech => {
      const allTips = new Set(); // Use Set to avoid duplicates
      
      // Match by technician document ID
      if (tipsByTechId.has(tech.id)) {
        tipsByTechId.get(tech.id).forEach(tip => allTips.add(JSON.stringify(tip)));
      }
      
      // Match by email
      if (tech.email && tipsByEmail.has(tech.email)) {
        tipsByEmail.get(tech.email).forEach(tip => allTips.add(JSON.stringify(tip)));
      }
      
      // Match by unique ID
      if (tech.uniqueId && tipsByUniqueId.has(tech.uniqueId)) {
        tipsByUniqueId.get(tech.uniqueId).forEach(tip => allTips.add(JSON.stringify(tip)));
      }
      
      // Calculate totals from all matched tips
      let totalCount = 0;
      let totalAmount = 0;
      
      allTips.forEach(tipStr => {
        const tip = JSON.parse(tipStr);
        totalCount += 1;
        // Use technician payout (net amount after fees) instead of gross amount
        totalAmount += tip.technicianPayout || tip.amount || 0;
      });
      
      // Set the calculated values
      tech.totalTips = totalCount || tech.totalTips || 0;
      tech.totalTipAmount = totalAmount || tech.totalTipAmount || 0;
      
      // Debug logging for tip recipients  
      if (totalAmount >= 1000) { // $10 or more
        // Significant tip amount received
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

    // Update technician points (with existence check for mock data)
    const technicianRef = doc(db, COLLECTIONS.TECHNICIANS, technicianId);
    try {
      // First check if the document exists
      const techDoc = await getDoc(technicianRef);
      if (techDoc.exists()) {
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
    if (userId) {
      try {
        const userRef = doc(db, COLLECTIONS.CLIENTS, userId);
        await updateDoc(userRef, {
          totalThankYousSent: increment(1)
        });
      } catch (error) {
        console.warn(`User document ${userId} not found in clients collection, skipping user stats update:`, error.message);
        // This is OK - user might be a technician or the document might not exist
      }
    }

    // Send thank you notification email to technician
    try {
      // Get technician details
      const technicianRef = doc(db, COLLECTIONS.TECHNICIANS, technicianId);
      const techDoc = await getDoc(technicianRef);
      
      let customerName = 'A customer';
      if (userId) {
        try {
          const userRef = doc(db, COLLECTIONS.CLIENTS, userId);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            customerName = userData.displayName || userData.name || 'A customer';
          }
        } catch (error) {
          console.warn('Could not fetch customer name:', error.message);
        }
      }
      
      if (techDoc.exists()) {
        const techData = techDoc.data();
        const technicianName = techData.name || 'Technician';
        const technicianEmail = techData.email;
        
        if (technicianEmail) {
          await EmailService.sendThankYouNotification(
            technicianEmail,
            technicianName,
            customerName,
            message
          );
          // Thank you notification sent to technician
        }
      }
    } catch (emailError) {
      console.error('❌ Failed to send thank you notification email:', emailError);
      // Don't fail the thank you if email fails
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
    try {
      // First check if the document exists
      const techDoc = await getDoc(technicianRef);
      if (techDoc.exists()) {
        await updateDoc(technicianRef, {
          points: increment(points),
          totalTips: increment(amount)
        });
      } else {
        console.warn(`Technician document ${technicianId} not found in Firestore. This is normal for mock data.`);
      }
    } catch (error) {
      console.warn(`Unable to update technician document ${technicianId}:`, error.message);
      // Continue execution - this is OK for mock data
    }

    // Update user stats (with existence check)
    if (userId) {
      try {
        const userRef = doc(db, COLLECTIONS.CLIENTS, userId);
        await updateDoc(userRef, {
          totalTipsSent: increment(amount)
        });
      } catch (error) {
        console.warn(`User document ${userId} not found in clients collection, skipping user stats update:`, error.message);
        // This is OK - user might be a technician or the document might not exist
      }
    }

    // Send tip notification email to technician
    try {
      // Get technician details
      const technicianRef = doc(db, COLLECTIONS.TECHNICIANS, technicianId);
      const techDoc = await getDoc(technicianRef);
      
      let customerName = 'A customer';
      if (userId) {
        try {
          const userRef = doc(db, COLLECTIONS.CLIENTS, userId);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            customerName = userData.displayName || userData.name || 'A customer';
          }
        } catch (error) {
          console.warn('Could not fetch customer name:', error.message);
        }
      }
      
      if (techDoc.exists()) {
        const techData = techDoc.data();
        const technicianName = techData.name || 'Technician';
        const technicianEmail = techData.email;
        
        if (technicianEmail) {
          await EmailService.sendTipNotification(
            technicianEmail,
            technicianName,
            customerName,
            amount,
            message
          );
          // Tip notification sent to technician
        }
      }
    } catch (emailError) {
      console.error('❌ Failed to send tip notification email:', emailError);
      // Don't fail the tip if email fails
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
 * Get user from either clients or technicians collection by ID
 */
export async function getClientById(userId) {
  if (!db) {
    console.warn('Firebase not configured.');
    return null;
  }

  try {
    // First check clients collection
    const userRef = doc(db, COLLECTIONS.CLIENTS, userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data(), collection: 'clients' };
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
export async function getClientByEmail(email) {
  if (!db) return null;
  
  try {
    // Check in clients collection
    const usersQuery = query(collection(db, COLLECTIONS.CLIENTS), where('email', '==', email));
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
          const collectionName = existingUser.userType === 'technician' ? COLLECTIONS.TECHNICIANS : COLLECTIONS.CLIENTS;
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
        
        const legacyUser = await getClientByEmail(user.email);
        if (legacyUser && !legacyUser.uniqueId) {
          await updateDoc(doc(db, COLLECTIONS.CLIENTS, legacyUser.id), {
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
      await registerClient({
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
      const userProfile = await getClientByEmail(email);
      
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
      // Firebase sign out
      await signOut(auth);
      
      // Clear browser storage
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear Firebase persistence data
        try {
          // Clear IndexedDB for Firebase
          if ('indexedDB' in window) {
            const databases = await indexedDB.databases();
            databases.forEach(db => {
              if (db.name && db.name.includes('firebase')) {
                indexedDB.deleteDatabase(db.name);
              }
            });
          }
        } catch (dbError) {
          console.warn('Could not clear IndexedDB:', dbError);
        }
      }
      
      console.log('✅ Complete sign out successful');
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if Firebase signOut fails, clear local storage
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      throw error;
    }
  },

  // Listen to auth state changes
  onAuthStateChanged: (callback) => {
    return onAuthStateChanged(auth, callback);
  }
};

/**
 * Migration helper: Move technician from clients collection to technicians collection
 */
export async function migrateTechnicianProfile(userId) {
  if (!db) {
    console.warn('Firebase not configured. Cannot migrate.');
    return null;
  }

  try {
    // Get user from clients collection
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

  try {
    const { deleteDoc } = await import('firebase/firestore');
    
    // Delete from appropriate collection based on user type
    if (userType === 'technician') {
      // Delete from technicians collection
      // This automatically removes them from rolodex cards since 
      // getRegisteredTechnicians() fetches from this collection
      await deleteDoc(doc(db, COLLECTIONS.TECHNICIANS, userId));
      
      // Also check and delete from clients collection if exists (for dual registrations)
      try {
        await deleteDoc(doc(db, COLLECTIONS.CLIENTS, userId));
      } catch (userError) {
        // User document may not exist, which is fine
      }
    } else {
      // Delete from clients collection
      await deleteDoc(doc(db, COLLECTIONS.CLIENTS, userId));
    }
    
    // TODO: Future enhancements for production:
    // - Delete user's photos from Firebase Storage
    // - Clean up related data (tips, thank yous, ratings, etc.)
    // - Delete the Firebase Auth user account (requires admin SDK)
    // - Send deletion confirmation email
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
    let customerUniqueId = null;
    if (transactionData.customerId) {
      const customer = await getClient(transactionData.customerId);
      customerUniqueId = customer?.uniqueId;
    } else if (transactionData.customerEmail) {
      const customer = await getClientByEmail(transactionData.customerEmail);
      customerUniqueId = customer?.uniqueId;
    }
    
    const transaction = {
      ...transactionData,
      technicianUniqueId: technician.uniqueId || technician.id, // Fallback for legacy data
      customerUniqueId: customerUniqueId,
      createdAt: new Date().toISOString(),
      status: 'completed'
    };
    
    
    // Add to tips collection
    const docRef = await addDoc(collection(db, COLLECTIONS.TIPS), transaction);
    
    // Update technician's total earnings (only if technician document exists)
    if (transactionData.technicianId) {
      try {
        const technicianRef = doc(db, COLLECTIONS.TECHNICIANS, transactionData.technicianId);
        
        await updateDoc(technicianRef, {
          totalEarnings: increment(transactionData.amount),
          totalTips: increment(1), // Increment tip count
          totalTipAmount: increment(transactionData.amount), // Increment total tip amount
          lastTipDate: new Date().toISOString()
        });
      } catch (updateError) {
        console.warn('⚠️ Could not update technician document earnings:', updateError);
        // Continue execution - the transaction is still recorded in tips collection
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
    
    // Try clients collection as fallback
    const userDoc = await getDoc(doc(db, COLLECTIONS.CLIENTS, technicianId));
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
export async function getClient(userId) {
  if (!db || !userId) return null;
  
  try {
    
    const userDoc = await getDoc(doc(db, COLLECTIONS.CLIENTS, userId));
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
    
    // Search in clients collection
    const userQuery = query(
      collection(db, COLLECTIONS.CLIENTS),
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
    
    // Search in clients collection for technician userType
    const userQuery = query(
      collection(db, COLLECTIONS.CLIENTS),
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
      // Try clients collection as document ID
      const userDoc = await getDoc(doc(db, COLLECTIONS.CLIENTS, technicianId));
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
          // Search clients collection by authUid
          const userQuery = query(
            collection(db, COLLECTIONS.CLIENTS),
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
                  // Search clients collection by email
                  const emailUserQuery = query(
                    collection(db, COLLECTIONS.CLIENTS),
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
 * Get customer transactions (tips they've sent)
 * @param {string} customerId - Customer ID
 * @param {string} customerEmail - Customer email
 * @returns {Promise<Array>} Array of tips sent by customer
 */
export async function getCustomerTransactions(customerId, customerEmail) {
  if (!db) return [];
  
  try {
    
    const { collection, query, where, orderBy, getDocs } = await import('firebase/firestore');
    const tipsRef = collection(db, 'tips');
    
    // Query tips where this customer is the sender
    let q;
    if (customerId) {
      q = query(
        tipsRef,
        where('customerId', '==', customerId),
        orderBy('createdAt', 'desc')
      );
    } else if (customerEmail) {
      q = query(
        tipsRef,
        where('customerEmail', '==', customerEmail),
        orderBy('createdAt', 'desc')
      );
    } else {
      console.warn('No customer ID or email provided');
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
    console.error('❌ Error loading customer transactions:', error);
    return [];
  }
}

/**
 * Check if a username is already taken
 */
export async function isUsernameTaken(username: string): Promise<boolean> {
  if (!db) {
    console.warn('Firebase not configured');
    return false;
  }

  try {
    const normalizedUsername = username.toLowerCase().trim();
    
    const techQuery = query(
      collection(db, COLLECTIONS.TECHNICIANS),
      where('username', '==', normalizedUsername)
    );
    const techSnapshot = await getDocs(techQuery);
    
    const userQuery = query(
      collection(db, COLLECTIONS.CLIENTS),
      where('username', '==', normalizedUsername)
    );
    const userSnapshot = await getDocs(userQuery);
    
    return techSnapshot.size > 0 || userSnapshot.size > 0;
  } catch (error) {
    console.error('Error checking username availability:', error);
    return true;
  }
}

/**
 * Generate username suggestions when the desired username is taken
 */
export async function generateUsernameSuggestions(baseUsername: string): Promise<string[]> {
  const suggestions: string[] = [];
  const base = baseUsername.toLowerCase().trim();
  
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
  
  for (const variation of variations) {
    const isTaken = await isUsernameTaken(variation);
    if (!isTaken) {
      suggestions.push(variation);
    }
    
    if (suggestions.length >= 3) {
      break;
    }
  }
  
  return suggestions;
}

/**
 * Find technician by username
 */
export async function findTechnicianByUsername(username: string): Promise<any> {
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
 */
export function validateUsername(username: string): { isValid: boolean; error: string | null } {
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
  
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(trimmed)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }
  
  if (trimmed.startsWith('_') || trimmed.startsWith('-') || trimmed.endsWith('_') || trimmed.endsWith('-')) {
    return { isValid: false, error: 'Username cannot start or end with underscore or hyphen' };
  }
  
  const reserved = ['admin', 'api', 'www', 'mail', 'ftp', 'localhost', 'dashboard', 'profile', 'about', 'contact', 'privacy', 'terms'];
  if (reserved.includes(trimmed.toLowerCase())) {
    return { isValid: false, error: 'This username is reserved and cannot be used' };
  }
  
  return { isValid: true, error: null };
}

/**
 * TOKEN SYSTEM FUNCTIONS
 */

// Get user's token balance
export async function getUserTokenBalance(userId: string): Promise<UserTokenBalance> {
  if (!db) {
    console.warn('Firebase not configured. Returning mock token balance.');
    return {
      userId,
      tokens: 100,
      totalPurchased: 100,
      totalSpent: 0,
      lastUpdated: new Date()
    };
  }

  try {
    const balanceRef = doc(db, COLLECTIONS.TOKEN_BALANCES, userId);
    const balanceDoc = await getDoc(balanceRef);
    
    if (balanceDoc.exists()) {
      return { id: balanceDoc.id, ...balanceDoc.data() } as UserTokenBalance;
    } else {
      // Create initial balance record
      const initialBalance: UserTokenBalance = {
        userId,
        tokens: 0,
        totalPurchased: 0,
        totalSpent: 0,
        lastUpdated: new Date()
      };
      
      await setDoc(balanceRef, initialBalance);
      return initialBalance;
    }
  } catch (error) {
    console.error('Error getting token balance:', error);
    throw error;
  }
}

// Add tokens to user's balance (after purchase)
export async function addTokensToBalance(userId: string, tokensToAdd: number, purchaseAmount: number): Promise<void> {
  if (!db) {
    console.warn('Firebase not configured. Mock tokens added.');
    return;
  }

  try {
    const balanceRef = doc(db, COLLECTIONS.TOKEN_BALANCES, userId);
    const balanceDoc = await getDoc(balanceRef);
    
    if (balanceDoc.exists()) {
      await updateDoc(balanceRef, {
        tokens: increment(tokensToAdd),
        totalPurchased: increment(tokensToAdd),
        lastUpdated: new Date()
      });
    } else {
      // Create new balance record
      await setDoc(balanceRef, {
        userId,
        tokens: tokensToAdd,
        totalPurchased: tokensToAdd,
        totalSpent: 0,
        lastUpdated: new Date()
      });
    }
    
    console.log(`✅ Added ${tokensToAdd} tokens to user ${userId}`);
  } catch (error) {
    console.error('Error adding tokens to balance:', error);
    throw error;
  }
}

// Check daily thank you limit
export async function checkDailyThankYouLimit(userId: string, technicianId: string): Promise<{canSendFree: boolean, remainingFree: number}> {
  if (!db) {
    console.warn('Firebase not configured. Returning mock limit check.');
    return { canSendFree: true, remainingFree: 2 };
  }

  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const limitId = `${userId}_${technicianId}_${today}`;
    const limitRef = doc(db, COLLECTIONS.DAILY_LIMITS, limitId);
    const limitDoc = await getDoc(limitRef);
    
    if (limitDoc.exists()) {
      const data = limitDoc.data();
      const remainingFree = TOKEN_LIMITS.FREE_DAILY_LIMIT - data.freeThankYous;
      return {
        canSendFree: remainingFree > 0,
        remainingFree: Math.max(0, remainingFree)
      };
    } else {
      // First thank you of the day
      return {
        canSendFree: true,
        remainingFree: TOKEN_LIMITS.FREE_DAILY_LIMIT - 1
      };
    }
  } catch (error) {
    console.error('Error checking daily limit:', error);
    // Default to allowing free thank you on error
    return { canSendFree: true, remainingFree: 2 };
  }
}

// Send tokens (new thank you system)
export async function sendTokens(
  fromUserId: string, 
  toTechnicianId: string, 
  tokens: number, 
  customMessage?: string
): Promise<{success: boolean, transactionId?: string, error?: string}> {
  if (!db) {
    console.warn('Firebase not configured. Mock tokens sent.');
    return { success: true, transactionId: 'mock-transaction-' + Date.now() };
  }

  try {
    // Check if this is a free thank you or token transaction
    const isFreeThankYou = tokens === 0;
    
    if (isFreeThankYou) {
      // Check daily limit for free thank yous
      const limitCheck = await checkDailyThankYouLimit(fromUserId, toTechnicianId);
      if (!limitCheck.canSendFree) {
        return { 
          success: false, 
          error: 'Daily free thank you limit reached (3 per day per technician)' 
        };
      }
    } else {
      // Check user has enough tokens
      const balance = await getUserTokenBalance(fromUserId);
      if (balance.tokens < tokens) {
        return { 
          success: false, 
          error: `Insufficient tokens. You have ${balance.tokens}, need ${tokens}` 
        };
      }
    }

    // Get random message if no custom message provided
    const message = customMessage || getRandomThankYouMessage();
    
    // Create transaction record
    const transaction: Omit<TokenTransaction, 'id'> = {
      fromUserId,
      toTechnicianId,
      tokens,
      message,
      isRandomMessage: !customMessage,
      timestamp: new Date(),
      type: 'thank_you'
    };
    
    const transactionRef = await addDoc(collection(db, COLLECTIONS.TOKEN_TRANSACTIONS), transaction);
    
    if (!isFreeThankYou) {
      // Deduct tokens from sender
      const balanceRef = doc(db, COLLECTIONS.TOKEN_BALANCES, fromUserId);
      await updateDoc(balanceRef, {
        tokens: increment(-tokens),
        totalSpent: increment(tokens),
        lastUpdated: new Date()
      });
    } else {
      // Update daily limit counter
      const today = new Date().toISOString().split('T')[0];
      const limitId = `${fromUserId}_${toTechnicianId}_${today}`;
      const limitRef = doc(db, COLLECTIONS.DAILY_LIMITS, limitId);
      const limitDoc = await getDoc(limitRef);
      
      if (limitDoc.exists()) {
        await updateDoc(limitRef, {
          freeThankYous: increment(1)
        });
      } else {
        await setDoc(limitRef, {
          userId: fromUserId,
          technicianId: toTechnicianId,
          date: today,
          freeThankYous: 1,
          maxFreeThankYous: TOKEN_LIMITS.FREE_DAILY_LIMIT
        });
      }
    }
    
    // Update technician points (keep existing point system for now)
    const technicianRef = doc(db, COLLECTIONS.TECHNICIANS, toTechnicianId);
    const techDoc = await getDoc(technicianRef);
    if (techDoc.exists()) {
      const pointsToAdd = isFreeThankYou ? 10 : tokens; // Free = 10 points, tokens = 1:1
      await updateDoc(technicianRef, {
        points: increment(pointsToAdd),
        totalThankYous: increment(1)
      });
    }

    // Send email notification
    try {
      const techData = techDoc?.data();
      const fromUserRef = doc(db, COLLECTIONS.CLIENTS, fromUserId);
      const fromUserDoc = await getDoc(fromUserRef);
      const fromUserData = fromUserDoc.exists() ? fromUserDoc.data() : {};
      
      if (techData?.email) {
        const technicianName = techData.name || 'Technician';
        const customerName = fromUserData.displayName || fromUserData.name || 'A customer';
        
        if (isFreeThankYou) {
          // Send regular thank you notification
          await EmailService.sendThankYouNotification(
            techData.email,
            technicianName,
            customerName,
            message
          );
        } else {
          // Send token notification (we'll update this template next)
          await EmailService.sendTipNotification(
            techData.email,
            technicianName,
            customerName,
            Math.round(tokens * 0.1), // Convert tokens to dollar equivalent for now
            message
          );
        }
      }
    } catch (emailError) {
      console.error('❌ Failed to send notification email:', emailError);
      // Don't fail the transaction if email fails
    }
    
    return { success: true, transactionId: transactionRef.id };
  } catch (error) {
    console.error('Error sending tokens:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Migration script: Move all data from 'users' collection to 'clients' collection
 * This should be run once during the transition period
 */
export async function migrateUsersToClients() {
  if (!db) {
    console.warn('Firebase not configured. Cannot perform migration.');
    return { success: false, error: 'Firebase not configured' };
  }

  try {
    console.log('🔄 Starting migration from "users" → "clients" collection...');
    
    // Get all documents from 'users' collection
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    if (usersSnapshot.empty) {
      console.log('✅ No documents found in "users" collection. Migration not needed.');
      return { success: true, migratedCount: 0, message: 'No data to migrate' };
    }
    
    console.log(`📊 Found ${usersSnapshot.size} documents to migrate`);
    
    const migrationPromises = [];
    const migrationResults = [];
    
    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      const documentId = userDoc.id;
      
      console.log(`📝 Preparing to migrate document: ${documentId}`);
      
      // Add userType if missing (default to client)
      if (!userData.userType) {
        userData.userType = 'client';
      }
      
      // Only migrate actual clients (not technicians that might be in users collection)
      if (userData.userType === 'client' || userData.userType === 'customer') {
        // Copy to clients collection with same document ID
        const clientRef = doc(db, COLLECTIONS.CLIENTS, documentId);
        const migrationPromise = setDoc(clientRef, {
          ...userData,
          userType: 'client', // Normalize to 'client'
          migratedAt: new Date(),
          migratedFrom: 'users'
        }).then(() => {
          migrationResults.push({
            id: documentId,
            email: userData.email,
            name: userData.name || userData.displayName,
            success: true
          });
          console.log(`✅ Migrated client: ${userData.email || documentId}`);
        }).catch((error) => {
          migrationResults.push({
            id: documentId,
            email: userData.email,
            error: error.message,
            success: false
          });
          console.error(`❌ Failed to migrate ${documentId}:`, error);
        });
        
        migrationPromises.push(migrationPromise);
      } else {
        console.log(`⏭️ Skipping technician document: ${documentId} (should be in technicians collection)`);
      }
    });
    
    // Execute all migrations
    await Promise.all(migrationPromises);
    
    const successCount = migrationResults.filter(r => r.success).length;
    const failureCount = migrationResults.filter(r => !r.success).length;
    
    console.log(`✅ Migration completed! Migrated ${successCount} documents to "clients" collection`);
    
    if (failureCount > 0) {
      console.warn(`⚠️ ${failureCount} documents failed to migrate`);
    }
    
    // Log summary
    console.log('📋 Migration Summary:');
    migrationResults.forEach(result => {
      if (result.success) {
        console.log(`  ✓ ${result.email || result.id}`);
      } else {
        console.log(`  ✗ ${result.email || result.id}: ${result.error}`);
      }
    });
    
    console.log('');
    console.log('🚨 IMPORTANT: After verifying the migration worked correctly,');
    console.log('   you should manually delete the old "users" collection from Firebase Console');
    console.log('   Go to: Firebase Console → Firestore Database → Delete "users" collection');
    
    return { 
      success: true, 
      migratedCount: successCount,
      failedCount: failureCount,
      results: migrationResults,
      message: `Successfully migrated ${successCount} documents. ${failureCount} failed.`
    };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return { 
      success: false, 
      error: error.message,
      message: 'Migration failed. Please check console for details.'
    };
  }
}

/**
 * Check migration status - see what data exists in both collections
 */
export async function checkMigrationStatus() {
  if (!db) {
    console.warn('Firebase not configured.');
    return null;
  }
  
  try {
    // Check users collection
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const usersCount = usersSnapshot.size;
    
    // Check clients collection  
    const clientsSnapshot = await getDocs(collection(db, COLLECTIONS.CLIENTS));
    const clientsCount = clientsSnapshot.size;
    
    // Check technicians collection
    const techSnapshot = await getDocs(collection(db, COLLECTIONS.TECHNICIANS));
    const techCount = techSnapshot.size;
    
    console.log('📊 Migration Status:');
    console.log(`  "users" collection: ${usersCount} documents`);
    console.log(`  "clients" collection: ${clientsCount} documents`);  
    console.log(`  "technicians" collection: ${techCount} documents`);
    
    const status = {
      usersCount,
      clientsCount,
      techCount,
      needsMigration: usersCount > 0,
      migrationComplete: usersCount === 0 && clientsCount > 0
    };
    
    if (status.needsMigration) {
      console.log('🔄 Migration needed: Run migrateUsersToClients()');
    } else if (status.migrationComplete) {
      console.log('✅ Migration appears complete');
    } else {
      console.log('❓ No data found in any collection');
    }
    
    return status;
  } catch (error) {
    console.error('Error checking migration status:', error);
    return null;
  }
}

// Backward compatibility aliases (temporary during migration)
export async function getUser(userId: string) {
  return getClient(userId);
}
export const registerUser = registerClient;
export const getUserById = getClientById;
export const getUserByEmail = getClientByEmail;

// Export token system functions (direct exports - functions already exported above)
// export { getUserTokenBalance, addTokensToBalance, checkDailyThankYouLimit, sendTokens };

export default app;
