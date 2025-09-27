// Combined service for Firebase registered technicians + Google Places API

import { getRegisteredTechnicians, getTopTechnicians } from './firebase';

const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
const PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place';

// Service categories mapped to Google Places search terms
const SERVICE_CATEGORIES = {
  'auto_mechanic': 'car repair',
  'electrician': 'electrician',
  'plumber': 'plumber', 
  'hvac': 'hvac contractor',
  'contractor': 'general contractor',
  'handyman': 'handyman',
  'av_technician': 'audio visual installer',
  'computer_repair': 'computer repair',
  'appliance_repair': 'appliance repair',
  'locksmith': 'locksmith'
};

// Default location (can be made dynamic later)
const DEFAULT_LOCATION = '40.7128,-74.0060'; // New York City coordinates
const SEARCH_RADIUS = 50000; // 50km radius

/**
 * Fetch registered technicians from Firebase only
 * @param {string} category - Service category filter
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
    
    // If no registered technicians, show mock data with a message
    if (technicians.length === 0) {
      console.log('No registered technicians found, using sample data');
      const mockTechs = getMockTechnicians();
      // Add a flag to indicate these are sample profiles
      return mockTechs.map(tech => ({
        ...tech,
        isSample: true,
        about: tech.about + ' (Sample profile - Real technicians can register to appear here!)'
      }));
    }

    console.log(`Found ${technicians.length} registered technicians`);
    return technicians.slice(0, maxResults);
    
  } catch (error) {
    console.error('Error fetching technicians:', error);
    console.log('Falling back to sample data due to error');
    return getMockTechnicians();
  }
}

/**
 * Search for places using our Next.js API route (bypasses CORS)
 */
async function searchPlaces(query, location) {
  const url = `/api/places?query=${encodeURIComponent(query)}&location=${location}&radius=${SEARCH_RADIUS}`;
  
  console.log('🔄 Calling internal API:', url);
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    console.log('✅ API Success:', data.results?.length || 0, 'places found');
    return data.results || [];
    
  } catch (error) {
    console.error('❌ Search Places Error:', error.message);
    throw error;
  }
}

/**
 * Get detailed place information including photos
 */
async function getPlaceDetails(placeId) {
  const url = `${PLACES_API_URL}/details/json?` +
    `place_id=${placeId}&` +
    `fields=name,formatted_phone_number,website,photos,reviews,rating&` +
    `key=${GOOGLE_PLACES_API_KEY}`;

  const response = await fetch(url);
  const data = await response.json();
  
  return data.result;
}

/**
 * Transform Google Places result to our technician format
 */
async function transformPlaceToTechnician(place, category) {
  let photoUrl = '/mechanic-cartoon.png'; // Default fallback
  
  // Try to get a photo from the place
  if (place.photos && place.photos.length > 0) {
    const photoReference = place.photos[0].photo_reference;
    photoUrl = `${PLACES_API_URL}/photo?` +
      `maxwidth=400&` +
      `photo_reference=${photoReference}&` +
      `key=${GOOGLE_PLACES_API_KEY}`;
  }

  // Generate points based on rating
  const points = place.rating ? Math.round(place.rating * 30) : Math.floor(Math.random() * 200) + 50;

  return {
    name: place.name || 'Professional Technician',
    title: getCategoryTitle(category),
    about: generateAboutText(place, category),
    image: photoUrl,
    points: points,
    rating: place.rating || 0,
    placeId: place.place_id,
    vicinity: place.vicinity || 'Local Area'
  };
}

/**
 * Get user-friendly title for category
 */
function getCategoryTitle(category) {
  const titles = {
    'auto_mechanic': 'Auto Mechanic',
    'electrician': 'Electrician',
    'plumber': 'Plumber',
    'hvac': 'HVAC Technician',
    'contractor': 'General Contractor',
    'handyman': 'Handyman',
    'av_technician': 'AV Technician',
    'computer_repair': 'Computer Repair Tech',
    'appliance_repair': 'Appliance Repair Tech',
    'locksmith': 'Locksmith'
  };
  
  return titles[category] || 'Service Technician';
}

/**
 * Generate about text based on place data and category
 */
