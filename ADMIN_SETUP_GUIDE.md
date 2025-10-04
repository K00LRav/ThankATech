# Admin User Setup Guide

## Overview
The admin authentication system has been upgraded to use a dedicated `admins` collection for enhanced security. This replaces the previous hardcoded email approach.

## Changes Made

### 1. Added Admins Collection
- Added `ADMINS: 'admins'` to COLLECTIONS constant in `src/lib/firebase.js`
- Exported COLLECTIONS from firebase.js for use in other components

### 2. Updated Dashboard Authentication Flow
The dashboard now searches collections in this secure order:
1. **Admins collection** (by authUid) - Most secure, checked first
2. Clients collection (by authUid)
3. Technicians collection (by authUid)
4. Users collection (by authUid) - Legacy fallback
5. Email fallback search (all collections) - For missing authUid scenarios

### 3. Enhanced Security
- Removed hardcoded admin email constant from main logic
- Admin users are now stored in dedicated, secure collection
- Maintains full Firebase Auth integration with UID-based lookups

## Setting Up Admin User

### Manual Setup Required
Since your admin account was created with manual registration (not Google Sign-in), you'll need to manually add your admin record to the new `admins` collection.

### Steps to Add Admin User:

1. **Get Your Firebase Auth UID**
   - Sign in to your admin account
   - Open browser console on the dashboard page
   - Look for log message: `🔍 Searching for user with Firebase Auth UID: [YOUR-UID]`
   - Copy this UID value

2. **Add Admin Document to Firestore**
   Using Firebase Console:
   - Go to Firebase Console → Firestore Database
   - Create new document in `admins` collection
   - Document structure:
   ```json
   {
     "authUid": "YOUR-FIREBASE-AUTH-UID",
     "email": "your-admin@email.com",
     "name": "Admin Name",
     "userType": "admin",
     "createdAt": "2024-01-XX",
     "displayName": "Admin"
   }
   ```

3. **Alternative: Using Firebase Admin SDK** (if you have it set up)
   ```javascript
   await db.collection('admins').add({
     authUid: 'YOUR-FIREBASE-AUTH-UID',
     email: 'your-admin@email.com',
     name: 'Admin Name',
     userType: 'admin',
     createdAt: new Date().toISOString(),
     displayName: 'Admin'
   });
   ```

## Security Benefits

### Before (Hardcoded Email)
- Admin email hardcoded in source code
- Less secure, visible in client-side code
- Difficult to manage multiple admins
- No proper user profile for admin

### After (Dedicated Collection)
- Admin users stored securely in database
- Full Firebase Auth integration
- Easy to add/remove admin users
- Proper user profiles with all metadata
- Scalable for multiple admin users

## Testing

After adding the admin document:
1. Sign in with your admin account
2. Dashboard should detect admin user and redirect to `/admin`
3. Check console logs for confirmation:
   ```
   👑 Admins collection results: 1 documents found
   🔐 Admin user found in admins collection: your-admin@email.com
   🚀 Redirecting to admin panel...
   ```

## Troubleshooting

### Admin User Not Found
1. Verify the `authUid` in the admin document matches your Firebase Auth UID
2. Check console logs for the exact UID being searched
3. Ensure the document is in the `admins` collection (not `admin` or similar)

### Fallback Email Search
If authUid lookup fails, the system will try email-based search and automatically update the document with the correct authUid for future lookups.

### Multiple Admins
To add more admin users:
1. Each admin needs their own Firebase Auth account
2. Add their document to `admins` collection with their unique authUid
3. System will automatically detect and redirect them to admin panel

## Collection Architecture

```
📁 Firestore Collections:
├── admins/          ← New secure admin storage
│   ├── {docId}/
│   │   ├── authUid: "firebase-auth-uid"
│   │   ├── email: "admin@example.com"
│   │   ├── name: "Admin Name"
│   │   └── userType: "admin"
├── clients/         ← Regular client users
├── technicians/     ← Technician users
└── users/           ← Legacy collection (being phased out)
```

This new architecture provides better security, scalability, and maintainability for admin user management.