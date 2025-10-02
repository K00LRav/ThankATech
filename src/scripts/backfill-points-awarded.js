// Migration script to backfill pointsAwarded for existing tokenTransactions
// Run this once to fix existing user data

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  updateDoc,
  query,
  where
} from 'firebase/firestore';

// Firebase config (you'll need to replace with your actual config)
const firebaseConfig = {
  // Your Firebase config here
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function backfillPointsAwarded() {
  console.log('🔄 Starting pointsAwarded backfill migration...');
  
  try {
    // Get all tokenTransactions
    const transactionsRef = collection(db, 'tokenTransactions');
    const snapshot = await getDocs(transactionsRef);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    console.log(`📊 Found ${snapshot.docs.length} total transactions to check`);
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      
      // Skip if pointsAwarded already exists
      if (data.pointsAwarded !== undefined) {
        skippedCount++;
        continue;
      }
      
      // Calculate points based on transaction type
      let pointsAwarded = 0;
      
      if (data.type === 'thank_you') {
        // Thank you transactions: 1 point
        pointsAwarded = 1;
      } else if (data.type === 'toa' && data.tokens > 0) {
        // TOA token transactions: 1 point per token sent (for recipient)
        pointsAwarded = data.tokens;
      }
      // Token purchases (toa with tokens=0 or empty toTechnicianId): 0 points
      
      // Update the document
      if (pointsAwarded > 0) {
        await updateDoc(doc(db, 'tokenTransactions', docSnap.id), {
          pointsAwarded: pointsAwarded
        });
        
        console.log(`✅ Updated transaction ${docSnap.id}: ${data.type} -> ${pointsAwarded} points`);
        updatedCount++;
      } else {
        // Still update with 0 to mark as processed
        await updateDoc(doc(db, 'tokenTransactions', docSnap.id), {
          pointsAwarded: 0
        });
        console.log(`📝 Updated transaction ${docSnap.id}: ${data.type} -> 0 points (purchase/system)`);
        updatedCount++;
      }
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`🎉 Migration complete!`);
    console.log(`   ✅ Updated: ${updatedCount} transactions`);
    console.log(`   ⏭️  Skipped: ${skippedCount} transactions (already had pointsAwarded)`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
backfillPointsAwarded().then(() => {
  console.log('✨ Migration script finished');
  process.exit(0);
}).catch(error => {
  console.error('💥 Migration script failed:', error);
  process.exit(1);
});