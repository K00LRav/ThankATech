# Firebase Security Rules Deployment

## Overview
This directory contains Firebase security rules for both Firestore Database and Storage.

## Files
- `firestore.rules` - Database security rules
- `storage.rules` - Storage security rules  
- `firebase.json` - Firebase configuration

## Deploy Rules

### Option 1: Using Firebase Console (Recommended for Quick Fix)

#### Firestore Rules:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click on **Firestore Database** in the left menu
4. Click on the **Rules** tab
5. Copy the contents of `firestore.rules`
6. Paste into the editor
7. Click **Publish**

#### Storage Rules:
1. In Firebase Console, click on **Storage** in the left menu
2. Click on the **Rules** tab
3. Copy the contents of `storage.rules`
4. Paste into the editor
5. Click **Publish**

### Option 2: Using Firebase CLI

1. Install Firebase CLI (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project (if not done):
   ```bash
   firebase init
   ```
   - Select **Firestore** and **Storage**
   - Choose your existing project
   - Accept the default file names

4. Deploy the rules:
   ```bash
   firebase deploy --only firestore:rules,storage:rules
   ```

## Rules Summary

### Storage Rules
- ✅ Authenticated users can upload images to their own `profile-photos/{userId}/` folder
- ✅ Maximum file size: 5MB
- ✅ Only image files allowed (`image/*`)
- ✅ Anyone authenticated can read profile photos
- ❌ Users cannot access other users' upload folders

### Firestore Rules
- ✅ Authenticated users can read all public profiles
- ✅ Users can only write/update their own profile
- ✅ Anyone can read technician/client profiles
- ✅ Users can create thank yous and tips
- ✅ Thank yous and tips cannot be modified or deleted after creation
- ❌ Token balances and transactions are read-only from client (server-side only)

## Testing
After deploying, test by:
1. Logging into your dashboard
2. Uploading a profile picture
3. Updating your username
4. Viewing other technician profiles

## Troubleshooting
If you get permission errors:
1. Verify you're logged in (check browser console for auth token)
2. Check that rules are published in Firebase Console
3. Wait 1-2 minutes for rules to propagate
4. Clear browser cache and refresh
