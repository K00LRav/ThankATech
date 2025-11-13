/**
 * Export Test Data Before Reset
 * 
 * Creates a backup JSON file of all test data before resetting for live launch
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const serviceAccount = require('../../serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function exportTestData() {
  console.log('📦 Exporting test data for backup...\n');
  
  const backupData = {
    exportDate: new Date().toISOString(),
    collections: {}
  };
  
  try {
    // Export tokenTransactions
    console.log('🔄 Exporting tokenTransactions...');
    const tokenTransactions = await db.collection('tokenTransactions').get();
    backupData.collections.tokenTransactions = tokenTransactions.docs
      .filter(doc => !doc.id.startsWith('mock-'))
      .map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`✅ Exported ${backupData.collections.tokenTransactions.length} token transactions`);
    
    // Export tokenBalances
    console.log('🔄 Exporting tokenBalances...');
    const tokenBalances = await db.collection('tokenBalances').get();
    backupData.collections.tokenBalances = tokenBalances.docs
      .filter(doc => !doc.id.startsWith('mock-'))
      .map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`✅ Exported ${backupData.collections.tokenBalances.length} token balances`);
    
    // Export thankYous
    console.log('🔄 Exporting thankYous...');
    const thankYous = await db.collection('thankYous').get();
    backupData.collections.thankYous = thankYous.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`✅ Exported ${backupData.collections.thankYous.length} thank yous`);
    
    // Export client stats (not the accounts themselves)
    console.log('🔄 Exporting client stats...');
    const clients = await db.collection('clients').get();
    backupData.collections.clientStats = clients.docs
      .filter(doc => !doc.id.startsWith('mock-'))
      .map(doc => ({
        id: doc.id,
        name: doc.data().name,
        totalTipsSent: doc.data().totalTipsSent || 0,
        totalSpent: doc.data().totalSpent || 0,
        totalThankYous: doc.data().totalThankYous || 0,
        points: doc.data().points || 0
      }));
    console.log(`✅ Exported stats for ${backupData.collections.clientStats.length} clients`);
    
    // Export technician stats (not the accounts themselves)
    console.log('🔄 Exporting technician stats...');
    const technicians = await db.collection('technicians').get();
    backupData.collections.technicianStats = technicians.docs
      .filter(doc => !doc.id.startsWith('mock-'))
      .map(doc => ({
        id: doc.id,
        name: doc.data().name,
        totalTips: doc.data().totalTips || 0,
        totalThankYous: doc.data().totalThankYous || 0,
        points: doc.data().points || 0
      }));
    console.log(`✅ Exported stats for ${backupData.collections.technicianStats.length} technicians`);
    
    // Save to file
    const backupDir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const filename = `test-data-backup-${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.json`;
    const filepath = path.join(backupDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ BACKUP COMPLETE!');
    console.log('═══════════════════════════════════════════════════');
    console.log(`📁 Backup saved to: ${filepath}`);
    console.log(`📊 Total items backed up: ${
      backupData.collections.tokenTransactions.length +
      backupData.collections.tokenBalances.length +
      backupData.collections.thankYous.length
    }`);
    console.log('═══════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error during export:', error);
    throw error;
  }
}

// Run the export
exportTestData()
  .then(() => {
    console.log('✅ Export completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Export failed:', error);
    process.exit(1);
  });
