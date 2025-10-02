const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkTransactions() {
  console.log('🔍 Checking tokenTransactions collection...');
  
  const snapshot = await db.collection('tokenTransactions').limit(10).get();
  
  console.log(`Found ${snapshot.size} transactions`);
  
  if (snapshot.empty) {
    console.log('❌ No transactions found in tokenTransactions collection!');
    console.log('This explains why dashboard balances are zero!');
    return;
  }
  
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`📄 Transaction ${doc.id}:`);
    console.log(`  Type: ${data.type}`);
    console.log(`  From: ${data.fromUserId}`);
    console.log(`  To: ${data.toTechnicianId}`);
    console.log(`  Points: ${data.pointsAwarded}`);
    console.log(`  Tokens: ${data.tokens}`);
    console.log(`  Date: ${data.timestamp?.toDate()}`);
    console.log('---');
  });
}

checkTransactions().catch(console.error);