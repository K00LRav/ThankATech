// Service for Firebase registered technicians only

import { getRegisteredTechnicians, getTopTechnicians } from './firebase';

// Default location for fallback
const DEFAULT_LOCATION = '40.7128,-74.0060'; // New York City coordinates

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - User latitude
 * @param {number} lon1 - User longitude  
 * @param {number} lat2 - Technician latitude
 * @param {number} lon2 - Technician longitude
 * @returns {number} Distance in miles
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRad(degrees) {
  return degrees * (Math.PI/180);
}

/**
 * Parse address to approximate coordinates (Atlanta area for sample data)
 */
function parseAddressToCoords(address) {
  // For sample data, return random Atlanta area coordinates
  const atlantaCoords = [
    { lat: 33.7490, lng: -84.3880 }, // Downtown Atlanta
    { lat: 33.8034, lng: -84.3963 }, // Midtown
    { lat: 33.7701, lng: -84.2920 }, // Decatur
    { lat: 33.8150, lng: -84.5120 }, // Marietta
    { lat: 33.6839, lng: -84.2641 }  // Stone Mountain
  ];
  
  // For sample data, assign random Atlanta area coordinates
  const randomCoord = atlantaCoords[Math.floor(Math.random() * atlantaCoords.length)];
  return randomCoord;
}

/**
 * Fetch registered technicians from Firebase with location-based sorting
 * @param {string} category - Service category filter
 * @param {object} location - User location {lat, lng}
 * @param {number} maxResults - Maximum number of results
 */
export async function fetchTechnicians(category = 'all', location = null, maxResults = 20) {
  try {
    console.log('Fetching registered technicians from Firebase...');
    let technicians = await getRegisteredTechnicians();
    
    // Filter by category if specified
    if (category !== 'all') {
      technicians = technicians.filter(tech => 
        tech.category === category || 
        tech.title?.toLowerCase().includes(category.toLowerCase())
      );
    }
    
    // If no registered technicians, show mock data with location processing
    if (technicians.length === 0) {
      console.log('No registered technicians found, using sample data');
      let mockTechs = getMockTechnicians();
      
      // Add coordinates and calculate distances for sample data
      mockTechs = mockTechs.map(tech => {
        const coords = parseAddressToCoords(tech.businessAddress);
        const techWithCoords = {
          ...tech,
          isSample: true,
          coordinates: coords,
          about: tech.about + ' (Sample profile - Real technicians can register to appear here!)'
        };
        
        // Calculate distance if user location is available
        if (location) {
          techWithCoords.distance = calculateDistance(
            location.lat, 
            location.lng, 
            coords.lat, 
            coords.lng
          );
          techWithCoords.isNearby = techWithCoords.distance <= 25; // Within 25 miles
        }
        
        return techWithCoords;
      });
      
      // Sort by distance if location is available
      if (location) {
        mockTechs.sort((a, b) => (a.distance || 999) - (b.distance || 999));
        console.log('Sorted technicians by distance from user location');
      }
      
      return mockTechs.slice(0, maxResults);
    }

    // Process registered technicians with location data
    let processedTechs = technicians.map(tech => {
      const techWithLocation = { ...tech };
      
      // Try to get coordinates from business address
      if (tech.businessAddress) {
        techWithLocation.coordinates = parseAddressToCoords(tech.businessAddress);
      }
      
      // Calculate distance if user location is available
      if (location && techWithLocation.coordinates) {
        techWithLocation.distance = calculateDistance(
          location.lat,
          location.lng,
          techWithLocation.coordinates.lat,
          techWithLocation.coordinates.lng
        );
        techWithLocation.isNearby = techWithLocation.distance <= 25; // Within 25 miles
      }
      
      return techWithLocation;
    });

    // Sort by distance if location is available
    if (location) {
      processedTechs.sort((a, b) => (a.distance || 999) - (b.distance || 999));
      console.log('Sorted registered technicians by distance from user location');
    }

    console.log(`Found ${processedTechs.length} registered technicians`);
    return processedTechs.slice(0, maxResults);

  } catch (error) {
    console.error('Error fetching technicians:', error);
    
    // Fallback to mock data with location processing
    console.log('Using fallback sample data due to error');
    let mockTechs = getMockTechnicians();
    
    // Add coordinates and calculate distances for sample data
    mockTechs = mockTechs.map(tech => {
      const coords = parseAddressToCoords(tech.businessAddress);
      const techWithCoords = {
        ...tech,
        isSample: true,
        coordinates: coords,
        about: tech.about + ' (Sample profile - Real technicians can register to appear here!)'
      };
      
      // Calculate distance if user location is available
      if (location) {
        techWithCoords.distance = calculateDistance(
          location.lat, 
          location.lng, 
          coords.lat, 
          coords.lng
        );
        techWithCoords.isNearby = techWithCoords.distance <= 25; // Within 25 miles
      }
      
      return techWithCoords;
    });
    
    // Sort by distance if location is available
    if (location) {
      mockTechs.sort((a, b) => (a.distance || 999) - (b.distance || 999));
    }
    
    return mockTechs.slice(0, maxResults);
  }
}

