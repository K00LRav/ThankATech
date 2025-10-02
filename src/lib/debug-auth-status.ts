/**
 * AUTH DIAGNOSTIC: Check Firebase Auth vs Database records
 */

import { 
  collection, 
  getDocs, 
  query,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export async function debugAuthStatus(email: string): Promise<{success: boolean, message: string}> {
  if (!db) {
    return { success: false, message: 'Firebase not configured' };
  }

  try {
    console.log(`🔍 Checking auth status for: ${email}`);
    
    // Check database records
    const usersRef = collection(db, 'users');
    const techRef = collection(db, 'technicians');
    
    const usersQuery = query(usersRef, where('email', '==', email));
    const techQuery = query(techRef, where('email', '==', email));
    
    const [usersSnapshot, techSnapshot] = await Promise.all([
      getDocs(usersQuery),
      getDocs(techQuery)
    ]);
    
    console.log(`📊 Database Status:`);
    console.log(`   Users collection: ${usersSnapshot.docs.length} records`);
    console.log(`   Technicians collection: ${techSnapshot.docs.length} records`);
    
    if (usersSnapshot.docs.length === 0 && techSnapshot.docs.length === 0) {
      console.log(`❌ No database records found for ${email}`);
      return { 
        success: false, 
        message: `No database records found. User needs to be created in database first.` 
      };
    }
    
    // Show what records exist
    console.log(`\n📄 Database Records Found:`);
    
    usersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`👤 User: ${doc.id}`);
      console.log(`   Name: ${data.name || 'No name'}`);
      console.log(`   UserType: ${data.userType || 'undefined'}`);
      console.log(`   Created: ${data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString() : 'Unknown'}`);
    });
    
    techSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`🔧 Technician: ${doc.id}`);
      console.log(`   Name: ${data.name || 'No name'}`);
      console.log(`   Username: ${data.username || 'None'}`);
      console.log(`   Created: ${data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString() : 'Unknown'}`);
    });
    
    console.log(`\n💡 Authentication Options:`);
    console.log(`1. If this is a legacy user: Use "Forgot Password" to reset`);
    console.log(`2. If no Firebase Auth account exists: May need manual account creation`);
    console.log(`3. Try different email case (firebase is case-sensitive)`);
    console.log(`4. Check if user signed up with Google Sign-In instead of email/password`);
    
    return {
      success: true,
      message: `Found ${usersSnapshot.docs.length + techSnapshot.docs.length} database records. Check console for auth options.`
    };
    
  } catch (error) {
    console.error('❌ Auth debug failed:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export default debugAuthStatus;