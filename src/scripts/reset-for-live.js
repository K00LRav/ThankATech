/**
 * Reset Test Data for Live Stripe Launch
 * 
 * This script will:
 * 1. Delete all tokenTransactions
 * 2. Reset all tokenBalances to 0
 * 3. Delete all thankYous transactions
 * 4. Keep clients and technicians (just reset their stats)
 * 5. Preserve user accounts and profiles
 */

const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function resetForLive() {
  console.log('🚀 Starting reset for live Stripe launch...\n');
  
  try {
    // 1. Delete all tokenTransactions
    console.log('🔄 Deleting all token transactions...');
    const tokenTransactionsRef = db.collection('tokenTransactions');
    const tokenTransactionsSnapshot = await tokenTransactionsRef.get();
    
    const tokenTransactionsBatch = db.batch();
    let tokenTransactionsCount = 0;
    
    tokenTransactionsSnapshot.forEach((doc) => {
      // Skip mock data
      if (!doc.id.startsWith('mock-')) {
        tokenTransactionsBatch.delete(doc.ref);
        tokenTransactionsCount++;
      }
    });
    
    await tokenTransactionsBatch.commit();
    console.log(`✅ Deleted ${tokenTransactionsCount} token transactions\n`);
    
    // 2. Reset all tokenBalances to 0
    console.log('🔄 Resetting all token balances to 0...');
    const tokenBalancesRef = db.collection('tokenBalances');
    const tokenBalancesSnapshot = await tokenBalancesRef.get();
    
    const balancesBatch = db.batch();
    let balancesCount = 0;
    
    tokenBalancesSnapshot.forEach((doc) => {
      // Skip mock data
      if (!doc.id.startsWith('mock-')) {
        balancesBatch.update(doc.ref, { tokens: 0 });
        balancesCount++;
      }
    });
    
    await balancesBatch.commit();
    console.log(`✅ Reset ${balancesCount} token balances to 0\n`);
    
    // 3. Delete all thankYous
    console.log('🔄 Deleting all thank you transactions...');
    const thankYousRef = db.collection('thankYous');
    const thankYousSnapshot = await thankYousRef.get();
    
    const thankYousBatch = db.batch();
    let thankYousCount = 0;
    
    thankYousSnapshot.forEach((doc) => {
      thankYousBatch.delete(doc.ref);
      thankYousCount++;
    });
    
    await thankYousBatch.commit();
    console.log(`✅ Deleted ${thankYousCount} thank you transactions\n`);
    
    // 4. Reset client stats
    console.log('🔄 Resetting client statistics...');
    const clientsRef = db.collection('clients');
    const clientsSnapshot = await clientsRef.get();
    
    const clientsBatch = db.batch();
    let clientsCount = 0;
    
    clientsSnapshot.forEach((doc) => {
      const data = doc.data();
      // Skip mock data and incomplete clients
      if (!doc.id.startsWith('mock-') && (data.name || data.displayName)) {
        clientsBatch.update(doc.ref, {
          totalTipsSent: 0,
          totalSpent: 0,
          totalThankYous: 0,
          points: 0
        });
        clientsCount++;
      }
    });
    
    await clientsBatch.commit();
    console.log(`✅ Reset stats for ${clientsCount} clients\n`);
    
    // 5. Reset technician stats
    console.log('🔄 Resetting technician statistics...');
    const techniciansRef = db.collection('technicians');
    const techniciansSnapshot = await techniciansRef.get();
    
    const techniciansBatch = db.batch();
    let techniciansCount = 0;
    
    techniciansSnapshot.forEach((doc) => {
      // Skip mock data
      if (!doc.id.startsWith('mock-')) {
        techniciansBatch.update(doc.ref, {
          totalTips: 0,
          totalThankYous: 0,
          points: 0
        });
        techniciansCount++;
      }
    });
    
    await techniciansBatch.commit();
    console.log(`✅ Reset stats for ${techniciansCount} technicians\n`);
    
    // 6. Delete legacy transactions (if any)
    console.log('🔄 Deleting legacy transactions...');
    const transactionsRef = db.collection('transactions');
    const transactionsSnapshot = await transactionsRef.get();
    
    if (transactionsSnapshot.size > 0) {
      const transactionsBatch = db.batch();
      let transactionsCount = 0;
      
      transactionsSnapshot.forEach((doc) => {
        transactionsBatch.delete(doc.ref);
        transactionsCount++;
      });
      
      await transactionsBatch.commit();
      console.log(`✅ Deleted ${transactionsCount} legacy transactions\n`);
    } else {
      console.log(`✅ No legacy transactions found\n`);
    }
    
    // Summary
    console.log('═══════════════════════════════════════════════════');
    console.log('🎉 RESET COMPLETE - READY FOR LIVE STRIPE!');
    console.log('═══════════════════════════════════════════════════');
    console.log(`📊 Summary:`);
    console.log(`   • Token Transactions Deleted: ${tokenTransactionsCount}`);
    console.log(`   • Token Balances Reset: ${balancesCount} (all set to 0)`);
    console.log(`   • Thank Yous Deleted: ${thankYousCount}`);
    console.log(`   • Clients Stats Reset: ${clientsCount}`);
    console.log(`   • Technicians Stats Reset: ${techniciansCount}`);
    console.log(``);
    console.log(`✅ Your accounts are preserved with stats reset to 0`);
    console.log(`✅ Ready to switch to live Stripe keys`);
    console.log(`✅ Admin dashboard will show all zeros`);
    console.log('═══════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error during reset:', error);
    throw error;
  }
}

// Run the reset
resetForLive()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
