// Utility to initialize Firebase collections
import { db } from './firebase';
import { collection, addDoc, doc, deleteDoc } from 'firebase/firestore';

/**
 * Initialize the users collection in Firebase
 * This creates the collection and then removes the temporary document
 */
export async function initializeUsersCollection() {
  if (!db) {
    console.warn('Firebase not configured.');
    return false;
  }

  try {
    console.log('Initializing users collection...');
    
    // Add a temporary document to create the collection
    const tempDocRef = await addDoc(collection(db, 'users'), {
      temp: 'This is a temporary document to initialize the collection',
      createdAt: new Date(),
      toDelete: true
    });
    
    console.log('Temporary document created with ID:', tempDocRef.id);
    
    // Delete the temporary document, leaving the collection ready
    await deleteDoc(doc(db, 'users', tempDocRef.id));
    
    console.log('✅ Users collection initialized successfully!');
    console.log('The collection is now ready for customer registrations.');
    
    return true;
  } catch (error) {
    console.error('❌ Error initializing users collection:', error);
    return false;
  }
}

/**
 * Initialize all required collections
 */
export async function initializeAllCollections() {
  console.log('🚀 Initializing all Firebase collections...');
  
  const results = {
    users: await initializeUsersCollection(),
    // Add other collections if needed in the future
  };
  
  const successCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;
  
  console.log(`📊 Collection initialization complete: ${successCount}/${totalCount} successful`);
  
  return results;
}