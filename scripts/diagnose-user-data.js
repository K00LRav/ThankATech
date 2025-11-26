// Diagnostic script to check existing user data structure
const admin = require('firebase-admin');
const serviceAccount = require('../thankatech-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function diagnoseUsers() {
  console.log('\n🔍 Diagnosing User Data Structure...\n');
  
  try {
    // Check clients
    console.log('📋 CLIENTS COLLECTION:');
    const clientsSnapshot = await db.collection('clients').limit(3).get();
    console.log(`   Found ${clientsSnapshot.size} clients`);
    clientsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`   - ${doc.id}:`);
      console.log(`     Has authUid: ${!!data.authUid} (${data.authUid || 'MISSING'})`);
      console.log(`     Has email: ${!!data.email} (${data.email || 'MISSING'})`);
      console.log(`     Fields:`, Object.keys(data).join(', '));
    });
    
    // Check technicians
    console.log('\n🔧 TECHNICIANS COLLECTION:');
    const techSnapshot = await db.collection('technicians').limit(3).get();
    console.log(`   Found ${techSnapshot.size} technicians`);
    techSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`   - ${doc.id}:`);
      console.log(`     Has authUid: ${!!data.authUid} (${data.authUid || 'MISSING'})`);
      console.log(`     Has email: ${!!data.email} (${data.email || 'MISSING'})`);
      console.log(`     Fields:`, Object.keys(data).join(', '));
    });
    
    // Check admins
    console.log('\n👤 ADMINS COLLECTION:');
    const adminsSnapshot = await db.collection('admins').limit(3).get();
    console.log(`   Found ${adminsSnapshot.size} admins`);
    adminsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`   - ${doc.id}:`);
      console.log(`     Has authUid: ${!!data.authUid} (${data.authUid || 'MISSING'})`);
      console.log(`     Has email: ${!!data.email} (${data.email || 'MISSING'})`);
      console.log(`     Fields:`, Object.keys(data).join(', '));
    });
    
    // Check transactions
    console.log('\n💰 TOKEN TRANSACTIONS:');
    const txSnapshot = await db.collection('tokenTransactions').limit(3).get();
    console.log(`   Found ${txSnapshot.size} transactions`);
    txSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`   - ${doc.id}:`);
      console.log(`     Has fromUserId: ${!!data.fromUserId}`);
      console.log(`     Has toTechnicianId: ${!!data.toTechnicianId}`);
      console.log(`     Type: ${data.type || 'MISSING'}`);
    });
    
    console.log('\n✅ Diagnosis complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

diagnoseUsers();
