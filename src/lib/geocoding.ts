/**
 * Geocoding utilities using Google Maps Geocoding API
 */

import { logger } from './logger';

interface Coordinates {
  lat: number;
  lng: number;
}

interface GeocodeResult {
  coordinates: Coordinates;
  formattedAddress?: string;
}

/**
 * Geocode an address using Google Maps Geocoding API
 * @param address - The address to geocode
 * @returns Promise with coordinates and formatted address
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address || address.trim().length === 0) {
    logger.warn('Geocoding: Empty address provided');
    return null;
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    logger.warn('Google Maps API key not configured. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local');
    return null;
  }

  try {
    const encodedAddress = encodeURIComponent(address.trim());
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'ZERO_RESULTS') {
      logger.warn(`Geocoding: No results found for address: ${address}`);
      return null;
    }

    if (data.status === 'OVER_QUERY_LIMIT') {
      logger.error('Geocoding: API quota exceeded');
      return null;
    }

    if (data.status === 'REQUEST_DENIED') {
      logger.error('Geocoding: API request denied. Check your API key and billing settings.');
      return null;
    }

    if (data.status === 'INVALID_REQUEST') {
      logger.error(`Geocoding: Invalid request for address: ${address}`);
      return null;
    }

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      logger.warn(`Geocoding failed with status: ${data.status}`);
      return null;
    }

    const result = data.results[0];
    const { lat, lng } = result.geometry.location;

    return {
      coordinates: { lat, lng },
      formattedAddress: result.formatted_address
    };

  } catch (error) {
    logger.error('Error geocoding address:', error);
    return null;
  }
}

/**
 * Geocode multiple addresses in batch (with rate limiting)
 * @param addresses - Array of addresses to geocode
 * @param delayMs - Delay between requests to avoid rate limiting (default 200ms)
 * @returns Promise with array of results (null for failed geocoding)
 */
export async function geocodeAddressBatch(
  addresses: string[],
  delayMs: number = 200
): Promise<(GeocodeResult | null)[]> {
  const results: (GeocodeResult | null)[] = [];

  for (const address of addresses) {
    const result = await geocodeAddress(address);
    results.push(result);

    // Add delay between requests to avoid hitting rate limits
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Reverse geocode coordinates to get an address
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Promise with formatted address
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    logger.warn('Google Maps API key not configured');
    return null;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      return data.results[0].formatted_address;
    }

    return null;
  } catch (error) {
    logger.error('Error reverse geocoding:', error);
    return null;
  }
}

/**
 * Validate coordinates are within reasonable bounds
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180 &&
    !isNaN(lat) && !isNaN(lng)
  );
}

