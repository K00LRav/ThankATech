// Debug script to check user document structure
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkUser() {
  const userId = 'Vh3z5qOG6sdIbvZL14YZBmK83eS2';
  
  console.log('🔍 Checking for user:', userId);
  console.log('');
  
  // Check technicians by username
  const techByUsername = await db.collection('technicians')
    .where('username', '==', 'chrispenna')
    .limit(1)
    .get();
  
  if (!techByUsername.empty) {
    const doc = techByUsername.docs[0];
    console.log('✅ Found by username "chrispenna":');
    console.log('   Document ID:', doc.id);
    console.log('   Fields:', Object.keys(doc.data()));
    console.log('   Full data:', JSON.stringify(doc.data(), null, 2));
    console.log('');
    
    const data = doc.data();
    console.log('🔍 Auth-related fields:');
    console.log('   authUid:', data.authUid);
    console.log('   uid:', data.uid);
    console.log('   email:', data.email);
  } else {
    console.log('❌ Not found by username');
  }
  
  // Try searching by the Firebase Auth UID
  console.log('');
  console.log('🔍 Searching by authUid field...');
  const byAuthUid = await db.collection('technicians')
    .where('authUid', '==', userId)
    .limit(1)
    .get();
  
  if (!byAuthUid.empty) {
    console.log('✅ Found by authUid!');
  } else {
    console.log('❌ Not found by authUid');
  }
  
  console.log('');
  console.log('🔍 Searching by uid field...');
  const byUid = await db.collection('technicians')
    .where('uid', '==', userId)
    .limit(1)
    .get();
  
  if (!byUid.empty) {
    console.log('✅ Found by uid!');
  } else {
    console.log('❌ Not found by uid');
  }
  
  process.exit(0);
}

checkUser().catch(console.error);
