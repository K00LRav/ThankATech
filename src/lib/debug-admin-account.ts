/**
 * ADMIN ACCOUNT DIAGNOSTIC: Check admin account setup
 */

import { 
  collection, 
  getDocs, 
  query,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export async function debugAdminAccount(adminEmail: string): Promise<void> {
  if (!db) {
    console.error('❌ Firebase not configured');
    return;
  }

  try {
    console.log(`🔍 Diagnosing admin account: ${adminEmail}`);
    
    // Check users collection
    const usersRef = collection(db, 'users');
    const usersQuery = query(usersRef, where('email', '==', adminEmail));
    const usersSnapshot = await getDocs(usersQuery);
    
    console.log(`👤 Users collection: Found ${usersSnapshot.docs.length} records`);
    usersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`   User ID: ${doc.id}`);
      console.log(`   Name: ${data.name || data.displayName}`);
      console.log(`   Email: ${data.email}`);
      console.log(`   User Type: ${data.userType}`);
      console.log(`   Points: ${data.points || 0}`);
    });
    
    // Check technicians collection
    const techRef = collection(db, 'technicians');
    const techQuery = query(techRef, where('email', '==', adminEmail));
    const techSnapshot = await getDocs(techQuery);
    
    console.log(`\n🔧 Technicians collection: Found ${techSnapshot.docs.length} records`);
    techSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`   Technician ID: ${doc.id}`);
      console.log(`   Name: ${data.name}`);
      console.log(`   Email: ${data.email}`);
      console.log(`   Username: ${data.username}`);
      console.log(`   Points: ${data.points || 0}`);
    });
    
    // Check transactions where admin is involved
    const transRef = collection(db, 'tokenTransactions');
    const allTransSnapshot = await getDocs(transRef);
    
    let adminSentCount = 0;
    let adminReceivedCount = 0;
    
    // Collect all user IDs found
    const userIds = new Set();
    usersSnapshot.docs.forEach(doc => userIds.add(doc.id));
    techSnapshot.docs.forEach(doc => userIds.add(doc.id));
    
    console.log(`\n🔍 Checking ${allTransSnapshot.docs.length} transactions for admin involvement...`);
    
    allTransSnapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Check if admin sent this transaction (any of admin's user IDs)
      if (userIds.has(data.fromUserId)) {
        adminSentCount++;
        console.log(`📤 Admin sent: ${doc.id} (${data.type})`);
      }
      
      // Check if admin received this transaction (any of admin's user IDs)  
      if (userIds.has(data.toTechnicianId)) {
        adminReceivedCount++;
        console.log(`📨 Admin received: ${doc.id} (${data.type})`);
      }
    });
    
    console.log(`\n📊 Admin Transaction Summary:`);
    console.log(`   Transactions sent: ${adminSentCount}`);
    console.log(`   Transactions received: ${adminReceivedCount}`);
    console.log(`   Total user IDs for admin: ${userIds.size}`);
    console.log(`   Admin user IDs:`, Array.from(userIds));
    
  } catch (error) {
    console.error('❌ Admin diagnostic failed:', error);
  }
}

export default debugAdminAccount;