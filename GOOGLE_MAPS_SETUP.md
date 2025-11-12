# Google Maps API Setup Guide

This guide will help you set up Google Maps Geocoding API for location-based features in ThankATech.

## Why We Need Google Maps API

ThankATech uses Google Maps Geocoding API to:
- Convert technician business addresses to coordinates (latitude/longitude)
- Calculate accurate distances between users and technicians
- Sort technicians by proximity to the user's location

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click "Select a project" at the top
4. Click "New Project"
5. Enter project name (e.g., "ThankATech")
6. Click "Create"

## Step 2: Enable Geocoding API

1. In the Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Geocoding API"
3. Click on "Geocoding API"
4. Click "Enable"

## Step 3: Create API Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click "Create Credentials" → "API key"
3. Copy the API key that appears

## Step 4: Restrict Your API Key (Recommended for Security)

### Application Restrictions:
1. Click on your newly created API key to edit it
2. Under "Application restrictions", select "HTTP referrers (web sites)"
3. Add these referrer restrictions:
   - `localhost:3000/*` (for development)
   - `https://your-production-domain.com/*` (for production)
   - `https://*.vercel.app/*` (if using Vercel)

### API Restrictions:
1. Under "API restrictions", select "Restrict key"
2. Select only "Geocoding API" from the dropdown
3. Click "Save"

## Step 5: Add API Key to Your Project

1. Open your `.env.local` file in the project root
2. Add this line:
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```
3. Replace `your_api_key_here` with your actual API key
4. Save the file
5. Restart your development server: `npm run dev`

## Step 6: Enable Billing (Required)

Google Maps API requires billing to be enabled, but includes **$200 free credit per month**.

1. Go to **Billing** in Google Cloud Console
2. Click "Link a billing account" or "Create account"
3. Enter your payment information
4. The Geocoding API is very affordable:
   - **$5 per 1,000 requests** after free $200 credit
   - First 40,000 requests are free each month
   - For a typical small business, you'll likely stay within free tier

### Cost Examples:
- **100 new technician registrations/month**: ~$0 (well within free tier)
- **1,000 technicians viewed by users**: ~$0-5 (depending on caching)
- **10,000 page views**: ~$25-50 (with proper caching, much less)

## Step 7: Test the Integration

1. Make sure your dev server is running: `npm run dev`
2. Open http://localhost:3000
3. Allow location access when prompted by your browser
4. Check the browser console for geocoding logs:
   - You should see: `✅ Geocoded address for [Business Name]: lat, lng`
   - If you see warnings, check your API key setup

## Testing Geocoding

### Test Registration:
1. Click "Join Now" → "Technician"
2. Fill out the form with a real address (e.g., "1600 Amphitheatre Parkway, Mountain View, CA")
3. Complete registration
4. Check browser console for: `✅ Geocoded address...`
5. View technician list - distance should be accurate based on your location

### Test Distance Calculation:
1. Enable location services in your browser
2. Reload the homepage
3. Look for "X miles away" on technician cards
4. Distances should be accurate, not all showing 731 miles

## Troubleshooting

### "Geocoding: API request denied"
- Check that Geocoding API is enabled in Google Cloud Console
- Verify API key is correct in `.env.local`
- Make sure billing is enabled

### "Tracking Prevention blocked access"
- This is a browser privacy setting, not an API issue
- See main README for browser-specific solutions

### Distances still showing 731 miles
- Check browser console for geocoding errors
- Verify `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set correctly
- Restart the dev server after adding the API key
- Clear browser cache and reload

### API Key exposed in client-side code
- This is expected - the key starts with `NEXT_PUBLIC_`
- That's why we set up application and API restrictions in Step 4
- The restrictions prevent unauthorized use of your key

## Monitoring Usage

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Dashboard**
3. Click on "Geocoding API"
4. View metrics, quotas, and usage

## Alternative: Skip Geocoding (Development Only)

If you don't want to set up Google Maps API right now, the app will still work:
- Distances will default to Atlanta, GA coordinates
- All technicians will show inaccurate distances
- Registration will still succeed, but without coordinate storage
- Users can still browse and interact with technicians

To properly test location features, the API key is required.

## Cost Optimization Tips

1. **Caching**: The app caches geocoded addresses in memory to reduce API calls
2. **Store Coordinates**: Once geocoded during registration, coordinates are stored in Firestore
3. **Rate Limiting**: The geocoding utility includes built-in delays for batch operations
4. **Monitor Usage**: Set up budget alerts in Google Cloud Console

## Security Best Practices

✅ **DO:**
- Restrict API key to specific domains
- Restrict API key to only Geocoding API
- Enable billing alerts
- Monitor usage regularly
- Use environment variables (never commit API keys)

❌ **DON'T:**
- Share your API key publicly
- Commit `.env.local` to version control
- Use the same key for development and production
- Leave API restrictions disabled

## Support

If you encounter issues:
1. Check the [Google Maps Platform Documentation](https://developers.google.com/maps/documentation/geocoding)
2. Review the [Pricing Calculator](https://mapsplatform.google.com/pricing/)
3. Check the [Google Cloud Status Dashboard](https://status.cloud.google.com/)
