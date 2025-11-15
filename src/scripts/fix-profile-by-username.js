/**
 * Quick Fix for Specific Username
 * 
 * Usage: node src/scripts/fix-profile-by-username.js goodtek
 */

const admin = require('firebase-admin');

// Get username from command line
const username = process.argv[2];

if (!username) {
  console.error('❌ Please provide a username: node src/scripts/fix-profile-by-username.js goodtek');
  process.exit(1);
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

async function fixProfileByUsername(username) {
  console.log(`🔍 Looking for username: ${username}\n`);
  
  try {
    const normalizedUsername = username.toLowerCase().trim();
    
    // Find the original document by username
    const usernameQuery = await db.collection('technicians')
      .where('username', '==', normalizedUsername)
      .get();
    
    if (usernameQuery.empty) {
      console.error(`❌ No profile found with username: ${username}`);
      process.exit(1);
    }
    
    const originalDoc = usernameQuery.docs[0];
    const originalData = originalDoc.data();
    
    console.log(`✅ Found original profile:`);
    console.log(`   Document ID: ${originalDoc.id}`);
    console.log(`   Name: ${originalData.name}`);
    console.log(`   Email: ${originalData.email}`);
    console.log(`   AuthUID: ${originalData.authUid}\n`);
    
    // Find the duplicate document by authUid
    if (!originalData.authUid) {
      console.log(`⚠️  No authUid found - no duplicate to sync from`);
      process.exit(0);
    }
    
    const duplicateDoc = await db.collection('technicians').doc(originalData.authUid).get();
    
    if (!duplicateDoc.exists) {
      console.log(`ℹ️  No duplicate document found at technicians/${originalData.authUid}`);
      console.log(`   (This means profile edits were saved to the correct document)`);
      process.exit(0);
    }
    
    const duplicateData = duplicateDoc.data();
    
    console.log(`🔄 Found duplicate profile:`);
    console.log(`   Document ID: ${duplicateDoc.id}`);
    console.log(`   Updated: ${duplicateData.updatedAt || 'unknown'}\n`);
    
    // Merge data - use duplicate's data (most recent) but preserve username
    const mergedData = {
      ...duplicateData,
      username: normalizedUsername, // Keep the original username
      uniqueId: originalData.uniqueId, // Keep the original uniqueId
      updatedAt: new Date().toISOString(),
    };
    
    console.log(`📝 Syncing data to original document...\n`);
    
    // Update the original document
    await db.collection('technicians').doc(originalDoc.id).update(mergedData);
    
    console.log(`✅ SUCCESS! Profile updated:`);
    console.log(`   Name: ${mergedData.name || originalData.name}`);
    console.log(`   Photo: ${mergedData.image || mergedData.photoURL ? 'Updated ✅' : 'No change'}`);
    console.log(`   About: ${mergedData.about ? 'Updated ✅' : 'No change'}`);
    console.log(`\n🌐 Check: https://thankatech.com/${normalizedUsername}\n`);
    
    // Ask if they want to delete the duplicate
    console.log(`💡 Note: Duplicate document at technicians/${duplicateDoc.id} still exists.`);
    console.log(`   You can safely delete it manually if needed.\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run
fixProfileByUsername(username);
