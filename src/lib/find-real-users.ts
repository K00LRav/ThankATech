/**
 * USER FINDER: Find actual users and their access methods
 * 
 * This helps identify real users and how to access their dashboards
 */

import { 
  collection, 
  getDocs, 
  query,
  limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export async function findRealUsers(): Promise<void> {
  if (!db) {
    console.error('❌ Firebase not configured');
    return;
  }

  try {
    console.log('🔍 Finding real users in the system...');
    
    // Check technicians collection
    const techniciansRef = collection(db, 'technicians');
    const techQuery = query(techniciansRef, limit(10));
    const techSnapshot = await getDocs(techQuery);
    
    console.log(`\n👷 Found ${techSnapshot.docs.length} technicians:`);
    
    techSnapshot.docs.forEach((docSnap, index) => {
      const data = docSnap.data();
      console.log(`\n👤 Technician ${index + 1}:`);
      console.log(`   ID: ${docSnap.id}`);
      console.log(`   Name: ${data.name}`);
      console.log(`   Email: ${data.email}`);
      console.log(`   Username: ${data.username || 'None'}`);
      console.log(`   Points: ${data.points || 0}`);
      
      // Show dashboard URL
      if (data.username) {
        console.log(`   🌐 Dashboard URL: /dashboard (login as ${data.email})`);
        console.log(`   🌐 Public Profile: /${data.username}`);
      } else {
        console.log(`   🌐 Dashboard URL: /dashboard (login as ${data.email})`);
      }
    });
    
    // Check users/customers collection
    const usersRef = collection(db, 'users');
    const usersQuery = query(usersRef, limit(10));
    const usersSnapshot = await getDocs(usersQuery);
    
    console.log(`\n👥 Found ${usersSnapshot.docs.length} customers/users:`);
    
    usersSnapshot.docs.forEach((docSnap, index) => {
      const data = docSnap.data();
      console.log(`\n👤 User ${index + 1}:`);
      console.log(`   ID: ${docSnap.id}`);
      console.log(`   Name: ${data.name || data.displayName}`);
      console.log(`   Email: ${data.email}`);
      console.log(`   Username: ${data.username || 'None'}`);
      
      if (data.email) {
        console.log(`   🌐 Dashboard URL: /dashboard (login as ${data.email})`);
      }
    });
    
    // Also check which users have the most transactions
    console.log(`\n🔍 Checking transaction activity...`);
    
    const transactionsRef = collection(db, 'tokenTransactions');
    const transSnapshot = await getDocs(transactionsRef);
    
    const userActivity: { [key: string]: number } = {};
    const techActivity: { [key: string]: number } = {};
    
    transSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.fromUserId) {
        userActivity[data.fromUserId] = (userActivity[data.fromUserId] || 0) + 1;
      }
      if (data.toTechnicianId) {
        techActivity[data.toTechnicianId] = (techActivity[data.toTechnicianId] || 0) + 1;
      }
    });
    
    console.log('\n📊 Most active users (senders):');
    Object.entries(userActivity)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([userId, count]) => {
        console.log(`   ${userId}: ${count} transactions sent`);
      });
      
    console.log('\n📊 Most active technicians (receivers):');
    Object.entries(techActivity)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([techId, count]) => {
        console.log(`   ${techId}: ${count} transactions received`);
      });
    
  } catch (error) {
    console.error('❌ User finder failed:', error);
  }
}

export default findRealUsers;