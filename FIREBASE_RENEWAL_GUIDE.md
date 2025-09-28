# 🔥 Firebase API Key Renewal Guide

## Error Encountered
```
Firebase: Error (auth/api-key-expired.-please-renew-the-api-key.)
```

## Solution: Renew Firebase API Key

### Step 1: Go to Firebase Console
1. Visit [Firebase Console](https://console.firebase.google.com/)
2. Select your **thankatech** project

### Step 2: Generate New API Key
1. Go to **Project Settings** (gear icon in sidebar)
2. Click on **General** tab
3. Scroll down to **Your apps** section
4. Find your web app and click the **Config** radio button
5. Copy the new `apiKey` value

### Step 3: Update .env.local
Replace the expired API key in your `.env.local` file:

```bash
# 🔥 Firebase Configuration - UPDATED!
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_NEW_API_KEY_HERE
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=thankatech.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=thankatech
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=thankatech.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=174593556452
NEXT_PUBLIC_FIREBASE_APP_ID=1:174593556452:web:54e8f0d48ff97c2899d1f1
```

### Step 4: Enable Google Sign-In (If Not Already)
1. In Firebase Console, go to **Authentication**
2. Click **Sign-in method** tab
3. Enable **Google** provider
4. Add your domain to authorized domains:
   - `localhost` (for development)
   - `thankatech.vercel.app` (for production)

### Step 5: Verify Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your **thankatech** project
3. Go to **APIs & Services > Credentials**
4. Ensure your OAuth 2.0 client is active and has correct origins:
   - `http://localhost:3000`
   - `http://localhost:3001`
   - `https://thankatech.vercel.app`

### Step 6: Test the Fix
After updating the API key:
1. Restart your development server: `npm run dev`
2. Try the "Sign in with Google" button
3. Should work without the expired key error

## Important Notes
- API keys can expire for security reasons
- Always keep your Firebase project active to prevent key expiration
- Consider setting up monitoring for Firebase authentication errors

## Current Project Structure
- **Project ID**: thankatech
- **Auth Domain**: thankatech.firebaseapp.com
- **Storage**: thankatech.firebasestorage.app

## If You Need to Create a New Firebase Project
If the current project is completely inaccessible:
1. Create new Firebase project
2. Enable Authentication with Google provider
3. Enable Firestore Database
4. Update all configuration values in `.env.local`
5. Update any hardcoded references in the code