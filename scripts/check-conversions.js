const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.development.local' });

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (admin.apps.length === 0) {
  if (serviceAccountKey) {
    const serviceAccount = JSON.parse(serviceAccountKey);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else if (privateKey && clientEmail) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n')
      })
    });
  } else {
    console.error('No Firebase credentials found in environment variables');
    process.exit(1);
  }
}

const db = admin.firestore();

async function checkConversions() {
  try {
    console.log('Checking pointsConversions collection...\n');
    
    const snapshot = await db.collection('pointsConversions').get();
    console.log('Total conversions found:', snapshot.size);
    
    if (snapshot.empty) {
      console.log('\nNo conversion records found.');
      console.log('Let me check if you have any users with points...\n');
      
      // Check technicians
      const techSnapshot = await db.collection('technicians').limit(5).get();
      console.log('\nTechnicians with points:');
      techSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.points && data.points > 0) {
          console.log(`- ${data.email}: ${data.points} points (User ID: ${doc.id}, Auth UID: ${data.authUid})`);
        }
      });
      
      // Check clients
      const clientSnapshot = await db.collection('clients').limit(5).get();
      console.log('\nClients with points:');
      clientSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.points && data.points > 0) {
          console.log(`- ${data.email}: ${data.points} points (User ID: ${doc.id}, Auth UID: ${data.authUid})`);
        }
      });
    } else {
      console.log('\nConversion records:');
      snapshot.forEach(doc => {
        const data = doc.data();
        console.log('\n-------------------');
        console.log('Conversion ID:', doc.id);
        console.log('User ID:', data.userId);
        console.log('Points Converted:', data.pointsConverted);
        console.log('Tokens Generated:', data.tokensGenerated);
        console.log('Created At:', data.createdAt?.toDate());
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkConversions();
