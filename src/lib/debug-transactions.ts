/**
 * DEBUG TOOL: Inspect tokenTransactions data to see why points aren't showing
 * 
 * Run this in the browser console on the admin page to see the actual data structure
 */

import { 
  collection, 
  getDocs, 
  limit,
  query
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export async function debugTransactionData(): Promise<void> {
  if (!db) {
    console.error('❌ Firebase not configured');
    return;
  }

  try {
    console.log('🔍 Inspecting tokenTransactions data...');
    
    // Get first 5 transactions
    const transactionsRef = collection(db, 'tokenTransactions');
    const q = query(transactionsRef, limit(5));
    const snapshot = await getDocs(q);
    
    console.log(`📊 Found ${snapshot.docs.length} transactions to inspect`);
    
    let thankYouCount = 0;
    let thankYouWithPoints = 0;
    let thankYouWithZeroPoints = 0;
    let thankYouWithoutField = 0;
    
    snapshot.docs.forEach((docSnap, index) => {
      const data = docSnap.data();
      console.log(`\n📄 Transaction ${index + 1}: ${docSnap.id}`);
      console.log('   Type:', data.type);
      console.log('   Tokens:', data.tokens);
      console.log('   Points Awarded:', data.pointsAwarded, `(${typeof data.pointsAwarded})`);
      console.log('   From User:', data.fromUserId);
      console.log('   To Technician:', data.toTechnicianId);
      console.log('   Timestamp:', data.timestamp);
      
      // Analyze thank you transactions specifically
      if (data.type === 'thank_you' || data.type === 'thankyou') {
        thankYouCount++;
        if (!('pointsAwarded' in data)) {
          thankYouWithoutField++;
          console.log('   ❌ ISSUE: Thank you missing pointsAwarded field');
        } else if (data.pointsAwarded === 0) {
          thankYouWithZeroPoints++;
          console.log('   ⚠️  ISSUE: Thank you has 0 points (should be 1)');
        } else if (data.pointsAwarded > 0) {
          thankYouWithPoints++;
          console.log('   ✅ OK: Thank you has points');
        } else {
          console.log('   ❓ WEIRD: Thank you has weird points value');
        }
      }
      
      // Check dashboard display logic
      const wouldShowPoints = data.pointsAwarded && data.pointsAwarded > 0;
      const wouldShowDebug = !data.pointsAwarded && (data.type === 'thankyou' || data.type === 'thank_you');
      console.log(`   🖥️  Dashboard would show points: ${wouldShowPoints}`);
      console.log(`   🐛 Dashboard would show debug: ${wouldShowDebug}`);
    });
    
    console.log(`\n📈 Thank You Summary:`);
    console.log(`   Total thank you transactions: ${thankYouCount}`);
    console.log(`   Thank yous with points: ${thankYouWithPoints}`);
    console.log(`   Thank yous with 0 points: ${thankYouWithZeroPoints}`);
    console.log(`   Thank yous missing field: ${thankYouWithoutField}`);
    
    // Also check if dashboard query is working
    console.log('\n🔍 Testing dashboard query...');
    
    // Test technician transactions query
    if (snapshot.docs.length > 0) {
      const firstDoc = snapshot.docs[0].data();
      if (firstDoc.toTechnicianId) {
        const techQuery = query(
          transactionsRef,
          // where('toTechnicianId', '==', firstDoc.toTechnicianId)
        );
        const techSnapshot = await getDocs(techQuery);
        console.log(`   Found ${techSnapshot.docs.length} transactions for technician ${firstDoc.toTechnicianId}`);
        
        techSnapshot.docs.slice(0, 2).forEach((doc, index) => {
          const data = doc.data();
          console.log(`   Tech Transaction ${index + 1}:`, {
            id: doc.id,
            type: data.type,
            pointsAwarded: data.pointsAwarded,
            hasPointsField: 'pointsAwarded' in data
          });
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  // Export to window for easy access
  (window as any).debugTransactionData = debugTransactionData;
  console.log('🛠️ Debug tool loaded! Run: debugTransactionData()');
}