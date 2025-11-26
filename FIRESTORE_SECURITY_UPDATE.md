# 🔒 Firestore Security Rules Update

## ⚠️ CRITICAL: Your Database is Currently INSECURE

Your current Firebase rules allow **anyone** to read and write **all data**:
```javascript
match /{document=**} {
  allow read, write: if true;  // ❌ DANGEROUS!
}
```

This means:
- ❌ Anyone can read all user data, emails, payment info
- ❌ Anyone can modify or delete any data
- ❌ Anyone can create fake transactions
- ❌ No authentication required

## ✅ Updated Security Rules

Your `firestore.rules` file has been updated with production-ready security rules that:

### 🛡️ Protection Features
1. **Authentication Required** - All operations require logged-in users
2. **User Isolation** - Users can only access their own data
3. **Admin-Only Operations** - Sensitive operations restricted to admins
4. **Immutable Records** - Transactions/tips/thank-yous can't be edited after creation
5. **Self-Transaction Prevention** - Users can't send tokens/tips to themselves
6. **Email Validation** - Email format validated on profile creation
7. **Data Integrity** - Critical fields like authUid, email, totalThankYous are protected

### 📋 Collections Covered
- ✅ **clients** - User profiles (read: all authenticated, write: own only)
- ✅ **technicians** - Tech profiles (read: all authenticated, write: own only)
- ✅ **admins** - Admin users (read/write: admins only)
- ✅ **tokenTransactions** - Token transfers (read: involved parties, create: sender only)
- ✅ **thankYous** - Appreciation messages (read: involved parties, immutable)
- ✅ **tips** - Monetary tips (read: involved parties, update: admins only)
- ✅ **tokenBalances** - User balances (read: own only, write: admins only)
- ✅ **dailyThankYouLimits** - Rate limiting (read: own only, write: system only)
- ✅ **businessClaims** - Business verification (read/write: own only, admin override)
- ✅ **emailLogs** - Email debugging (read: own/admin, write: system only)
- ✅ **stripePayments** - Payment records (read: own/admin, write: system only)
- ✅ **systemLogs** - System logs (read: admin only, write: system only)
- ✅ **profilePhotoMetadata** - Photo metadata (read/write: own/admin)
- ✅ **userSessions** - Session tracking (read: own/admin, write: system only)

## 🚀 Deploy Instructions

### Method 1: Firebase Console (Easiest - 2 minutes)

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Select your project: `thankatechsap` (or your project name)

2. **Open Firestore Rules**
   - Click **"Firestore Database"** in left sidebar
   - Click **"Rules"** tab at the top

3. **Copy & Paste Rules**
   - Open `firestore.rules` in VS Code
   - Select all (Ctrl+A) and copy (Ctrl+C)
   - Paste into Firebase Console editor (replacing ALL existing rules)

4. **Publish**
   - Click **"Publish"** button
   - Wait for confirmation (5-10 seconds)
   - ✅ Done! Rules are now active

### Method 2: Firebase CLI (Command Line)

1. **Install Firebase CLI** (if not already installed)
   ```powershell
   npm install -g firebase-tools
   ```

2. **Login to Firebase**
   ```powershell
   firebase login
   ```

3. **Initialize Firebase** (if not done)
   ```powershell
   firebase init firestore
   # Select your project
   # Accept default file names
   ```

4. **Deploy Rules**
   ```powershell
   firebase deploy --only firestore:rules
   ```

## ⚡ Immediate Actions Required

### 1. Deploy the Rules NOW
- Your data is currently exposed
- Deploy using Method 1 above (fastest)

### 2. Create Your First Admin
After deploying rules, you need at least one admin user:

```powershell
# Option A: Use Firebase Console
# Go to Firestore Database > Start collection
# Collection ID: admins
# Document ID: [your-firebase-auth-uid]
# Fields:
#   email: "your@email.com"
#   createdAt: [timestamp]
#   role: "admin"

# Option B: Use Firebase Admin SDK (if set up)
# Add this to a script and run once
```

### 3. Verify Rules Work

Test that rules are active:

1. **Open Browser Console** (F12)
2. **Try to read another user's data** - should fail
3. **Try to modify token balance directly** - should fail
4. **Try to send yourself a tip** - should fail

## 🔧 Troubleshooting

### "Permission Denied" Errors

If users get permission errors after deployment:

1. **Check they're logged in**
   ```javascript
   // In browser console
   firebase.auth().currentUser
   ```

2. **Verify their authUid matches document ID**
   - For clients: document ID should equal their Firebase Auth UID
   - For technicians: document ID should equal their Firebase Auth UID

3. **Create admin user** (if admin operations failing)
   - Add document to `admins` collection with their UID

### Rules Not Taking Effect

1. **Wait 1-2 minutes** for propagation
2. **Clear browser cache** and refresh
3. **Verify in Firebase Console** the rules show your new version
4. **Check Firebase Console > Firestore > Rules** tab for any syntax errors

### Testing Rules Locally

```powershell
# Install emulator
firebase init emulators

# Start emulator with your rules
firebase emulators:start --only firestore
```

## 📊 What Changed

| Before | After |
|--------|-------|
| `allow read, write: if true` | Comprehensive role-based access control |
| No authentication | All operations require authentication |
| No data validation | Email validation, amount checks, etc. |
| Can modify transactions | Transactions are immutable |
| Can send tokens to self | Self-transactions prevented |
| Can change email/authUid | Critical fields protected |
| No admin controls | Admin-only operations enforced |

## 🎯 Security Best Practices (Already Implemented)

- ✅ **Principle of Least Privilege** - Users only access what they need
- ✅ **Defense in Depth** - Multiple security layers
- ✅ **Immutable Audit Trail** - Financial records can't be altered
- ✅ **Input Validation** - Email format, amounts, etc. validated
- ✅ **Rate Limiting Support** - Daily limits tracked
- ✅ **Admin Separation** - Admin operations clearly separated
- ✅ **Explicit Deny** - Unknown collections blocked by default

## 📝 Next Steps

1. ✅ Deploy the rules (Method 1 above)
2. ✅ Create your admin user
3. ✅ Test functionality in production
4. ✅ Monitor Firebase Console for any rule violations
5. ✅ Update `storage.rules` similarly (if not done)
6. ✅ Document your admin user credentials securely

## 🔐 Storage Rules

Don't forget to also secure your Storage! Check `storage.rules` for profile photo security.

---

**Status**: Ready to deploy
**Impact**: High priority security fix
**Downtime**: None (rules update instantly)
**Rollback**: Keep a copy of old rules in case needed
