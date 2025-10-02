/**
 * CREATE ADMIN USER: Add admin account to database for testing
 */

import { 
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export async function createAdminUser(email: string, userId: string): Promise<{success: boolean, message: string}> {
  if (!db) {
    return { success: false, message: 'Firebase not configured' };
  }

  try {
    console.log(`🔧 Creating admin user in database: ${email}`);
    console.log(`   Using user ID: ${userId}`);
    
    // Create user record in users collection
    const userDoc = {
      email: email,
      name: 'Admin User',
      displayName: 'Admin',
      userType: 'technician', // Set as technician so dashboard uses technician queries
      isAdmin: true,
      points: 0,
      totalPointsEarned: 0,
      totalPointsSpent: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(doc(db, 'users', userId), userDoc);
    console.log(`✅ Created user record: users/${userId}`);
    
    // Also create technician record for consistency
    const techDoc = {
      email: email,
      name: 'Admin User',
      businessName: 'ThankATech Admin',
      category: 'Admin',
      username: 'admin-user',
      points: 0,
      totalTips: 0,
      isAdmin: true,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(doc(db, 'technicians', userId), techDoc);
    console.log(`✅ Created technician record: technicians/${userId}`);
    
    console.log(`🎉 Admin user created successfully!`);
    console.log(`💡 You can now login and use the dashboard`);
    
    return {
      success: true,
      message: `Admin user created with ID: ${userId}. Dashboard should now work!`
    };
    
  } catch (error) {
    console.error('❌ Admin user creation failed:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export default createAdminUser;