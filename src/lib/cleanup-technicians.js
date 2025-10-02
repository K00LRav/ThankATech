/**
 * Cleanup Script: Reduce to 14 technicians (Client-side version)
 * 
 * Run this in the browser console on localhost:3000
 * 
 * Current: 11 registered + 8 mock = 19 total
 * Target: 3 registered + 11 mock = 14 total
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, query, orderBy, limit } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your Firebase config (from .env.local)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function cleanupTechnicians() {
  console.log('🧹 Starting cleanup...\n');

  try {
    // Get all technicians
    const techsRef = collection(db, 'technicians');
    const snapshot = await getDocs(techsRef);
    
    const allTechs = [];
    snapshot.forEach(doc => {
      allTechs.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`📊 Found ${allTechs.length} registered technicians`);

    // Sort by createdAt to keep the oldest 3
    allTechs.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
      const timeB = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
      return timeA - timeB;
    });

    const toKeep = allTechs.slice(0, 3);
    const toDelete = allTechs.slice(3);

    console.log(`\n✅ Keeping ${toKeep.length} technicians:`);
    toKeep.forEach(t => console.log(`   - ${t.name} (${t.email})`));

    console.log(`\n❌ Will delete ${toDelete.length} technicians:`);
    toDelete.forEach(t => console.log(`   - ${t.name} (${t.email})`));

    // Delete
    for (const tech of toDelete) {
      await deleteDoc(doc(db, 'technicians', tech.id));
      // Try to delete from users collection too
      try {
        await deleteDoc(doc(db, 'users', tech.id));
      } catch (e) {
        // Might not exist in users collection
      }
      console.log(`✅ Deleted: ${tech.name}`);
    }

    console.log(`\n✅ Cleanup complete! Now you have 3 registered + 11 mock = 14 total`);
    console.log('🔄 Refresh the page to see the updated count!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

export { cleanupTechnicians };
