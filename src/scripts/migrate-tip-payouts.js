/**
 * Migration script to fix existing tip records that have technicianPayout: 0
 * This will calculate the correct technicianPayout based on the amount and platform fee
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

// Platform fee configuration (copied from stripe.ts)
const PLATFORM_CONFIG = {
  flatFee: 99, // $0.99 flat fee in cents
};

// Calculate platform fee
const calculatePlatformFee = (amount) => {
  return PLATFORM_CONFIG.flatFee;
};

// Calculate technician payout (after platform fee)
const calculateTechnicianPayout = (amount) => {
  return amount - calculatePlatformFee(amount);
};

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateTipPayouts() {
  console.log('🔧 Starting tip payout migration...');
  
  try {
    // Get all tips first to see what we have
    const tipsRef = collection(db, 'tips');
    const allSnapshot = await getDocs(tipsRef);
    
    console.log(`📊 Found ${allSnapshot.size} total tips in database`);
    
    if (allSnapshot.empty) {
      console.log('✅ No tips found in database');
      return;
    }
    
    // Log first few tips to see their structure
    allSnapshot.docs.slice(0, 3).forEach((doc) => {
      const data = doc.data();
      console.log(`🔍 Tip ${doc.id}:`, {
        amount: data.amount,
        platformFee: data.platformFee,
        technicianPayout: data.technicianPayout,
        hasField: 'technicianPayout' in data
      });
    });
    
    // Get tips with missing or zero technicianPayout
    const needsUpdateSnapshot = allSnapshot.docs.filter(doc => {
      const data = doc.data();
      return !data.technicianPayout || data.technicianPayout === 0;
    });
    
    console.log(`📊 Found ${needsUpdateSnapshot.length} tips that need technicianPayout update`);
    
    if (needsUpdateSnapshot.length === 0) {
      console.log('✅ No tips need migration');
      return;
    }
    
    let updatedCount = 0;
    
    for (const docSnap of needsUpdateSnapshot) {
      const tipData = docSnap.data();
      const amount = tipData.amount;
      
      if (!amount || amount <= 0) {
        console.log(`⚠️ Skipping tip ${docSnap.id} - invalid amount: ${amount}`);
        continue;
      }
      
      // Calculate correct fees
      const platformFee = calculatePlatformFee(amount);
      const technicianPayout = calculateTechnicianPayout(amount);
      
      console.log(`💰 Updating tip ${docSnap.id}: amount=${amount}, platformFee=${platformFee}, technicianPayout=${technicianPayout}`);
      
      // Update the document
      await updateDoc(doc(db, 'tips', docSnap.id), {
        platformFee: platformFee,
        technicianPayout: technicianPayout,
        migratedAt: new Date().toISOString()
      });
      
      updatedCount++;
    }
    
    console.log(`✅ Migration complete! Updated ${updatedCount} tip records`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
migrateTipPayouts();