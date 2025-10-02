/**
 * Cleanup Script: Reduce technicians to exactly 14
 * 
 * Current State: 11 registered + 8 mock = 19 total
 * Target State: 3 registered + 11 mock = 14 total
 * 
 * This script will:
 * 1. Keep only 3 registered technicians (remove 8)
 * 2. Keep the 3 you registered from setup-complete-database.js
 * 3. Result: 3 registered + 11 mock = 14 total
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, 'thankatech-firebase-adminsdk.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function cleanupToFourteenTechnicians() {
  console.log('🧹 Starting cleanup to reduce to 14 total technicians...\n');

  try {
    // Get all technicians
    const techsSnapshot = await db.collection('technicians').get();
    const allTechs = [];
    
    techsSnapshot.forEach(doc => {
      allTechs.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`📊 Current state: ${allTechs.length} registered technicians in Firebase`);
    
    // Sort by creation time (keep the oldest 3, which should be your original ones)
    allTechs.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeA - timeB;
    });

    // Keep first 3, delete the rest
    const techsToKeep = allTechs.slice(0, 3);
    const techsToDelete = allTechs.slice(3);

    console.log(`\n✅ Keeping ${techsToKeep.length} technicians:`);
    techsToKeep.forEach(tech => {
      console.log(`   - ${tech.name} (${tech.email})`);
    });

    console.log(`\n❌ Deleting ${techsToDelete.length} technicians:`);
    techsToDelete.forEach(tech => {
      console.log(`   - ${tech.name} (${tech.email})`);
    });

    // Confirm before deletion
    console.log('\n⚠️  This will delete the technicians listed above.');
    console.log('📝 Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete extra technicians
    let deleted = 0;
    for (const tech of techsToDelete) {
      try {
        // Delete from technicians collection
        await db.collection('technicians').doc(tech.id).delete();
        
        // Also delete from users collection if exists
        const userDoc = await db.collection('users').doc(tech.id).get();
        if (userDoc.exists) {
          await db.collection('users').doc(tech.id).delete();
        }
        
        deleted++;
        console.log(`✅ Deleted: ${tech.name}`);
      } catch (error) {
        console.error(`❌ Error deleting ${tech.name}:`, error.message);
      }
    }

    console.log(`\n✅ Cleanup complete!`);
    console.log(`📊 Deleted ${deleted} technicians`);
    console.log(`📊 Remaining: ${techsToKeep.length} registered technicians`);
    console.log(`\n🎯 Expected total on website: 3 registered + 11 mock = 14 technicians`);
    console.log(`\n🔄 Refresh thankatech.com to see the updated count!`);

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the cleanup
cleanupToFourteenTechnicians();
