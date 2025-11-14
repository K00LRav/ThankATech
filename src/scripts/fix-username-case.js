// Script to normalize username to lowercase in Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixUsernameCase() {
  try {
    console.log('Searching for technicians with username field...');
    
    // Get all technicians
    const techQuery = query(collection(db, 'technicians'));
    const snapshot = await getDocs(techQuery);
    
    console.log(`Found ${snapshot.size} technicians`);
    
    let fixed = 0;
    for (const techDoc of snapshot.docs) {
      const data = techDoc.data();
      
      if (data.username) {
        const normalizedUsername = data.username.toLowerCase().trim();
        
        if (data.username !== normalizedUsername) {
          console.log(`\nTechnician: ${data.name || 'Unknown'}`);
          console.log(`  Current username: "${data.username}"`);
          console.log(`  Normalized: "${normalizedUsername}"`);
          
          await updateDoc(doc(db, 'technicians', techDoc.id), {
            username: normalizedUsername
          });
          
          console.log(`  ✅ Updated!`);
          fixed++;
        }
      }
    }
    
    console.log(`\n✅ Fixed ${fixed} username(s)`);
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

fixUsernameCase();
