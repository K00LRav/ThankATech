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
 * Fetch technicians - prioritize Firebase registered ones, supplement with Google Places
 * @param {string} category - Service category
 * @param {string} location - Lat,lng coordinates
 * @param {number} maxResults - Maximum number of results
 */
export async function fetchTechnicians(category = 'all', location = DEFAULT_LOCATION, maxResults = 10) {
  try {
    let allTechnicians = [];
    
    // First, get registered technicians from Firebase
    console.log('Fetching registered technicians from Firebase...');
    const registeredTechnicians = await getRegisteredTechnicians();
    
    if (registeredTechnicians.length > 0) {
      console.log(`Found ${registeredTechnicians.length} registered technicians`);
      allTechnicians = registeredTechnicians;
    }
    
    // If we need more technicians, supplement with Google Places
    const remainingSlots = maxResults - allTechnicians.length;
    
    if (remainingSlots > 0 && GOOGLE_PLACES_API_KEY) {
      console.log(`Fetching ${remainingSlots} more from Google Places...`);
      
      const categoriesToFetch = category === 'all' 
        ? Object.keys(SERVICE_CATEGORIES)
        : [category];

      for (const cat of categoriesToFetch) {
        const searchTerm = SERVICE_CATEGORIES[cat];
        if (!searchTerm) continue;

        const results = await searchPlaces(searchTerm, location);
        const technicians = await Promise.all(
          results.slice(0, Math.ceil(remainingSlots / categoriesToFetch.length))
            .map(place => transformPlaceToTechnician(place, cat))
        );
        
        allTechnicians.push(...technicians);
        
        if (allTechnicians.length >= maxResults) break;
      }
    }

    // If still no results, use mock data
    if (allTechnicians.length === 0) {
      console.log('No technicians found, using mock data');
      return getMockTechnicians();
    }

    return allTechnicians.slice(0, maxResults);
    
  } catch (error) {
    console.error('Error fetching technicians:', error);
    return getMockTechnicians();
  }
}

/**
 * Search for places using Google Places Nearby Search
 */
async function searchPlaces(query, location) {
  const url = `${PLACES_API_URL}/nearbysearch/json?` +
    `location=${location}&` +
    `radius=${SEARCH_RADIUS}&` +
    `keyword=${encodeURIComponent(query)}&` +
    `type=establishment&` +
    `key=${GOOGLE_PLACES_API_KEY}`;

  const response = await fetch(url);
  const data = await response.json();
  
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Places API error: ${data.status}`);
  }

  return data.results || [];
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
      name: "John Doe",
      title: "Auto Mechanic",
      about: "John is an auto mechanic with 10+ years of experience in engine repair, diagnostics, and routine maintenance. He is known for his attention to detail and dedication to helping customers get back on the road safely.",
      image: "/mechanic-cartoon.png",
      points: 128,
    },
    {
      name: "Jane Doe",
      title: "Electrician",
      about: "Jane is an electrician with 8+ years of experience in electrical diagnostics, wiring, and vehicle electronics. She is passionate about solving complex electrical issues and helping customers stay safe on the road.",
      image: "/jane-doe.jpg",
      points: 142,
    },
    // Add more mock data as needed...
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