function generateAboutText(place, category) {
  const rating = place.rating ? `${place.rating}-star rated` : 'highly rated';
  const location = place.vicinity ? `serving ${place.vicinity}` : 'serving the local area';
  
  const categoryDescriptions = {
    'auto_mechanic': `A ${rating} auto mechanic ${location}, specializing in vehicle maintenance and repair services.`,
    'electrician': `A ${rating} electrician ${location}, providing electrical installation and repair services.`,
    'plumber': `A ${rating} plumber ${location}, handling all plumbing installation and repair needs.`,
    'hvac': `A ${rating} HVAC technician ${location}, expert in heating, ventilation, and air conditioning systems.`,
    'contractor': `A ${rating} general contractor ${location}, managing construction and renovation projects.`,
    'handyman': `A ${rating} handyman ${location}, skilled in various home repair and maintenance tasks.`,
    'av_technician': `A ${rating} audio-visual technician ${location}, specializing in entertainment system installations.`,
    'computer_repair': `A ${rating} computer repair technician ${location}, providing hardware and software support.`,
    'appliance_repair': `A ${rating} appliance repair specialist ${location}, fixing all major home appliances.`,
    'locksmith': `A ${rating} locksmith ${location}, providing security and lock services 24/7.`
  };

  return categoryDescriptions[category] || 
    `A ${rating} service professional ${location}, dedicated to quality workmanship and customer satisfaction.`;
}

/**
 * Fallback mock data when API is unavailable
 */
function getMockTechnicians() {
  return [
    {
      id: "sample-john-doe",
      name: "John Doe",
      title: "Auto Mechanic - Doe's Auto Repair",
      businessName: "Doe's Auto Repair",
      category: "Auto Mechanic",
      about: "John is a certified auto mechanic with 10+ years of experience in engine repair, diagnostics, and routine maintenance. He specializes in foreign and domestic vehicles, offering honest service and competitive prices. John is ASE certified and known for his attention to detail and dedication to helping customers get back on the road safely.",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face&auto=format",
      points: 128,
      rating: 4.8,
      // Contact Information
      businessPhone: "(555) 123-4567",
      businessEmail: "john@doesautorepair.com",
      website: "www.doesautorepair.com",
      businessAddress: "123 Main Street, Atlanta, GA 30309",
      // Service Details
      experience: "10+ years",
      certifications: "ASE Certified Master Technician, EPA 609 Certified, State Inspection License",
      serviceArea: "Atlanta Metro Area - 25 mile radius",
      hourlyRate: "$85-$120",
      availability: "Monday-Friday 8AM-6PM, Saturday 9AM-4PM, Emergency towing 24/7",
      // System fields
      userType: "technician",
      createdAt: new Date('2024-01-15'),
      isActive: true,
      totalThankYous: 45,
      totalTips: 380
    },
    {
      id: "sample-jane-doe",
      name: "Jane Doe",
      title: "Master Electrician - Spark & Wire Electric",
      businessName: "Spark & Wire Electric",
      category: "Electrician",
      about: "Jane is a master electrician with 12+ years of experience in residential and commercial electrical work. She specializes in electrical panel upgrades, smart home installations, and emergency electrical repairs. Jane is known for her meticulous work, safety-first approach, and excellent customer service. She stays current with all electrical codes and green energy solutions.",
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b829?w=150&h=150&fit=crop&crop=face&auto=format",
      points: 196,
      rating: 4.9,
      // Contact Information
      businessPhone: "(555) 987-6543",
      businessEmail: "jane@sparkandwire.com",
      website: "www.sparkandwire.com",
      businessAddress: "456 Electric Avenue, Atlanta, GA 30309",
      // Service Details
      experience: "12+ years",
      certifications: "Master Electrician License, NECA Certified, OSHA 30-Hour Safety Certified, Tesla Powerwall Certified Installer",
      serviceArea: "Atlanta Metro & North Georgia - 30 mile radius",
      hourlyRate: "$95-$140",
      availability: "Monday-Friday 7AM-7PM, Saturday 8AM-5PM, 24/7 emergency service available",
      // System fields
      userType: "technician",
      createdAt: new Date('2023-11-20'),
      isActive: true,
      totalThankYous: 67,
      totalTips: 485
    },
    {
      id: "sample-mike-smith",
      name: "Mike Smith",
      title: "Master Plumber - Smith Plumbing Solutions",
      businessName: "Smith Plumbing Solutions",
      category: "Plumber",
      about: "Mike is a licensed master plumber with 15+ years of experience serving residential and commercial clients. He specializes in pipe repairs, water heater installations, drain cleaning, and bathroom renovations. Mike is known for his punctuality, fair pricing, and quality workmanship that lasts.",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format",
      points: 234,
      rating: 4.7,
      // Contact Information
      businessPhone: "(555) 246-8135",
      businessEmail: "mike@smithplumbing.com",
      website: "www.smithplumbing.com",
      businessAddress: "789 Water Way, Atlanta, GA 30310",
      // Service Details
      experience: "15+ years",
      certifications: "Master Plumber License, Backflow Prevention Certified, Green Plumber Certified",
      serviceArea: "Greater Atlanta Area - 40 mile radius",
      hourlyRate: "$90-$130",
      availability: "Monday-Friday 7AM-6PM, Weekend emergency calls, 24/7 emergency service",
      // System fields
      userType: "technician",
      createdAt: new Date('2023-08-10'),
      isActive: true,
      totalThankYous: 52,
      totalTips: 420
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