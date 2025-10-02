/**
 * BROWSER CONSOLE CLEANUP SCRIPT
 * ================================
 * 
 * Copy and paste this entire script into your browser console on localhost:3000
 * This will reduce your technicians from 19 to 14 (3 registered + 11 mock)
 * 
 * Instructions:
 * 1. Open localhost:3000 in your browser
 * 2. Press F12 to open Developer Tools
 * 3. Go to Console tab
 * 4. Copy and paste this ENTIRE script
 * 5. Press Enter
 * 6. Wait for completion message
 * 7. Refresh the page
 */

(async function cleanupTo14Technicians() {
  console.log('%c🧹 CLEANUP SCRIPT STARTING', 'color: #4CAF50; font-size: 16px; font-weight: bold');
  console.log('%c━'.repeat(50), 'color: #4CAF50');
  
  try {
    // Import Firebase from the page
    const { getFirestore, collection, getDocs, deleteDoc, doc } = window.firebase?.firestore 
      ? window.firebase.firestore 
      : await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    // Get Firestore instance from your app
    const db = getFirestore();
    
    // Get all technicians
    console.log('📊 Fetching all technicians...');
    const techsRef = collection(db, 'technicians');
    const snapshot = await getDocs(techsRef);
    
    const allTechs = [];
    snapshot.forEach(docSnap => {
      allTechs.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    console.log(`\n📊 Current count: ${allTechs.length} registered technicians`);
    console.log(`📊 Target count: 3 registered technicians (+ 11 mock = 14 total)`);
    console.log(`📊 To delete: ${allTechs.length - 3} technicians\n`);

    // Sort by createdAt (keep oldest 3)
    allTechs.sort((a, b) => {
      const getTime = (t) => {
        if (t.createdAt?.toMillis) return t.createdAt.toMillis();
        if (t.createdAt?.seconds) return t.createdAt.seconds * 1000;
        return 0;
      };
      return getTime(a) - getTime(b);
    });

    const toKeep = allTechs.slice(0, 3);
    const toDelete = allTechs.slice(3);

    console.group('✅ KEEPING (3 technicians)');
    toKeep.forEach(t => console.log(`✓ ${t.name} (${t.email || 'no email'})`));
    console.groupEnd();

    console.group('❌ DELETING (' + toDelete.length + ' technicians)');
    toDelete.forEach(t => console.log(`✗ ${t.name} (${t.email || 'no email'})`));
    console.groupEnd();

    // Delete extras
    console.log('\n🗑️  Starting deletion...\n');
    let deleted = 0;
    
    for (const tech of toDelete) {
      try {
        // Delete from technicians collection
        await deleteDoc(doc(db, 'technicians', tech.id));
        
        // Try to delete from users collection
        try {
          await deleteDoc(doc(db, 'users', tech.id));
        } catch (e) {
          // User doc might not exist, that's okay
        }
        
        deleted++;
        console.log(`✅ Deleted (${deleted}/${toDelete.length}): ${tech.name}`);
      } catch (error) {
        console.error(`❌ Failed to delete ${tech.name}:`, error.message);
      }
    }

    console.log('%c\n━'.repeat(50), 'color: #4CAF50');
    console.log('%c🎉 CLEANUP COMPLETE!', 'color: #4CAF50; font-size: 18px; font-weight: bold');
    console.log('%c━'.repeat(50), 'color: #4CAF50');
    console.log(`\n📊 Summary:`);
    console.log(`   • Deleted: ${deleted} technicians`);
    console.log(`   • Remaining: 3 registered technicians`);
    console.log(`   • Total on site: 3 registered + 11 mock = 14 technicians`);
    console.log(`\n🔄 Refresh the page to see the update!\n`);

  } catch (error) {
    console.error('%c❌ CLEANUP FAILED', 'color: #f44336; font-size: 16px; font-weight: bold');
    console.error(error);
    console.log('\n💡 Make sure you are on localhost:3000 and logged in as admin');
  }
})();
