/**
 * Script to fix existing tips that show as "Anonymous"
 * This will look up customer information and update the tip records
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

// Firebase config (copy from your .env.local)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixAnonymousTips() {
  console.log('🔧 Starting to fix anonymous tips...');
  
  try {
    // Get all tips
    const tipsRef = collection(db, 'tips');
    const tipsSnapshot = await getDocs(tipsRef);
    
    let fixedCount = 0;
    let totalTips = 0;
    
    for (const tipDoc of tipsSnapshot.docs) {
      const tip = tipDoc.data();
      totalTips++;
      
      console.log(`Processing tip ${tipDoc.id}:`, {
        hasCustomerName: !!tip.customerName,
        hasCustomerEmail: !!tip.customerEmail,
        hasCustomerId: !!tip.customerId,
        currentCustomerName: tip.customerName
      });
      
      // Skip if already has customer name
      if (tip.customerName && tip.customerName !== 'Anonymous' && tip.customerName !== 'Anonymous Tipper') {
        console.log(`✅ Tip ${tipDoc.id} already has customer name: ${tip.customerName}`);
        continue;
      }
      
      let customerName = null;
      let customerEmail = tip.customerEmail;
      
      // Try to find customer information
      if (tip.customerId) {
        try {
          // Look in users collection first
          const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', tip.customerId)));
          if (!userDoc.empty) {
            const userData = userDoc.docs[0].data();
            customerName = userData.name || userData.displayName;
            customerEmail = customerEmail || userData.email;
          } else {
            // Look in technicians collection
            const techDoc = await getDocs(query(collection(db, 'technicians'), where('uid', '==', tip.customerId)));
            if (!techDoc.empty) {
              const techData = techDoc.docs[0].data();
              customerName = techData.name || techData.displayName;
              customerEmail = customerEmail || techData.email;
            }
          }
        } catch (error) {
          console.warn(`Could not find customer data for ${tip.customerId}:`, error.message);
        }
      }
      
      // If still no name, try using email prefix
      if (!customerName && customerEmail) {
        customerName = customerEmail.split('@')[0];
        console.log(`Using email prefix as name: ${customerName}`);
      }
      
      // Update the tip if we found a name
      if (customerName) {
        try {
          await updateDoc(doc(db, 'tips', tipDoc.id), {
            customerName: customerName,
            customerEmail: customerEmail || tip.customerEmail
          });
          
          fixedCount++;
          console.log(`✅ Updated tip ${tipDoc.id} with customer name: ${customerName}`);
        } catch (error) {
          console.error(`❌ Failed to update tip ${tipDoc.id}:`, error);
        }
      } else {
        console.log(`⚠️ Could not determine customer name for tip ${tipDoc.id}`);
      }
    }
    
    console.log(`🎉 Migration complete! Fixed ${fixedCount} out of ${totalTips} tips.`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
fixAnonymousTips();