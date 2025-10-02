// 🔥 BROWSER CONSOLE MIGRATION SCRIPT
// Copy and paste this entire script into your browser console (F12)
// Make sure you're on any page of your ThankATech website first

console.log('🚀 ThankATech Migration Script Starting...\n');

// Migration function that uses the existing Firebase connection
async function migrateUsersToClients() {
  try {
    // Get Firebase from the page (it should be available)
    let db;
    
    // Try to get Firebase from global scope
    if (window.firebase && window.firebase.firestore) {
      db = window.firebase.firestore();
      console.log('✅ Using global Firebase instance');
    } 
    // Try to import from your app's modules
    else {
      console.log('⚡ Initializing Firebase for migration...');
      
      // Import Firebase modules
      const { initializeApp, getApps, getApp } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js');
      const { getFirestore, collection, getDocs, doc, setDoc } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js');
      
      // Your Firebase config
      const firebaseConfig = {
        apiKey: "AIzaSyATA7UJUNHXdQmJYYBmfvddNvWC568VN4Y",
        authDomain: "thankatech.firebaseapp.com",
        projectId: "thankatech",
        storageBucket: "thankatech.firebasestorage.app",
        messagingSenderId: "174593556452",
        appId: "1:174593556452:web:54e8f0d48ff97c2899d1f1"
      };
      
      // Initialize Firebase
      const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
      db = getFirestore(app);
      console.log('✅ Firebase initialized for migration');
    }

    console.log('\n📊 Checking collections...');
    
    // Check users collection
    const usersSnapshot = await getDocs(collection(db, 'users'));
    console.log(`   Users collection: ${usersSnapshot.size} documents`);
    
    // Check clients collection
    const clientsSnapshot = await getDocs(collection(db, 'clients'));
    console.log(`   Clients collection: ${clientsSnapshot.size} documents`);
    
    // Check technicians collection
    const techsSnapshot = await getDocs(collection(db, 'technicians'));
    console.log(`   Technicians collection: ${techsSnapshot.size} documents`);
    
    if (usersSnapshot.empty) {
      console.log('\n✅ No documents in users collection. Migration not needed.');
      return { success: true, message: 'No migration needed' };
    }
    
    console.log(`\n🚀 Starting migration of ${usersSnapshot.size} documents...`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    const promises = [];
    
    usersSnapshot.forEach((userDoc, index) => {
      const userData = userDoc.data();
      const docId = userDoc.id;
      
      console.log(`${index + 1}. Processing: ${userData.email || docId}`);
      
      // Only migrate clients (not technicians)
      if (!userData.userType || userData.userType === 'client' || userData.userType === 'customer') {
        const clientRef = doc(db, 'clients', docId);
        
        const promise = setDoc(clientRef, {
          ...userData,
          userType: 'client',
          migratedAt: new Date(),
          migratedFrom: 'users',
          migrationVersion: '1.19.0'
        }).then(() => {
          migratedCount++;
          console.log(`   ✅ Migrated: ${userData.email || docId}`);
        }).catch((error) => {
          console.error(`   ❌ Failed to migrate ${docId}:`, error);
        });
        
        promises.push(promise);
      } else {
        skippedCount++;
        console.log(`   ⏭️ Skipped (technician): ${userData.email || docId}`);
      }
    });
    
    console.log(`\n⏳ Executing ${promises.length} migrations...`);
    await Promise.all(promises);
    
    // Verify results
    const newClientsSnapshot = await getDocs(collection(db, 'clients'));
    
    console.log('\n🎉 Migration Results:');
    console.log(`   ✅ Migrated: ${migratedCount} clients`);
    console.log(`   ⏭️ Skipped: ${skippedCount} technicians`);
    console.log(`   📊 Total clients now: ${newClientsSnapshot.size}`);
    
    if (migratedCount > 0) {
      console.log('\n🚨 NEXT STEPS:');
      console.log('1. Test your application to ensure everything works');
      console.log('2. Verify data in Firebase Console');
      console.log('3. Manually delete the "users" collection from Firebase Console');
      console.log('   Firebase Console → Firestore → Delete "users" collection');
    }
    
    return {
      success: true,
      migratedCount,
      skippedCount,
      totalClientsAfter: newClientsSnapshot.size
    };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return { success: false, error: error.message };
  }
}

// Run the migration
console.log('Starting migration in 3 seconds...');
setTimeout(async () => {
  const result = await migrateUsersToClients();
  if (result.success) {
    console.log('\n🎉 Migration completed successfully!');
  } else {
    console.error('\n❌ Migration failed:', result.error);
  }
}, 3000);