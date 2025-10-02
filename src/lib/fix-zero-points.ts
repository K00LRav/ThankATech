/**
 * FIX TOOL: Fix transactions where pointsAwarded is 0 but should be 1
 * 
 * This addresses the specific case where thank_you transactions have pointsAwarded: 0
 * instead of pointsAwarded: 1
 */

import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc,
  query,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export async function fixZeroPointTransactions(): Promise<{success: boolean, fixed: number, error?: string}> {
  if (!db) {
    return { success: false, fixed: 0, error: 'Firebase not configured' };
  }

  try {
    console.log('🔧 Finding transactions with pointsAwarded: 0 that should have points...');
    
    // Get all tokenTransactions where pointsAwarded is 0
    const transactionsRef = collection(db, 'tokenTransactions');
    const q = query(transactionsRef, where('pointsAwarded', '==', 0));
    const snapshot = await getDocs(q);
    
    let fixedCount = 0;
    
    console.log(`📊 Found ${snapshot.docs.length} transactions with 0 points to check`);
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      
      let shouldFix = false;
      let newPoints = 0;
      
      if (data.type === 'thank_you' || data.type === 'thankyou') {
        // Thank you should always have 1 point
        shouldFix = true;
        newPoints = 1;
        console.log(`🔧 Fixing thank_you transaction ${docSnap.id}: 0 -> 1 point`);
        
      } else if (data.type === 'toa' && data.toTechnicianId && data.tokens > 0) {
        // TOA sent to technician should have points equal to tokens
        shouldFix = true;
        newPoints = data.tokens;
        console.log(`🔧 Fixing toa transaction ${docSnap.id}: 0 -> ${data.tokens} points`);
      }
      
      if (shouldFix) {
        await updateDoc(doc(db, 'tokenTransactions', docSnap.id), {
          pointsAwarded: newPoints
        });
        fixedCount++;
      } else {
        console.log(`⏭️  Skipping ${docSnap.id}: correctly has 0 points (type: ${data.type})`);
      }
    }
    
    console.log(`🎉 Fix complete! Fixed ${fixedCount} transactions`);
    
    return { 
      success: true, 
      fixed: fixedCount
    };
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
    return { 
      success: false, 
      fixed: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export default fixZeroPointTransactions;