/**
 * Get mock technician data for demo purposes
 */
function getMockTechnicians() {
  return [
    {
      id: 'mock-jane-doe',
      name: "Jane Doe",
      title: "Master Auto Mechanic",
      image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&h=300&fit=crop&crop=face",
      points: 892,
      about: "With over 15 years of experience in automotive repair, I specialize in both foreign and domestic vehicles. ASE Master Certified with expertise in engine diagnostics, transmission repair, and hybrid vehicle systems. My passion is helping customers understand their vehicles and providing honest, reliable service.",
      phoneNumber: "(555) 123-4567",
      email: "jane.doe@example.com",
      website: "https://janesdoeautoshop.com",
      businessAddress: "1234 Main Street, Atlanta, GA 30309",
      businessName: "Jane's Auto Excellence",
      category: "automotive",
      specialties: "Engine Diagnostics, Transmission Repair, Hybrid Systems, European Imports",
      yearsExperience: 15,
      certifications: "ASE Master Certified, Hybrid Vehicle Specialist, BMW Certified",
      serviceArea: "Greater Atlanta Metro - 30 mile radius",
      hourlyRate: "$95-$150",
      availability: "Monday-Friday 8AM-6PM, Saturday 9AM-4PM, Emergency towing available",
      // System fields
      userType: "technician",
      createdAt: new Date('2023-06-15'),
      isActive: true,
      totalThankYous: 248,
      totalTips: 89
    },
    {
      id: 'mock-john-doe',
      name: "John Doe",
      title: "Licensed Electrician",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face",
      points: 1247,
      about: "Master Electrician with 20+ years serving residential and commercial clients throughout Atlanta. Specializing in smart home installations, electrical panel upgrades, and energy-efficient lighting solutions. Licensed, bonded, and insured with a 100% satisfaction guarantee.",
      phoneNumber: "(555) 987-6543",
      email: "john.doe@example.com",
      website: "https://johndoeelectric.com",
      businessAddress: "5678 Electric Avenue, Atlanta, GA 30318",
      businessName: "Doe Electric Solutions",
      category: "electrical",
      specialties: "Smart Home Systems, Panel Upgrades, Commercial Wiring, LED Lighting",
      yearsExperience: 22,
      certifications: "Master Electrician License, Smart Home Certified, OSHA 30-Hour",
      serviceArea: "Atlanta Metro Area - 35 mile radius",
      hourlyRate: "$85-$120",
      availability: "Monday-Saturday 7AM-7PM, 24/7 emergency service",
      // System fields
      userType: "technician",
      createdAt: new Date('2023-07-20'),
      isActive: true,
      totalThankYous: 312,
      totalTips: 127
    },
    {
      id: 'mock-mike-smith',
      name: "Mike Smith",
      title: "Master Plumber",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face",
      points: 756,
      about: "Third-generation master plumber serving Atlanta families for over 18 years. Expert in everything from simple repairs to complete bathroom renovations. Known for clean work, fair pricing, and standing behind every job with comprehensive warranties.",
      phoneNumber: "(555) 456-7890",
      email: "mike.smith@example.com",
      website: "https://smithplumbingpro.com",
      businessAddress: "9012 Water Works Way, Atlanta, GA 30328",
      businessName: "Smith Master Plumbing",
      category: "plumbing",
      specialties: "Bathroom Remodels, Water Heater Installation, Drain Cleaning, Pipe Repair",
      yearsExperience: 18,
      certifications: "Master Plumber License, Backflow Prevention Certified, Green Plumber Certified",
      serviceArea: "Greater Atlanta Area - 40 mile radius",
      hourlyRate: "$90-$130",
      availability: "Monday-Friday 7AM-6PM, Weekend emergency calls, 24/7 emergency service",
      // System fields
      userType: "technician",
      createdAt: new Date('2023-08-10'),
      isActive: true,
      totalThankYous: 125,
      totalTips: 55
    }
  ];
}

/**
 * Get user's location (with permission)
 */
export function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        resolve(`${latitude},${longitude}`);
      },
      (error) => {
        console.warn('Location access denied, using default location');
        resolve(DEFAULT_LOCATION);
      }
    );
  });
}