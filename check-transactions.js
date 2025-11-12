const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkTransactions() {
  try {
    // Find the client
    const clientSnap = await db.collection('clients')
      .where('email', '==', 'support@thankatech.com')
      .get();
    
    if (clientSnap.empty) {
      console.log('❌ No client found with email support@thankatech.com');
      return;
    }
    
    const clientDoc = clientSnap.docs[0];
    const clientData = clientDoc.data();
    const authUid = clientData.authUid || clientData.uid;
    
    console.log('✅ Client found:');
    console.log('   Document ID:', clientDoc.id);
    console.log('   Auth UID:', authUid);
    console.log('   Name:', clientData.name);
    console.log('   Email:', clientData.email);
    
    // Get all transactions
    const txSnap = await db.collection('tokenTransactions')
      .where('fromUserId', '==', authUid)
      .get();
    
    console.log('\n📊 Transaction Summary:');
    console.log('   Total transactions:', txSnap.size);
    
    const purchases = [];
    const sent = [];
    const thankYous = [];
    
    txSnap.docs.forEach(doc => {
      const data = doc.data();
      if (data.type === 'token_purchase') {
        purchases.push({ id: doc.id, ...data });
      } else if (data.type === 'thank_you') {
        thankYous.push({ id: doc.id, ...data });
      } else {
        sent.push({ id: doc.id, ...data });
      }
    });
    
    console.log('   Purchases:', purchases.length);
    console.log('   Sent tokens:', sent.length);
    console.log('   Thank yous:', thankYous.length);
    
    console.log('\n💰 Purchase Details:');
    purchases.forEach((p, i) => {
      const date = p.timestamp?.toDate ? p.timestamp.toDate() : new Date(p.timestamp);
      console.log(`   ${i + 1}. ${p.tokens} tokens for $${p.dollarValue || 0} - ${date.toLocaleString()}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTransactions();
