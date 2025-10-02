/**
 * TEST THANK YOU: Send a test thank you to see points in dashboard
 */

import { 
  doc,
  setDoc,
  serverTimestamp,
  collection
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export async function sendTestThankYou(fromUserId: string, toTechnicianId: string): Promise<{success: boolean, message: string}> {
  if (!db) {
    return { success: false, message: 'Firebase not configured' };
  }

  try {
    console.log(`💝 Sending test thank you:`);
    console.log(`   From: ${fromUserId}`);
    console.log(`   To: ${toTechnicianId}`);
    
    // Create a test transaction
    const transactionId = `test-${Date.now()}`;
    const transactionDoc = {
      type: 'thank_you',
      fromUserId: fromUserId,
      toTechnicianId: toTechnicianId,
      tokens: 0,
      dollarValue: 0,
      message: 'Test thank you from admin panel',
      timestamp: serverTimestamp(),
      pointsAwarded: 1, // 1 point for thank you
      status: 'completed',
      isTest: true // Mark as test transaction
    };
    
    await setDoc(doc(db, 'tokenTransactions', transactionId), transactionDoc);
    console.log(`✅ Created test transaction: ${transactionId}`);
    
    console.log(`🎉 Test thank you sent successfully!`);
    console.log(`💡 Recipient should now see +1 ThankATech Point in dashboard`);
    
    return {
      success: true,
      message: `Test thank you sent! Transaction ID: ${transactionId}. Recipient should see +1 point.`
    };
    
  } catch (error) {
    console.error('❌ Test thank you failed:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export default sendTestThankYou;