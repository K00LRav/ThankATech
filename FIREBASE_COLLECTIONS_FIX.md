# Firebase Collections Architecture Fix

## Problem Identified

You discovered a fundamental mismatch in the data architecture:

### Original Issue
- **Registration**: Users were being saved to `clients` and `technicians` collections
- **Dashboard**: Was looking for users in the `users` collection  
- **Result**: `User document not found` error because dashboard couldn't find the user data

## Root Cause Analysis

### Registration Process (`firebase.js`)
```javascript
// registerUser() saves to:
const docRef = await addDoc(collection(db, COLLECTIONS.CLIENTS), {
  ...userData,
  authUid: authUser?.uid || null,  // Firebase Auth UID stored here
  // ... other data
});
```

### Dashboard Process (`dashboard/page.tsx`) - BEFORE FIX
```typescript
// loadUserProfile() was looking in wrong place:
const userDoc = await getDoc(doc(db, 'users', userId)); // ❌ Wrong collection!
```

## The Fix Applied

### Updated Dashboard Logic
The dashboard now correctly searches through the actual collections where users are stored:

1. **Admin Check First**: Still checks for admin users in `users` collection
2. **Clients Collection**: Queries `clients` collection by `authUid` field  
3. **Technicians Collection**: Queries `technicians` collection by `authUid` field
4. **Fallback**: Finally checks `users` collection for special cases

### Key Changes Made

#### 1. Proper Collection Queries
```typescript
// NEW: Query by authUid field instead of document ID
const clientsQuery = query(collection(db, 'clients'), where('authUid', '==', userId));
const techsQuery = query(collection(db, 'technicians'), where('authUid', '==', userId));
```

#### 2. Correct User Type Mapping
- **Clients Collection** → `userType: 'client'`
- **Technicians Collection** → `userType: 'technician'`  
- **Users Collection** → `userType: 'admin'` (for admins)

#### 3. Better Error Logging
```typescript
console.error('User document not found in any collection (clients, technicians, users)');
console.log('Checked collections for userId:', userId);
```

## Data Architecture Overview

### Collections Structure
```
Firebase Firestore:
├── clients/          # Regular customers
│   └── {docId}
│       ├── authUid: "firebase_auth_uid"
│       ├── name: "Customer Name"  
│       ├── email: "user@email.com"
│       └── ...
├── technicians/      # Service technicians
│   └── {docId}
│       ├── authUid: "firebase_auth_uid"
│       ├── name: "Tech Name"
│       └── ...
└── users/           # Special users (admins)
    └── {firebase_auth_uid}  # Uses Auth UID as doc ID
        ├── userType: "admin"
        └── ...
```

### Key Insight
- **Regular users**: Stored in `clients`/`technicians` with `authUid` field
- **Admin users**: Stored in `users` with Firebase Auth UID as document ID  
- **Dashboard**: Must query by `authUid` to find user documents

## Testing the Fix

After applying the fix:
1. ✅ Server starts without errors
2. ✅ TypeScript compilation passes
3. ✅ Dashboard should now find users in correct collections
4. ✅ No more "User document not found" errors for legitimate users

## Impact

- **Fixed**: Dashboard access for registered users
- **Improved**: Error messages show which collections were checked
- **Maintained**: Admin functionality still works  
- **Enhanced**: Proper user type detection and routing