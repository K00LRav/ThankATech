// Script to automatically add usernames to existing technicians
// Run this script to generate usernames based on first and last names

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { isUsernameTaken, validateUsername, generateUsernameSuggestions } from '../lib/firebase.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Function to generate username from full name
function generateUsernameFromName(fullName) {
  if (!fullName) return null;
  
  // Clean and split the name
  const cleanName = fullName.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .trim();
  
  const parts = cleanName.split(/\s+/);
  
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  
  // Try different combinations
  const firstLast = parts[0] + parts[parts.length - 1]; // first + last
  const firstLastInitial = parts[0] + parts[parts.length - 1].charAt(0); // first + last initial
  const firstInitialLast = parts[0].charAt(0) + parts[parts.length - 1]; // first initial + last
  
  return [firstLast, firstLastInitial, firstInitialLast];
}

// Function to find an available username
async function findAvailableUsername(baseUsernames) {
  if (!Array.isArray(baseUsernames)) {
    baseUsernames = [baseUsernames];
  }
  
  // Try each base username
  for (const base of baseUsernames) {
    if (!base) continue;
    
    // Validate format
    const validation = validateUsername(base);
    if (validation.isValid) {
      // Check if available
      const isTaken = await isUsernameTaken(base);
      if (!isTaken) {
        return base;
      }
    }
    
    // Try with numbers if base is taken
    for (let i = 1; i <= 99; i++) {
      const numbered = base + i;
      const numberedValidation = validateUsername(numbered);
      if (numberedValidation.isValid) {
        const isNumberedTaken = await isUsernameTaken(numbered);
        if (!isNumberedTaken) {
          return numbered;
        }
      }
    }
  }
  
  // If all combinations are taken, generate suggestions
  const suggestions = await generateUsernameSuggestions(baseUsernames[0] || 'user');
  return suggestions[0]; // Return first suggestion
}

// Main function to process all technicians
async function addUsernamesToAllTechnicians() {
  try {
    console.log('🚀 Starting username generation for existing technicians...');
    
    // Get all technicians
    const techniciansRef = collection(db, 'technicians');
    const querySnapshot = await getDocs(techniciansRef);
    
    const technicians = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      technicians.push({
        id: doc.id,
        name: data.name,
        username: data.username,
        businessName: data.businessName
      });
    });
    
    console.log(`📊 Found ${technicians.length} technicians`);
    
    // Filter technicians without usernames
    const techniciansWithoutUsernames = technicians.filter(tech => !tech.username);
    console.log(`🔧 ${techniciansWithoutUsernames.length} technicians need usernames`);
    
    if (techniciansWithoutUsernames.length === 0) {
      console.log('✅ All technicians already have usernames!');
      return;
    }
    
    // Process each technician
    const results = [];
    for (const technician of techniciansWithoutUsernames) {
      try {
        console.log(`\n👤 Processing: ${technician.name} (ID: ${technician.id})`);
        
        // Generate potential usernames
        const potentialUsernames = generateUsernameFromName(technician.name);
        
        if (!potentialUsernames) {
          console.log(`❌ Could not generate username for ${technician.name}`);
          continue;
        }
        
        // Find available username
        const availableUsername = await findAvailableUsername(potentialUsernames);
        
        if (availableUsername) {
          // Update the technician document
          const technicianRef = doc(db, 'technicians', technician.id);
          await updateDoc(technicianRef, {
            username: availableUsername
          });
          
          console.log(`✅ Set username "${availableUsername}" for ${technician.name}`);
          results.push({
            id: technician.id,
            name: technician.name,
            username: availableUsername,
            status: 'success'
          });
        } else {
          console.log(`❌ Could not find available username for ${technician.name}`);
          results.push({
            id: technician.id,
            name: technician.name,
            username: null,
            status: 'failed'
          });
        }
        
        // Small delay to avoid hitting rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Error processing ${technician.name}:`, error);
        results.push({
          id: technician.id,
          name: technician.name,
          username: null,
          status: 'error',
          error: error.message
        });
      }
    }
    
    // Summary
    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status !== 'success');
    
    console.log('\n📋 SUMMARY:');
    console.log(`✅ Successfully set usernames: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    
    if (successful.length > 0) {
      console.log('\n✅ Successful updates:');
      successful.forEach(result => {
        console.log(`  - ${result.name} → ${result.username}`);
      });
    }
    
    if (failed.length > 0) {
      console.log('\n❌ Failed updates:');
      failed.forEach(result => {
        console.log(`  - ${result.name}: ${result.error || 'Unknown error'}`);
      });
    }
    
    console.log('\n🎉 Username generation complete!');
    return results;
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    throw error;
  }
}

// Export for use in browser or Node.js
export { addUsernamesToAllTechnicians };

// Make available globally if in browser
if (typeof window !== 'undefined') {
  window.addUsernamesToAllTechnicians = addUsernamesToAllTechnicians;
  console.log('🔧 Username generation script loaded!');
  console.log('📋 Run addUsernamesToAllTechnicians() to generate usernames for all existing technicians');
}

// Auto-run if this is the main module
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].includes('addUsernamesToExistingTechnicians')) {
  addUsernamesToAllTechnicians()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}