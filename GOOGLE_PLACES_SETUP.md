# 🔧 Google Places API Setup Guide

Follow these steps to integrate real technician data into your ThankATech app:

## 1. 🔑 Get Google Places API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the required APIs:
   - **Places API**
   - **Maps JavaScript API** 
   - **Places API (New)**
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Copy your API key

## 2. 🔒 Secure Your API Key

1. In Google Cloud Console, click on your API key
2. Under "API restrictions", select "Restrict key"
3. Choose the APIs you enabled above
4. Under "Application restrictions", add your domain:
   - For development: `localhost:3000`
   - For production: your actual domain

## 3. 🌍 Set Up Environment Variables

1. In your project root, create `.env.local`:
```bash
cp .env.example .env.local
```

2. Edit `.env.local` and add your API key:
```bash
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=AIzaSyAEdPUZS5Eer1C6I1EiDJG_94vsU-waufc
NEXT_PUBLIC_DEFAULT_LOCATION=40.7128,-74.0060

# Firebase Configuration (you'll need to provide these)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## 4. 📍 Customize Default Location (Optional)

Change the default location coordinates in `.env.local`:
- New York: `40.7128,-74.0060`
- Los Angeles: `34.0522,-118.2437`
- Chicago: `41.8781,-87.6298`
- Your city: Find coordinates on [LatLong.net](https://www.latlong.net/)

## 5. 🚀 Install Dependencies

The API service is already set up! Just run:
```bash
npm install
npm run dev
```

## 6. ✅ Test the Integration

1. Open http://localhost:3000
2. Allow location access when prompted (optional)
3. You should see real local technicians!
4. Scroll through to see different service providers

## 🔧 How It Works

- **Location Detection**: Asks for user's location, falls back to default
- **Real Data**: Fetches actual businesses from Google Places
- **Photos**: Uses real business photos when available
- **Ratings**: Converts Google ratings to "Thank You Points"
- **Fallback**: Shows mock data if API is unavailable

## 💰 API Costs

Google Places API pricing (as of 2024):
- **Basic Data**: $17 per 1,000 requests
- **Contact Data**: $3 per 1,000 requests  
- **Atmosphere Data**: $5 per 1,000 requests

**Free Tier**: $200/month credit (≈11,000 requests)

## 🛡️ Best Practices

1. **Cache Results**: Consider caching API responses
2. **Rate Limiting**: Don't make too many requests
3. **Error Handling**: Always have fallback data
4. **User Consent**: Ask permission for location access

## 🔍 Customization Options

You can modify the service categories in `src/lib/techniciansApi.js`:
- Add new service types
- Change search terms
- Adjust search radius
- Modify result transformations

## 🐛 Troubleshooting

**No results showing?**
- Check your API key in `.env.local`
- Verify APIs are enabled in Google Cloud Console
- Check browser console for errors

**"API key not valid" error?**
- Make sure you copied the key correctly
- Check API restrictions in Google Cloud Console

**Only seeing mock data?**
- API key might be missing or invalid
- Check the console for API error messages

---

Need help? The app will automatically fall back to mock data if there are any API issues, so your site will always work! 🎉