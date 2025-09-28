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
    console.log('🔍 DEBUG: Received technicians from getRegisteredTechnicians:', technicians.length);
    console.log('🔍 DEBUG: First technician data:', technicians[0]);
    
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

    // Always include mock data alongside registered technicians for demonstration
    console.log(`Found ${technicians.length} registered technicians, adding sample data for demo`);
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

    // Combine registered and mock technicians
    let allTechs = [...processedTechs, ...mockTechs];

    // Filter by category if specified
    if (category !== 'all') {
      allTechs = allTechs.filter(tech => 
        tech.category === category || 
        tech.title?.toLowerCase().includes(category.toLowerCase())
      );
    }

    // Sort by distance if location is available
    if (location) {
      allTechs.sort((a, b) => (a.distance || 999) - (b.distance || 999));
      console.log('Sorted all technicians by distance from user location');
    }

    console.log(`Returning ${allTechs.length} total technicians (${processedTechs.length} registered + ${mockTechs.length} sample)`);
    return allTechs.slice(0, maxResults)

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
    },
    {
      id: 'mock-sarah-chen',
      name: "Sarah Chen",
      title: "HVAC Specialist",
      image: "https://images.unsplash.com/photo-1494790108755-2616b332e234?w=300&h=300&fit=crop&crop=face",
      points: 934,
      about: "EPA-certified HVAC technician with 12 years of experience in residential and commercial climate control systems. Expert in energy-efficient installations, smart thermostats, and eco-friendly refrigerants. Committed to keeping your family comfortable year-round.",
      phoneNumber: "(555) 234-5678",
      email: "sarah.chen@example.com",
      website: "https://chenheatingcooling.com",
      businessAddress: "456 Climate Drive, Atlanta, GA 30312",
      businessName: "Chen Heating & Cooling",
      category: "hvac",
      specialties: "Energy Efficiency, Smart Thermostats, Commercial Systems, Heat Pumps",
      yearsExperience: 12,
      certifications: "EPA Universal Certification, NATE Certified, Energy Star Partner",
      serviceArea: "Atlanta Metro - 25 mile radius",
      hourlyRate: "$80-$110",
      availability: "Monday-Friday 7AM-6PM, Emergency service available",
      userType: "technician",
      createdAt: new Date('2023-05-12'),
      isActive: true,
      totalThankYous: 186,
      totalTips: 67
    },
    {
      id: 'mock-carlos-rodriguez',
      name: "Carlos Rodriguez",
      title: "Computer Repair Specialist",
      image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&h=300&fit=crop&crop=face",
      points: 1156,
      about: "CompTIA A+ certified computer technician specializing in both hardware and software solutions. From virus removal to custom PC builds, I provide fast, reliable tech support for homes and small businesses. Over 10 years keeping Atlanta connected.",
      phoneNumber: "(555) 345-6789",
      email: "carlos.rodriguez@example.com",
      website: "https://carlostech.net",
      businessAddress: "789 Tech Plaza, Atlanta, GA 30315",
      businessName: "Rodriguez Tech Solutions",
      category: "computer",
      specialties: "PC Repair, Data Recovery, Network Setup, Custom Builds",
      yearsExperience: 10,
      certifications: "CompTIA A+, Network+, Security+, Microsoft Certified",
      serviceArea: "Atlanta Metro Area - 30 mile radius",
      hourlyRate: "$70-$95",
      availability: "Monday-Saturday 9AM-7PM, Remote support available",
      userType: "technician",
      createdAt: new Date('2023-04-08'),
      isActive: true,
      totalThankYous: 298,
      totalTips: 112
    },
    {
      id: 'mock-lisa-johnson',
      name: "Lisa Johnson",
      title: "Appliance Repair Expert",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=face",
      points: 823,
      about: "Factory-trained appliance repair specialist with expertise in all major brands. From refrigerators to washing machines, I diagnose and fix problems quickly to minimize disruption to your daily routine. Same-day service available for most repairs.",
      phoneNumber: "(555) 456-7890",
      email: "lisa.johnson@example.com",
      website: "https://johnsonappliances.com",
      businessAddress: "321 Appliance Way, Atlanta, GA 30320",
      businessName: "Johnson Appliance Repair",
      category: "appliance",
      specialties: "Major Appliances, Warranty Service, Parts Replacement, Diagnostics",
      yearsExperience: 14,
      certifications: "Factory Certified (GE, Whirlpool, Samsung), EPA Section 608",
      serviceArea: "Greater Atlanta - 35 mile radius",
      hourlyRate: "$75-$105",
      availability: "Monday-Friday 8AM-5PM, Saturday 9AM-3PM",
      userType: "technician",
      createdAt: new Date('2023-03-15'),
      isActive: true,
      totalThankYous: 157,
      totalTips: 78
    },
    {
      id: 'mock-david-kim',
      name: "David Kim",
      title: "Certified Locksmith",
      image: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&h=300&fit=crop&crop=face",
      points: 687,
      about: "Licensed and bonded locksmith providing 24/7 emergency services throughout Atlanta. Specializing in residential and commercial lock systems, access control, and security upgrades. Fast response time with upfront pricing and no hidden fees.",
      phoneNumber: "(555) 567-8901",
      email: "david.kim@example.com",
      website: "https://kimsecurityservices.com",
      businessAddress: "654 Security Blvd, Atlanta, GA 30325",
      businessName: "Kim Security Services",
      category: "locksmith",
      specialties: "Emergency Lockouts, Security Systems, Key Duplication, Safe Services",
      yearsExperience: 8,
      certifications: "ALOA Certified, Bonded & Insured, Background Checked",
      serviceArea: "Atlanta Metro - 40 mile radius",
      hourlyRate: "$65-$95",
      availability: "24/7 Emergency Service, Regular hours 8AM-6PM",
      userType: "technician",
      createdAt: new Date('2023-09-22'),
      isActive: true,
      totalThankYous: 94,
      totalTips: 43
    },
    {
      id: 'mock-maria-gonzalez',
      name: "Maria Gonzalez",
      title: "General Contractor",
      image: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=300&h=300&fit=crop&crop=face",
      points: 1423,
      about: "Licensed general contractor with 16 years of experience in residential construction and remodeling. From kitchen renovations to home additions, I manage every aspect of your project with attention to detail and commitment to quality craftsmanship.",
      phoneNumber: "(555) 678-9012",
      email: "maria.gonzalez@example.com",
      website: "https://gonzalezbuilders.com",
      businessAddress: "987 Builder Lane, Atlanta, GA 30327",
      businessName: "Gonzalez Construction",
      category: "contractor",
      specialties: "Home Remodeling, Kitchen & Bath, Additions, Project Management",
      yearsExperience: 16,
      certifications: "Licensed General Contractor, Bonded & Insured, OSHA Certified",
      serviceArea: "Atlanta Metro Area - 50 mile radius",
      hourlyRate: "$85-$125",
      availability: "Monday-Friday 7AM-5PM, Project consultations weekends",
      userType: "technician",
      createdAt: new Date('2023-02-28'),
      isActive: true,
      totalThankYous: 267,
      totalTips: 145
    },
    {
      id: 'mock-robert-wilson',
      name: "Robert Wilson",
      title: "Professional Handyman",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face",
      points: 756,
      about: "Your go-to handyman for all those projects around the house. With 20+ years of experience, I handle everything from minor repairs to major improvements. Reliable, affordable, and always ready to tackle your honey-do list with a smile.",
      phoneNumber: "(555) 789-0123",
      email: "robert.wilson@example.com",
      website: "https://wilsonhandymanservices.com",
      businessAddress: "147 Fix-It Street, Atlanta, GA 30330",
      businessName: "Wilson Handyman Services",
      category: "handyman",
      specialties: "Home Repairs, Furniture Assembly, Painting, Minor Electrical",
      yearsExperience: 21,
      certifications: "Insured, Background Checked, HomeAdvisor Screened",
      serviceArea: "Atlanta Area - 25 mile radius",
      hourlyRate: "$55-$80",
      availability: "Monday-Saturday 8AM-6PM, Flexible scheduling",
      userType: "technician",
      createdAt: new Date('2023-01-10'),
      isActive: true,
      totalThankYous: 178,
      totalTips: 92
    },
    {
      id: 'mock-jennifer-lee',
      name: "Jennifer Lee",
      title: "Roofing Contractor",
      image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=300&fit=crop&crop=face",
      points: 1089,
      about: "Licensed roofing contractor specializing in residential and commercial roofing systems. From leak repairs to full roof replacements, I use quality materials and proven techniques to protect your most important investment. Free estimates and warranty on all work.",
      phoneNumber: "(555) 890-1234",
      email: "jennifer.lee@example.com",
      website: "https://leeroofingatl.com",
      businessAddress: "258 Rooftop Drive, Atlanta, GA 30333",
      businessName: "Lee Roofing Atlanta",
      category: "roofing",
      specialties: "Roof Replacement, Leak Repair, Gutters, Storm Damage",
      yearsExperience: 13,
      certifications: "Licensed Roofing Contractor, GAF Master Elite, Insured",
      serviceArea: "Greater Atlanta Metro - 45 mile radius",
      hourlyRate: "$75-$110",
      availability: "Monday-Friday 7AM-5PM, Emergency repairs 24/7",
      userType: "technician",
      createdAt: new Date('2023-06-30'),
      isActive: true,
      totalThankYous: 201,
      totalTips: 98
    },
    {
      id: 'mock-thomas-brown',
      name: "Thomas Brown",
      title: "Landscape Designer",
      image: "https://images.unsplash.com/photo-1566492031773-4f4e44671d66?w=300&h=300&fit=crop&crop=face",
      points: 624,
      about: "Professional landscape designer and maintenance specialist creating beautiful outdoor spaces for over 9 years. From garden design to irrigation systems, I help homeowners transform their yards into stunning landscapes that increase property value and enjoyment.",
      phoneNumber: "(555) 901-2345",
      email: "thomas.brown@example.com",
      website: "https://brownlandscapes.com",
      businessAddress: "369 Garden Path, Atlanta, GA 30336",
      businessName: "Brown Landscapes",
      category: "landscaping",
      specialties: "Garden Design, Irrigation, Tree Service, Lawn Care",
      yearsExperience: 9,
      certifications: "Certified Landscape Professional, Pesticide License, Insured",
      serviceArea: "Atlanta Metro - 30 mile radius",
      hourlyRate: "$60-$85",
      availability: "Monday-Saturday 7AM-6PM, Seasonal adjustments",
      userType: "technician",
      createdAt: new Date('2023-05-18'),
      isActive: true,
      totalThankYous: 112,
      totalTips: 56
    },
    {
      id: 'mock-amanda-davis',
      name: "Amanda Davis",
      title: "Professional House Cleaner",
      image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=300&h=300&fit=crop&crop=face",
      points: 567,
      about: "Professional cleaning service specializing in residential deep cleaning and maintenance. Using eco-friendly products and proven techniques, I help busy families maintain a clean, healthy home environment. Flexible scheduling and competitive rates.",
      phoneNumber: "(555) 012-3456",
      email: "amanda.davis@example.com",
      website: "https://daviscleaningservices.com",
      businessAddress: "741 Clean Street, Atlanta, GA 30339",
      businessName: "Davis Cleaning Services",
      category: "cleaning",
      specialties: "Deep Cleaning, Move-in/out, Eco-friendly Products, Regular Service",
      yearsExperience: 7,
      certifications: "Bonded & Insured, Background Checked, Green Cleaning Certified",
      serviceArea: "Atlanta Area - 20 mile radius",
      hourlyRate: "$35-$55",
      availability: "Monday-Friday 8AM-5PM, Weekend availability",
      userType: "technician",
      createdAt: new Date('2023-07-14'),
      isActive: true,
      totalThankYous: 89,
      totalTips: 34
    },
    {
      id: 'mock-kevin-taylor',
      name: "Kevin Taylor",
      title: "Professional Painter",
      image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&h=300&fit=crop&crop=face",
      points: 798,
      about: "Professional painter with 11 years of experience in residential and commercial painting. Specializing in interior and exterior painting, color consultation, and surface preparation. Quality workmanship with attention to detail and clean job sites.",
      phoneNumber: "(555) 123-4567",
      email: "kevin.taylor@example.com",
      website: "https://taylorpainting.com",
      businessAddress: "852 Paint Brush Ave, Atlanta, GA 30342",
      businessName: "Taylor Professional Painting",
      category: "painting",
      specialties: "Interior Painting, Exterior Painting, Color Consultation, Cabinet Refinishing",
      yearsExperience: 11,
      certifications: "Licensed & Insured, Sherwin Williams Certified, Lead-Safe Certified",
      serviceArea: "Atlanta Metro - 35 mile radius",
      hourlyRate: "$45-$70",
      availability: "Monday-Saturday 7AM-5PM, Free estimates",
      userType: "technician",
      createdAt: new Date('2023-04-25'),
      isActive: true,
      totalThankYous: 145,
      totalTips: 72
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
