# Firebase Security Rules Update

## Current Issue
You're getting "Missing or insufficient permissions" because your Firestore security rules are too restrictive.

## Quick Fix - Temporary Open Rules (For Development)

**⚠️ WARNING: These rules are for development only! Never use in production!**

Go to your Firebase Console → Firestore Database → Rules and replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access on all documents to any user (DEVELOPMENT ONLY)
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## Better Rules - For Production Use

Once development is complete, use these more secure rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection - users can read/write their own documents
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Technicians collection - technicians can read/write their own profiles
    // Anyone can read technician profiles (for public display)
    match /technicians/{technicianId} {
      allow read: if true; // Public read access
      allow write: if request.auth != null && request.auth.uid == technicianId;
    }
    
    // Thank yous collection - authenticated users can create, technicians can read their own
    match /thankYous/{thankYouId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
    
    // Tips collection - authenticated users can create, technicians can read their own
    match /tips/{tipId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
  }
}
```

## Steps to Fix:

1. **Go to Firebase Console** → Your Project → Firestore Database
2. **Click "Rules" tab**
3. **Replace existing rules** with the development rules above
4. **Click "Publish"**
5. **Test your app** - the "Fix DB" button should work now
6. **Later, switch to production rules** when you're ready to deploy

## Why This Happened:
- Default Firestore rules deny all access for security
- Your app needs permission to create/read/write documents
- Authentication alone isn't enough - you need explicit rules

The temporary open rules will let you finish development, then you can secure them properly for production.