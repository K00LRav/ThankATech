// Test script to verify Firestore rules are working
// Run this with: node test-firestore-rules.js

require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function testRules() {
  console.log('\n🔍 Testing Firestore Rules...\n');
  
  try {
    // Test 1: Public access to technicians (should work WITHOUT auth)
    console.log('Test 1: Reading technicians collection (public access)...');
    const techQuery = query(collection(db, 'technicians'));
    const techSnapshot = await getDocs(techQuery);
    console.log(`✅ SUCCESS: Read ${techSnapshot.size} technicians (public access works)\n`);
    
    // Test 2: Try to read transactions WITHOUT auth (should fail)
    console.log('Test 2: Reading transactions without auth (should fail)...');
    try {
      const txQuery = query(collection(db, 'tokenTransactions'));
      await getDocs(txQuery);
      console.log('❌ PROBLEM: Transactions are publicly readable (rules not enforced)\n');
    } catch (error) {
      console.log('✅ SUCCESS: Transactions blocked without auth (expected)\n');
    }
    
    // Test 3: Sign in and try authenticated queries
    console.log('Test 3: Signing in with user credentials...');
    const userEmail = process.argv[2]; // Get email from command line
    const userPassword = process.argv[3]; // Get password from command line
    
    if (!userEmail || !userPassword) {
      console.log('⚠️  SKIPPED: No credentials provided');
      console.log('   To test authenticated access, run:');
      console.log('   node test-firestore-rules.js YOUR_EMAIL YOUR_PASSWORD\n');
      return;
    }
    
    const userCredential = await signInWithEmailAndPassword(auth, userEmail, userPassword);
    const userId = userCredential.user.uid;
    console.log(`✅ Signed in as: ${userEmail} (UID: ${userId})\n`);
    
    // Test 4: Query clients by authUid
    console.log('Test 4: Querying clients by authUid (authenticated)...');
    const clientQuery = query(collection(db, 'clients'), where('authUid', '==', userId));
    const clientSnapshot = await getDocs(clientQuery);
    console.log(`✅ SUCCESS: Found ${clientSnapshot.size} client profile(s)\n`);
    
    // Test 5: Query transactions
    console.log('Test 5: Querying transactions (authenticated)...');
    const txQuery = query(collection(db, 'tokenTransactions'), where('fromUserId', '==', userId));
    const txSnapshot = await getDocs(txQuery);
    console.log(`✅ SUCCESS: Found ${txSnapshot.size} transaction(s)\n`);
    
    console.log('🎉 All tests passed! Rules are working correctly.\n');
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    if (error.code === 'permission-denied') {
      console.error('\n⚠️  PERMISSION DENIED - Rules may not be deployed correctly');
      console.error('   Try running: firebase deploy --only firestore:rules\n');
    }
  }
  
  process.exit(0);
}

testRules();
