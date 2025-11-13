/**
 * Export Test Data Before Live Launch
 * 
 * This script backs up all test data to a JSON file before resetting the database.
 * The backup will be saved in the backups/ directory.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
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

async function exportTestData() {
  console.log('📦 Starting test data export...\n');
  
  const backupData = {
    exportDate: new Date().toISOString(),
    collections: {}
  };

  try {
    // Export tokenTransactions
    console.log('1️⃣ Exporting token transactions...');
    const tokenTransactionsRef = collection(db, 'tokenTransactions');
    const tokenTransactionsSnapshot = await getDocs(tokenTransactionsRef);
    backupData.collections.tokenTransactions = [];
    
    tokenTransactionsSnapshot.forEach(doc => {
      backupData.collections.tokenTransactions.push({
        id: doc.id,
        ...doc.data()
      });
    });
    console.log(`  ✅ Exported ${backupData.collections.tokenTransactions.length} token transactions`);

    // Export tokenBalances
    console.log('\n2️⃣ Exporting token balances...');
    const tokenBalancesRef = collection(db, 'tokenBalances');
    const tokenBalancesSnapshot = await getDocs(tokenBalancesRef);
    backupData.collections.tokenBalances = [];
    
    tokenBalancesSnapshot.forEach(doc => {
      backupData.collections.tokenBalances.push({
        id: doc.id,
        ...doc.data()
      });
    });
    console.log(`  ✅ Exported ${backupData.collections.tokenBalances.length} token balances`);

    // Export thankYous
    console.log('\n3️⃣ Exporting thank yous...');
    const thankYousRef = collection(db, 'thankYous');
    const thankYousSnapshot = await getDocs(thankYousRef);
    backupData.collections.thankYous = [];
    
    thankYousSnapshot.forEach(doc => {
      backupData.collections.thankYous.push({
        id: doc.id,
        ...doc.data()
      });
    });
    console.log(`  ✅ Exported ${backupData.collections.thankYous.length} thank yous`);

    // Export client stats
    console.log('\n4️⃣ Exporting client stats...');
    const clientsRef = collection(db, 'clients');
    const clientsSnapshot = await getDocs(clientsRef);
    backupData.collections.clients = [];
    
    clientsSnapshot.forEach(doc => {
      backupData.collections.clients.push({
        id: doc.id,
        ...doc.data()
      });
    });
    console.log(`  ✅ Exported ${backupData.collections.clients.length} client records`);

    // Export technician stats
    console.log('\n5️⃣ Exporting technician stats...');
    const techniciansRef = collection(db, 'technicians');
    const techniciansSnapshot = await getDocs(techniciansRef);
    backupData.collections.technicians = [];
    
    techniciansSnapshot.forEach(doc => {
      backupData.collections.technicians.push({
        id: doc.id,
        ...doc.data()
      });
    });
    console.log(`  ✅ Exported ${backupData.collections.technicians.length} technician records`);

    // Save to file
    const backupsDir = join(process.cwd(), 'backups');
    if (!existsSync(backupsDir)) {
      mkdirSync(backupsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `test-data-backup-${timestamp}.json`;
    const filepath = join(backupsDir, filename);

    writeFileSync(filepath, JSON.stringify(backupData, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log('🎉 EXPORT COMPLETE!');
    console.log('='.repeat(60));
    console.log(`\n📁 Backup saved to: ${filepath}`);
    console.log('\n📊 Summary:');
    console.log(`  • Token Transactions: ${backupData.collections.tokenTransactions.length}`);
    console.log(`  • Token Balances: ${backupData.collections.tokenBalances.length}`);
    console.log(`  • Thank Yous: ${backupData.collections.thankYous.length}`);
    console.log(`  • Clients: ${backupData.collections.clients.length}`);
    console.log(`  • Technicians: ${backupData.collections.technicians.length}`);
    console.log('\n✅ Safe to proceed with reset-for-live script\n');

  } catch (error) {
    console.error('\n❌ Export failed:', error);
    process.exit(1);
  }
}

// Run the export
exportTestData().then(() => {
  console.log('✅ Script completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
