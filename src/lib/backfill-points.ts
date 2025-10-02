/**
 * ADMIN FUNCTION: Backfill missing pointsAwarded data for existing transactions
 * 
 * This fixes the issue where existing users don't see ThankATech Points in their dashboards
 * because old transactions are missing the pointsAwarded field.
 * 
 * Run this once from the admin page or browser console after logging in as admin.
 */

import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export async function backfillPointsAwarded(): Promise<{success: boolean, updated: number, skipped: number, error?: string}> {
  if (!db) {
    return { success: false, updated: 0, skipped: 0, error: 'Firebase not configured' };
  }

  try {
    console.log('🔄 Starting pointsAwarded backfill for existing transactions...');
    
    // Get all tokenTransactions
    const transactionsRef = collection(db, 'tokenTransactions');
    const snapshot = await getDocs(transactionsRef);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    console.log(`📊 Found ${snapshot.docs.length} transactions to process`);
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      
      // Check if pointsAwarded needs fixing
      const hasPointsField = 'pointsAwarded' in data;
      const currentPoints = data.pointsAwarded;
      
      console.log(`🔍 Checking transaction ${docSnap.id}: type=${data.type}, pointsAwarded=${currentPoints} (${typeof currentPoints}), hasField=${hasPointsField}`);
      
      // Skip if pointsAwarded already exists and is correct (not 0 for thank_you/toa)
      if (hasPointsField && currentPoints !== undefined && currentPoints !== null) {
        // For thank_you, points should be 1+, for toa with tokens, should be 1+
        const shouldHavePoints = (data.type === 'thank_you') || (data.type === 'toa' && data.tokens > 0);
        if (!shouldHavePoints || currentPoints > 0) {
          console.log(`⏭️  Skipped transaction ${docSnap.id}: already has correct pointsAwarded = ${currentPoints}`);
          skippedCount++;
          continue;
        }
      }
      
      // Calculate points based on transaction type and data
      let pointsAwarded = 0;
      
      if (data.type === 'thank_you') {
        // Thank you transactions: 1 point to recipient
        pointsAwarded = 1;
        console.log(`💝 Thank you transaction: ${docSnap.id} -> 1 point`);
        
      } else if (data.type === 'toa' || data.type === 'appreciation') {
        if (data.toTechnicianId === '' || !data.toTechnicianId) {
          // Token purchase: 0 points
          pointsAwarded = 0;
          console.log(`🛒 Token purchase: ${docSnap.id} -> 0 points`);
        } else if (data.tokens && data.tokens > 0) {
          // TOA token sent: points equal to tokens sent (recipient gets points)
          pointsAwarded = data.tokens;
          console.log(`💰 TOA tokens sent: ${docSnap.id} -> ${data.tokens} points`);
        } else {
          // Default for toa type
          pointsAwarded = 2; // Default TOA points
          console.log(`💎 TOA transaction: ${docSnap.id} -> 2 points (default)`);
        }
      } else {
        // Unknown type or old format
        pointsAwarded = 0;
        console.log(`❓ Unknown type: ${docSnap.id} -> 0 points`);
      }
      
      // Update the document with pointsAwarded
      await updateDoc(doc(db, 'tokenTransactions', docSnap.id), {
        pointsAwarded: pointsAwarded
      });
      
      updatedCount++;
      
      // Small delay to avoid rate limiting
      if (updatedCount % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log(`   📈 Progress: ${updatedCount}/${snapshot.docs.length - skippedCount} updated`);
      }
    }
    
    console.log(`🎉 Backfill complete!`);
    console.log(`   ✅ Updated: ${updatedCount} transactions`);
    console.log(`   ⏭️  Skipped: ${skippedCount} transactions (already processed)`);
    console.log(`   📊 Total processed: ${updatedCount + skippedCount}/${snapshot.docs.length}`);
    
    return { 
      success: true, 
      updated: updatedCount, 
      skipped: skippedCount 
    };
    
  } catch (error) {
    console.error('❌ Backfill failed:', error);
    return { 
      success: false, 
      updated: 0, 
      skipped: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Export for use in admin page
export default backfillPointsAwarded;