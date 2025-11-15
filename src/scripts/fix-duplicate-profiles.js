/**
 * Fix Duplicate Profile Documents
 * 
 * This script finds technicians who have duplicate documents due to the profile update bug,
 * and syncs the data from the user.uid document to the original username document.
 * 
 * Run with: node src/scripts/fix-duplicate-profiles.js
 */

const admin = require('firebase-admin');

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

async function fixDuplicateProfiles() {
  console.log('🔍 Starting duplicate profile fix...\n');
  
  try {
    // Get all technician documents
    const techniciansSnapshot = await db.collection('technicians').get();
    
    console.log(`📊 Found ${techniciansSnapshot.size} total technician documents\n`);
    
    // Group documents by authUid or email
    const userGroups = new Map();
    
    techniciansSnapshot.forEach(doc => {
      const data = doc.data();
      const authUid = data.authUid;
      const email = data.email;
      const username = data.username;
      
      if (!authUid && !email) {
        console.log(`⚠️  Skipping ${doc.id} - no authUid or email`);
        return;
      }
      
      const key = authUid || email;
      
      if (!userGroups.has(key)) {
        userGroups.set(key, []);
      }
      
      userGroups.get(key).push({
        id: doc.id,
        username,
        authUid,
        email,
        hasUsername: !!username,
        data
      });
    });
    
    // Find and fix duplicates
    let fixedCount = 0;
    let duplicatesFound = 0;
    
    for (const [key, docs] of userGroups) {
      if (docs.length > 1) {
        duplicatesFound++;
        console.log(`\n🔄 Found duplicate for ${docs[0].email}:`);
        
        // Find the original document (has username) and the duplicate (doc ID = authUid)
        const originalDoc = docs.find(d => d.hasUsername && d.id !== d.authUid);
        const duplicateDoc = docs.find(d => d.id === d.authUid);
        
        if (originalDoc && duplicateDoc) {
          console.log(`   📄 Original: ${originalDoc.id} (username: ${originalDoc.username})`);
          console.log(`   📄 Duplicate: ${duplicateDoc.id} (created by profile page)`);
          
          // Merge data - prefer duplicate's data (most recent edits) but keep username
          const mergedData = {
            ...originalDoc.data,
            ...duplicateDoc.data,
            username: originalDoc.username, // Keep original username
            uniqueId: originalDoc.data.uniqueId || duplicateDoc.data.uniqueId,
          };
          
          // Update the original document with merged data
          await db.collection('technicians').doc(originalDoc.id).update(mergedData);
          console.log(`   ✅ Updated ${originalDoc.id} with latest data`);
          
          // Optionally delete the duplicate
          // await db.collection('technicians').doc(duplicateDoc.id).delete();
          // console.log(`   🗑️  Deleted duplicate ${duplicateDoc.id}`);
          
          fixedCount++;
        } else {
          console.log(`   ⚠️  Could not identify original vs duplicate`);
          docs.forEach(d => {
            console.log(`      - ${d.id} (username: ${d.username}, authUid: ${d.authUid})`);
          });
        }
      }
    }
    
    console.log(`\n\n📊 Summary:`);
    console.log(`   Total documents: ${techniciansSnapshot.size}`);
    console.log(`   Duplicates found: ${duplicatesFound}`);
    console.log(`   Fixed: ${fixedCount}`);
    console.log(`\n✅ Done!\n`);
    
  } catch (error) {
    console.error('❌ Error fixing duplicates:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run if executed directly
if (require.main === module) {
  fixDuplicateProfiles();
}

module.exports = { fixDuplicateProfiles };
