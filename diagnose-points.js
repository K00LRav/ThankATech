/**
 * Quick diagnostic script to check transaction data
 * Run this with: node diagnose-points.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, limit, query } = require('firebase/firestore');

// Firebase config - we'll need to set this up
const firebaseConfig = {
  // This will need to be filled in from .env.local
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

async function diagnoseTransactions() {
  try {
    console.log('🔍 Diagnosing transaction data...');
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    // Get first 10 transactions
    const transactionsRef = collection(db, 'tokenTransactions');
    const q = query(transactionsRef, limit(10));
    const snapshot = await getDocs(q);
    
    console.log(`📊 Found ${snapshot.docs.length} transactions to inspect:`);
    console.log('');
    
    let thankYouCount = 0;
    let thankYouWithPoints = 0;
    let thankYouWithZeroPoints = 0;
    let thankYouWithoutField = 0;
    
    snapshot.docs.forEach((docSnap, index) => {
      const data = docSnap.data();
      
      console.log(`📄 Transaction ${index + 1}: ${docSnap.id}`);
      console.log(`   📝 Type: ${data.type}`);
      console.log(`   🪙 Tokens: ${data.tokens}`);
      console.log(`   ⭐ Points Awarded: ${data.pointsAwarded} (${typeof data.pointsAwarded})`);
      console.log(`   📅 Timestamp: ${new Date(data.timestamp?.toDate ? data.timestamp.toDate() : data.timestamp)}`);
      
      if (data.type === 'thank_you' || data.type === 'thankyou') {
        thankYouCount++;
        if (!('pointsAwarded' in data)) {
          thankYouWithoutField++;
          console.log(`   ❌ ISSUE: Thank you missing pointsAwarded field`);
        } else if (data.pointsAwarded === 0) {
          thankYouWithZeroPoints++;
          console.log(`   ⚠️  ISSUE: Thank you has 0 points (should be 1)`);
        } else if (data.pointsAwarded > 0) {
          thankYouWithPoints++;
          console.log(`   ✅ OK: Thank you has ${data.pointsAwarded} points`);
        }
      }
      
      console.log('');
    });
    
    console.log('📈 Summary:');
    console.log(`   Total thank you transactions: ${thankYouCount}`);
    console.log(`   Thank yous with points: ${thankYouWithPoints}`);
    console.log(`   Thank yous with 0 points: ${thankYouWithZeroPoints}`);
    console.log(`   Thank yous missing field: ${thankYouWithoutField}`);
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
  }
}

diagnoseTransactions();