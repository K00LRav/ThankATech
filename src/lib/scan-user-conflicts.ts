/**
 * SYSTEM-WIDE DUPLICATE SCANNER: Find all users with conflicts
 */

import { 
  collection, 
  getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export async function scanAllUserConflicts(): Promise<{success: boolean, conflicts: any[], message: string}> {
  if (!db) {
    return { success: false, conflicts: [], message: 'Firebase not configured' };
  }

  try {
    console.log('🔍 Scanning for duplicate/conflicting users...');
    
    // Get all users and technicians
    const usersRef = collection(db, 'users');
    const techRef = collection(db, 'technicians');
    
    const [usersSnapshot, techSnapshot] = await Promise.all([
      getDocs(usersRef),
      getDocs(techRef)
    ]);
    
    console.log(`👤 Found ${usersSnapshot.docs.length} user records`);
    console.log(`🔧 Found ${techSnapshot.docs.length} technician records`);
    
    // Create email maps
    const usersByEmail = new Map();
    const techsByEmail = new Map();
    
    // Process users collection
    usersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const email = data.email?.toLowerCase();
      if (email) {
        if (!usersByEmail.has(email)) {
          usersByEmail.set(email, []);
        }
        usersByEmail.get(email).push({
          id: doc.id,
          collection: 'users',
          data: data
        });
      }
    });
    
    // Process technicians collection
    techSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const email = data.email?.toLowerCase();
      if (email) {
        if (!techsByEmail.has(email)) {
          techsByEmail.set(email, []);
        }
        techsByEmail.get(email).push({
          id: doc.id,
          collection: 'technicians',
          data: data
        });
      }
    });
    
    const conflicts = [];
    const allEmails = new Set([...usersByEmail.keys(), ...techsByEmail.keys()]);
    
    console.log(`\n📊 Analyzing ${allEmails.size} unique email addresses...`);
    
    for (const email of allEmails) {
      const userRecords = usersByEmail.get(email) || [];
      const techRecords = techsByEmail.get(email) || [];
      const totalRecords = userRecords.length + techRecords.length;
      
      // Check for conflicts
      let hasConflict = false;
      let conflictReasons = [];
      
      // Multiple records in same collection
      if (userRecords.length > 1) {
        hasConflict = true;
        conflictReasons.push(`${userRecords.length} duplicate user records`);
      }
      
      if (techRecords.length > 1) {
        hasConflict = true;
        conflictReasons.push(`${techRecords.length} duplicate technician records`);
      }
      
      // Records in both collections
      if (userRecords.length > 0 && techRecords.length > 0) {
        hasConflict = true;
        conflictReasons.push(`exists in both users and technicians collections`);
        
        // Check for userType mismatches
        userRecords.forEach(record => {
          if (record.data.userType !== 'technician') {
            conflictReasons.push(`user record has userType: ${record.data.userType} but technician record exists`);
          }
        });
      }
      
      if (hasConflict || totalRecords > 1) {
        const conflict = {
          email,
          totalRecords,
          userRecords: userRecords.length,
          techRecords: techRecords.length,
          conflictReasons,
          records: [...userRecords, ...techRecords]
        };
        
        conflicts.push(conflict);
        
        console.log(`\n⚠️  CONFLICT: ${email}`);
        console.log(`   Total records: ${totalRecords} (${userRecords.length} users, ${techRecords.length} techs)`);
        console.log(`   Issues: ${conflictReasons.join(', ')}`);
        
        // Show record details
        [...userRecords, ...techRecords].forEach(record => {
          console.log(`   📄 ${record.collection}/${record.id}: ${record.data.name || 'No name'} | userType: ${record.data.userType || 'undefined'} | username: ${record.data.username || 'none'}`);
        });
      }
    }
    
    console.log(`\n📈 Scan Summary:`);
    console.log(`   Total emails: ${allEmails.size}`);
    console.log(`   Emails with conflicts: ${conflicts.length}`);
    console.log(`   Clean emails: ${allEmails.size - conflicts.length}`);
    
    return {
      success: true,
      conflicts,
      message: `Found ${conflicts.length} conflicting emails out of ${allEmails.size} total`
    };
    
  } catch (error) {
    console.error('❌ Scan failed:', error);
    return { 
      success: false, 
      conflicts: [],
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export default scanAllUserConflicts;