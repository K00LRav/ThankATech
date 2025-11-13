/**
 * Reset Database for Live Stripe Launch
 * 
 * This script will:
 * 1. Delete all tokenTransactions (excluding mock data)
 * 2. Reset all tokenBalances to 0 (excluding mock data)
 * 3. Delete all thankYous
 * 4. Reset client stats to 0 (totalTipsSent, totalSpent, totalThankYous, points)
 * 5. Reset technician stats to 0 (totalTips, totalThankYous, points)
 * 6. Preserve all user accounts and profiles
 * 
 * WARNING: This is irreversible! Make sure to run export-test-data.mjs first.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Firebase config
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

// Helper to check if ID is mock data
const isMockData = (id) => id?.startsWith('mock-');

async function resetDatabase() {
  console.log('🚀 Starting database reset for live launch...\n');
  
  const summary = {
    tokenTransactionsDeleted: 0,
    tokenBalancesReset: 0,
    thankYousDeleted: 0,
    clientsReset: 0,
    techniciansReset: 0,
    legacyTransactionsDeleted: 0
  };

  try {
    // 1. Delete tokenTransactions (exclude mock data)
    console.log('1️⃣ Deleting token transactions...');
    const tokenTransactionsRef = collection(db, 'tokenTransactions');
    const tokenTransactionsSnapshot = await getDocs(tokenTransactionsRef);
    
    for (const docSnapshot of tokenTransactionsSnapshot.docs) {
      const data = docSnapshot.data();
      const docId = docSnapshot.id;
      
      // Skip mock data - check all user ID fields
      if (
        isMockData(docId) ||
        isMockData(data.fromUserId) ||
        isMockData(data.toUserId) ||
        isMockData(data.userId) ||
        isMockData(data.toTechnicianId) ||
        isMockData(data.fromTechnicianId)
      ) {
        console.log(`  ⏭️ Skipping mock transaction: ${docId}`);
        continue;
      }
      
      await deleteDoc(doc(db, 'tokenTransactions', docId));
      summary.tokenTransactionsDeleted++;
      console.log(`  ✅ Deleted transaction: ${docId}`);
    }

    // 2. Reset tokenBalances to 0 (exclude mock data)
    console.log('\n2️⃣ Resetting token balances...');
    const tokenBalancesRef = collection(db, 'tokenBalances');
    const tokenBalancesSnapshot = await getDocs(tokenBalancesRef);
    
    for (const docSnapshot of tokenBalancesSnapshot.docs) {
      const userId = docSnapshot.id;
      
      // Skip mock data
      if (isMockData(userId)) {
        console.log(`  ⏭️ Skipping mock balance: ${userId}`);
        continue;
      }
      
      await updateDoc(doc(db, 'tokenBalances', userId), {
        balance: 0,
        lastUpdated: new Date().toISOString()
      });
      summary.tokenBalancesReset++;
      console.log(`  ✅ Reset balance for: ${userId}`);
    }

    // 3. Delete all thankYous
    console.log('\n3️⃣ Deleting thank yous...');
    const thankYousRef = collection(db, 'thankYous');
    const thankYousSnapshot = await getDocs(thankYousRef);
    
    for (const docSnapshot of thankYousSnapshot.docs) {
      await deleteDoc(doc(db, 'thankYous', docSnapshot.id));
      summary.thankYousDeleted++;
      console.log(`  ✅ Deleted thank you: ${docSnapshot.id}`);
    }

    // 4. Reset client stats
    console.log('\n4️⃣ Resetting client stats...');
    const clientsRef = collection(db, 'clients');
    const clientsSnapshot = await getDocs(clientsRef);
    
    for (const docSnapshot of clientsSnapshot.docs) {
      const clientId = docSnapshot.id;
      
      // Skip mock data
      if (isMockData(clientId)) {
        console.log(`  ⏭️ Skipping mock client: ${clientId}`);
        continue;
      }
      
      await updateDoc(doc(db, 'clients', clientId), {
        totalTipsSent: 0,
        totalSpent: 0,
        totalThankYous: 0,
        points: 0,
        lastUpdated: new Date().toISOString()
      });
      summary.clientsReset++;
      console.log(`  ✅ Reset stats for client: ${clientId}`);
    }

    // 5. Reset technician stats
    console.log('\n5️⃣ Resetting technician stats...');
    const techniciansRef = collection(db, 'technicians');
    const techniciansSnapshot = await getDocs(techniciansRef);
    
    for (const docSnapshot of techniciansSnapshot.docs) {
      const techId = docSnapshot.id;
      
      // Skip mock data
      if (isMockData(techId)) {
        console.log(`  ⏭️ Skipping mock technician: ${techId}`);
        continue;
      }
      
      await updateDoc(doc(db, 'technicians', techId), {
        totalTips: 0,
        totalThankYous: 0,
        points: 0,
        lastUpdated: new Date().toISOString()
      });
      summary.techniciansReset++;
      console.log(`  ✅ Reset stats for technician: ${techId}`);
    }

    // 6. Delete legacy transactions (if any)
    console.log('\n6️⃣ Checking for legacy transactions...');
    try {
      const transactionsRef = collection(db, 'transactions');
      const transactionsSnapshot = await getDocs(transactionsRef);
      
      for (const docSnapshot of transactionsSnapshot.docs) {
        await deleteDoc(doc(db, 'transactions', docSnapshot.id));
        summary.legacyTransactionsDeleted++;
        console.log(`  ✅ Deleted legacy transaction: ${docSnapshot.id}`);
      }
    } catch (error) {
      console.log('  ℹ️ No legacy transactions collection found');
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 DATABASE RESET COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`  • Token Transactions Deleted: ${summary.tokenTransactionsDeleted}`);
    console.log(`  • Token Balances Reset: ${summary.tokenBalancesReset}`);
    console.log(`  • Thank Yous Deleted: ${summary.thankYousDeleted}`);
    console.log(`  • Client Stats Reset: ${summary.clientsReset}`);
    console.log(`  • Technician Stats Reset: ${summary.techniciansReset}`);
    console.log(`  • Legacy Transactions Deleted: ${summary.legacyTransactionsDeleted}`);
    console.log('\n✅ Your database is now ready for live Stripe transactions!');
    console.log('📝 Next steps:');
    console.log('   1. Update .env.local with live Stripe keys');
    console.log('   2. Configure production webhook');
    console.log('   3. Test first live transaction');
    console.log('   4. See LIVE_LAUNCH_GUIDE.md for details\n');
    
  } catch (error) {
    console.error('\n❌ Reset failed:', error);
    process.exit(1);
  }
}

// Run the reset
resetDatabase().then(() => {
  console.log('✅ Script completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
