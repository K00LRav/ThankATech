/**
 * FIX USER TYPE CONFLICTS: Clean up duplicate/conflicting user records
 */

import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc,
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export async function fixUserTypeConflicts(email: string): Promise<{success: boolean, message: string}> {
  if (!db) {
    return { success: false, message: 'Firebase not configured' };
  }

  try {
    console.log(`🔧 Fixing user type conflicts for: ${email}`);
    
    // Find all records for this email
    const usersRef = collection(db, 'users');
    const techRef = collection(db, 'technicians');
    
    const usersQuery = query(usersRef, where('email', '==', email));
    const techQuery = query(techRef, where('email', '==', email));
    
    const [usersSnapshot, techSnapshot] = await Promise.all([
      getDocs(usersQuery),
      getDocs(techQuery)
    ]);
    
    console.log(`👤 Found ${usersSnapshot.docs.length} user records`);
    console.log(`🔧 Found ${techSnapshot.docs.length} technician records`);
    
    // Analyze the records
    const userRecords = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      collection: 'users',
      data: doc.data()
    }));
    
    const techRecords = techSnapshot.docs.map(doc => ({
      id: doc.id,
      collection: 'technicians', 
      data: doc.data()
    }));
    
    // Log all records found
    userRecords.forEach(record => {
      console.log(`👤 User record ${record.id}:`, {
        userType: record.data.userType,
        name: record.data.name,
        username: record.data.username,
        points: record.data.points
      });
    });
    
    techRecords.forEach(record => {
      console.log(`🔧 Tech record ${record.id}:`, {
        name: record.data.name,
        username: record.data.username,
        points: record.data.points
      });
    });
    
    // Strategy: If there's a technician record, prioritize it and fix user records
    if (techRecords.length > 0) {
      const primaryTech = techRecords[0]; // Use first technician record
      console.log(`✅ Using technician record ${primaryTech.id} as primary`);
      
      // Fix any user records to have correct userType
      for (const userRecord of userRecords) {
        if (userRecord.data.userType !== 'technician') {
          console.log(`🔧 Updating user record ${userRecord.id} to userType: technician`);
          await updateDoc(doc(db, 'users', userRecord.id), {
            userType: 'technician'
          });
        }
      }
      
      // Remove duplicate technician records (keep only the first one)
      for (let i = 1; i < techRecords.length; i++) {
        console.log(`🗑️  Removing duplicate technician record ${techRecords[i].id}`);
        await deleteDoc(doc(db, 'technicians', techRecords[i].id));
      }
      
      return {
        success: true,
        message: `Fixed ${email}: Set as technician (ID: ${primaryTech.id}), updated ${userRecords.length} user records, removed ${techRecords.length - 1} duplicate tech records`
      };
    }
    
    // If no technician records but user records exist
    if (userRecords.length > 0) {
      const primaryUser = userRecords[0];
      console.log(`👤 No technician records found, using user record ${primaryUser.id}`);
      
      // Remove duplicate user records
      for (let i = 1; i < userRecords.length; i++) {
        console.log(`🗑️  Removing duplicate user record ${userRecords[i].id}`);
        await deleteDoc(doc(db, 'users', userRecords[i].id));
      }
      
      return {
        success: true,
        message: `Cleaned up ${email}: Kept user record (ID: ${primaryUser.id}), removed ${userRecords.length - 1} duplicates`
      };
    }
    
    return {
      success: false,
      message: `No records found for ${email}`
    };
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export default fixUserTypeConflicts;