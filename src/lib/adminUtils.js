// Admin utilities for managing usernames
// Only available in development environment
import { addUsernameToTechnician } from './firebase.js';

// Check if we're in development
const isDevelopment = process.env.NODE_ENV === 'development';

// Development utility to add usernames to existing technicians
export async function setTechnicianUsername(technicianId, username) {
  if (!isDevelopment) {
    throw new Error('Admin utilities are only available in development environment');
  }
  
  try {
    const result = await addUsernameToTechnician(technicianId, username);
    console.log('✅ Username set successfully:', result);
    return result;
  } catch (error) {
    console.error('❌ Failed to set username:', error.message);
    throw error;
  }
}

// Helper to find technician ID by name
export async function findTechnicianIdByName(name) {
  if (!isDevelopment) {
    throw new Error('Admin utilities are only available in development environment');
  }
  
  const { db } = await import('./firebase.js');
  const { collection, query, where, getDocs } = await import('firebase/firestore');
  
  try {
    const techRef = collection(db, 'technicians');
    const q = query(techRef, where('name', '==', name));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const techs = [];
      querySnapshot.forEach((doc) => {
        techs.push({ id: doc.id, ...doc.data() });
      });
      // Found technicians by name
      return techs;
    } else {
      console.log(`No technicians found with name "${name}"`);
      return [];
    }
  } catch (error) {
    console.error('Error finding technician:', error);
    throw error;
  }
}

// Bulk username generation for all existing technicians
export async function generateUsernamesForAllTechnicians() {
  const { db } = await import('./firebase.js');
  const { collection, getDocs, doc, updateDoc } = await import('firebase/firestore');
  const { isUsernameTaken, validateUsername, generateUsernameSuggestions } = await import('./firebase.js');
  
  try {
    console.log('🚀 Starting bulk username generation...');
    
    // Get all technicians
    const techniciansRef = collection(db, 'technicians');
    const querySnapshot = await getDocs(techniciansRef);
    
    const technicians = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      technicians.push({
        id: doc.id,
        name: data.name,
        username: data.username
      });
    });
    
    console.log(`📊 Found ${technicians.length} technicians`);
    
    // Filter technicians without usernames
    const techniciansWithoutUsernames = technicians.filter(tech => !tech.username);
    console.log(`🔧 ${techniciansWithoutUsernames.length} technicians need usernames`);
    
    if (techniciansWithoutUsernames.length === 0) {
      console.log('✅ All technicians already have usernames!');
      return { success: true, updated: 0, message: 'All technicians already have usernames' };
    }
    
    const results = [];
    
    for (const technician of techniciansWithoutUsernames) {
      try {
        console.log(`👤 Processing: ${technician.name}`);
        
        // Generate username from name
        const cleanName = technician.name.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .trim();
        
        const parts = cleanName.split(/\s+/);
        let baseUsername = parts.length > 1 ? parts[0] + parts[parts.length - 1] : parts[0];
        
        // Find available username
        let finalUsername = baseUsername;
        let counter = 1;
        
        while (await isUsernameTaken(finalUsername)) {
          finalUsername = baseUsername + counter;
          counter++;
          if (counter > 99) break; // Safety limit
        }
        
        // Validate final username
        const validation = validateUsername(finalUsername);
        if (!validation.isValid) {
          // Generate suggestions if validation fails
          const suggestions = await generateUsernameSuggestions(baseUsername);
          finalUsername = suggestions[0];
        }
        
        // Update technician
        const technicianRef = doc(db, 'technicians', technician.id);
        await updateDoc(technicianRef, {
          username: finalUsername
        });
        
        // Username assigned successfully
        results.push({ name: technician.name, username: finalUsername, status: 'success' });
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.error(`❌ Failed to set username for ${technician.name}:`, error);
        results.push({ name: technician.name, status: 'error', error: error.message });
      }
    }
    
    const successful = results.filter(r => r.status === 'success');
    console.log(`\n🎉 Complete! Generated ${successful.length} usernames.`);
    
    return { success: true, updated: successful.length, results };
    
  } catch (error) {
    console.error('💥 Bulk username generation failed:', error);
    throw error;
  }
}

// Make it available globally for development
if (typeof window !== 'undefined') {
  window.setTechnicianUsername = setTechnicianUsername;
  window.findTechnicianIdByName = findTechnicianIdByName;
  window.generateUsernamesForAllTechnicians = generateUsernamesForAllTechnicians;
  // Admin utilities loaded silently for security
}