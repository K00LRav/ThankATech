/**
 * DASHBOARD SPECIFIC DEBUG: Test exact dashboard query logic
 * 
 * This simulates what the dashboard page does to load and display transactions
 */

import { 
  collection, 
  getDocs, 
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export async function debugDashboardQuery(userId: string): Promise<void> {
  if (!db) {
    console.error('❌ Firebase not configured');
    return;
  }

  try {
    console.log(`🔍 Testing dashboard query for user: ${userId}`);
    
    // Test the exact query the dashboard uses for received transactions
    const transactionsRef = collection(db, 'tokenTransactions');
    
    // Query for transactions received by this technician
    const receivedQuery = query(
      transactionsRef,
      where('toTechnicianId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    
    const receivedSnapshot = await getDocs(receivedQuery);
    console.log(`📨 Found ${receivedSnapshot.docs.length} received transactions`);
    
    let totalPointsFromQuery = 0;
    let transactionsWithPoints = 0;
    
    receivedSnapshot.docs.forEach((docSnap, index) => {
      const data = docSnap.data();
      const hasPoints = data.pointsAwarded && data.pointsAwarded > 0;
      
      if (hasPoints) {
        totalPointsFromQuery += data.pointsAwarded;
        transactionsWithPoints++;
      }
      
      console.log(`📄 Received ${index + 1}: ${docSnap.id}`);
      console.log(`   Type: ${data.type}`);
      console.log(`   Points: ${data.pointsAwarded} (${typeof data.pointsAwarded})`);
      console.log(`   Would show in dashboard: ${hasPoints}`);
      console.log(`   Timestamp: ${data.timestamp}`);
    });
    
    console.log(`\n📊 Dashboard Summary for ${userId}:`);
    console.log(`   Total transactions: ${receivedSnapshot.docs.length}`);
    console.log(`   Transactions with points: ${transactionsWithPoints}`);
    console.log(`   Total points that should display: ${totalPointsFromQuery}`);
    
    // Also test sent transactions (for customers)
    const sentQuery = query(
      transactionsRef,
      where('fromUserId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    
    const sentSnapshot = await getDocs(sentQuery);
    console.log(`\n📤 Found ${sentSnapshot.docs.length} sent transactions`);
    
    sentSnapshot.docs.slice(0, 3).forEach((docSnap, index) => {
      const data = docSnap.data();
      console.log(`📄 Sent ${index + 1}: ${data.type} to ${data.toTechnicianId}`);
    });
    
  } catch (error) {
    console.error('❌ Dashboard debug failed:', error);
  }
}

// Export for admin interface
export default debugDashboardQuery;