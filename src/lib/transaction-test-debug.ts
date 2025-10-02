/**
 * Comprehensive Transaction Testing and Debugging Tool
 * Use this to test transaction creation and debug dashboard display issues
 */

import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit,
  doc,
  getDoc,
  updateDoc,
  increment,
  where
} from 'firebase/firestore';
import { db } from './firebase';

export interface TestTransactionResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  details?: any;
}

/**
 * Create a test thank you transaction for debugging
 */
export async function createTestThankYou(
  fromUserId: string,
  toTechnicianId: string,
  fromUserName: string = 'Test Client',
  technicianName: string = 'Test Technician'
): Promise<TestTransactionResult> {
  if (!db) {
    return { success: false, error: 'Firebase not configured' };
  }

  try {
    console.log('🧪 Creating test thank you transaction...');
    
    // Create the transaction
    const transaction = {
      fromUserId,
      toTechnicianId,
      tokens: 0, // Free thank you
      message: `Test thank you from ${fromUserName} to ${technicianName} - ${new Date().toLocaleString()}`,
      isRandomMessage: false,
      timestamp: new Date(),
      type: 'thank_you',
      pointsAwarded: 1, // 1 ThankATech Point for thank you
      dollarValue: 0,
      technicianPayout: 0,
      platformFee: 0
    };
    
    const transactionRef = await addDoc(collection(db, 'tokenTransactions'), transaction);
    console.log('✅ Transaction created:', transactionRef.id);
    
    // Update technician points
    const technicianRef = doc(db, 'technicians', toTechnicianId);
    const techDoc = await getDoc(technicianRef);
    
    if (techDoc.exists()) {
      await updateDoc(technicianRef, {
        points: increment(1),
        totalThankYous: increment(1),
        lastAppreciationDate: new Date()
      });
      console.log('✅ Updated technician points');
    } else {
      console.log('⚠️ Technician document not found, creating one...');
      // Try users collection
      const userRef = doc(db, 'users', toTechnicianId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        await updateDoc(userRef, {
          points: increment(1),
          totalThankYous: increment(1),
          userType: 'technician',
          lastAppreciationDate: new Date()
        });
        console.log('✅ Updated user as technician');
      }
    }
    
    // Update client points
    const clientRef = doc(db, 'users', fromUserId);
    const clientDoc = await getDoc(clientRef);
    
    if (clientDoc.exists()) {
      await updateDoc(clientRef, {
        points: increment(1),
        totalThankYousSent: increment(1),
        lastAppreciationDate: new Date()
      });
      console.log('✅ Updated client points');
    } else {
      console.log('⚠️ Client document not found in users collection');
    }
    
    return {
      success: true,
      transactionId: transactionRef.id,
      details: transaction
    };
    
  } catch (error) {
    console.error('❌ Error creating test transaction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Create a test TOA token transaction for debugging
 */
export async function createTestTOATransaction(
  fromUserId: string,
  toTechnicianId: string,
  tokens: number = 5,
  fromUserName: string = 'Test Client',
  technicianName: string = 'Test Technician'
): Promise<TestTransactionResult> {
  if (!db) {
    return { success: false, error: 'Firebase not configured' };
  }

  try {
    console.log('🧪 Creating test TOA transaction...');
    
    // TOA business model calculations
    const dollarValue = tokens * 1.25; // $1.25 per TOA
    const technicianPayout = tokens * 1.06; // $1.06 per TOA (85% of $1.25)
    const platformFee = tokens * 0.19; // $0.19 per TOA (15% of $1.25)
    const pointsAwarded = tokens * 1; // 1 point per TOA token
    
    // Create the transaction
    const transaction = {
      fromUserId,
      toTechnicianId,
      tokens,
      message: `Test TOA tokens from ${fromUserName} to ${technicianName} - ${new Date().toLocaleString()}`,
      isRandomMessage: false,
      timestamp: new Date(),
      type: 'toa',
      pointsAwarded,
      dollarValue,
      technicianPayout,
      platformFee
    };
    
    const transactionRef = await addDoc(collection(db, 'tokenTransactions'), transaction);
    console.log('✅ TOA Transaction created:', transactionRef.id);
    
    // Update technician
    const technicianRef = doc(db, 'technicians', toTechnicianId);
    const techDoc = await getDoc(technicianRef);
    
    if (techDoc.exists()) {
      await updateDoc(technicianRef, {
        points: increment(pointsAwarded),
        totalThankYous: increment(1),
        totalToaReceived: increment(tokens),
        totalToaValue: increment(dollarValue),
        totalEarnings: increment(technicianPayout),
        lastAppreciationDate: new Date()
      });
      console.log('✅ Updated technician TOA data');
    }
    
    // Update client
    const clientRef = doc(db, 'users', fromUserId);
    const clientDoc = await getDoc(clientRef);
    
    if (clientDoc.exists()) {
      await updateDoc(clientRef, {
        points: increment(tokens), // 1 point per TOA sent
        totalThankYousSent: increment(1),
        totalToaSent: increment(tokens),
        totalSpent: increment(dollarValue),
        totalTokensSent: increment(tokens),
        lastAppreciationDate: new Date()
      });
      console.log('✅ Updated client TOA data');
    }
    
    return {
      success: true,
      transactionId: transactionRef.id,
      details: transaction
    };
    
  } catch (error) {
    console.error('❌ Error creating test TOA transaction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Debug current database state - check transactions and user data
 */
export async function debugTransactionState(): Promise<{
  transactions: any[];
  userCount: number;
  technicianCount: number;
  totalTransactions: number;
}> {
  if (!db) {
    return { transactions: [], userCount: 0, technicianCount: 0, totalTransactions: 0 };
  }

  try {
    console.log('🔍 Debugging transaction state...');
    
    // Get recent transactions
    const transactionsRef = collection(db, 'tokenTransactions');
    const transQuery = query(transactionsRef, orderBy('timestamp', 'desc'), limit(10));
    const transSnapshot = await getDocs(transQuery);
    
    const transactions = transSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate()
    }));
    
    // Count total transactions
    const allTransSnapshot = await getDocs(collection(db, 'tokenTransactions'));
    const totalTransactions = allTransSnapshot.size;
    
    // Count users and technicians
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const techniciansSnapshot = await getDocs(collection(db, 'technicians'));
    
    const userCount = usersSnapshot.size;
    const technicianCount = techniciansSnapshot.size;
    
    console.log(`📊 Database State:`);
    console.log(`  Total Transactions: ${totalTransactions}`);
    console.log(`  Users: ${userCount}`);
    console.log(`  Technicians: ${technicianCount}`);
    console.log(`  Recent Transactions:`, transactions);
    
    return {
      transactions,
      userCount,
      technicianCount,
      totalTransactions
    };
    
  } catch (error) {
    console.error('❌ Error debugging state:', error);
    return { transactions: [], userCount: 0, technicianCount: 0, totalTransactions: 0 };
  }
}

/**
 * Test transaction retrieval functions (same as dashboard uses)
 */
export async function testTransactionRetrieval(userId: string, userType: 'client' | 'technician'): Promise<any[]> {
  if (!db) return [];
  
  try {
    console.log(`🧪 Testing transaction retrieval for ${userType} ${userId}...`);
    
    if (userType === 'technician') {
      // Import the actual function used by dashboard
      const { getTechnicianTransactions } = await import('./firebase');
      const transactions = await getTechnicianTransactions(userId, 'test@example.com', null);
      console.log(`📊 Found ${transactions.length} technician transactions:`, transactions);
      return transactions;
    } else {
      // Import the actual function used by dashboard
      const { getClientTransactions } = await import('./firebase');
      const transactions = await getClientTransactions(userId, 'test@example.com');
      console.log(`📊 Found ${transactions.length} client transactions:`, transactions);
      return transactions;
    }
    
  } catch (error) {
    console.error('❌ Error testing transaction retrieval:', error);
    return [];
  }
}

/**
 * Comprehensive dashboard debugging
 */
export async function debugDashboardDisplay(userId: string): Promise<{
  userProfile: any;
  technicianTransactions: any[];
  clientTransactions: any[];
  dbState: any;
}> {
  console.log('🔍 Comprehensive dashboard debugging for user:', userId);
  
  // Get user profile
  let userProfile = null;
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      userProfile = { id: userDoc.id, ...userDoc.data() };
      console.log('👤 User Profile:', userProfile);
    }
    
    // Also check technicians collection
    const techDoc = await getDoc(doc(db, 'technicians', userId));
    if (techDoc.exists()) {
      const techProfile = { id: techDoc.id, ...techDoc.data() };
      console.log('🔧 Technician Profile:', techProfile);
      userProfile = { ...userProfile, ...techProfile, userType: 'technician' };
    }
  } catch (error) {
    console.error('❌ Error getting user profile:', error);
  }
  
  // Test transaction retrieval
  const technicianTransactions = await testTransactionRetrieval(userId, 'technician');
  const clientTransactions = await testTransactionRetrieval(userId, 'client');
  
  // Get database state
  const dbState = await debugTransactionState();
  
  return {
    userProfile,
    technicianTransactions,
    clientTransactions,
    dbState
  };
}