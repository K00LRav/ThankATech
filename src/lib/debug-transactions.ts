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
    
    snapshot.docs.forEach((docSnap, index) => {
      const data = docSnap.data();
      console.log(`\n📄 Transaction ${index + 1}: ${docSnap.id}`);
      console.log('   Type:', data.type);
      console.log('   Tokens:', data.tokens);
      console.log('   Points Awarded:', data.pointsAwarded, typeof data.pointsAwarded);
      console.log('   From User:', data.fromUserId);
      console.log('   To Technician:', data.toTechnicianId);
      console.log('   Timestamp:', data.timestamp);
      console.log('   Full Data:', data);
    });
    
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