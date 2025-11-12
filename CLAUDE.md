# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ThankATech is a Next.js 15 full-stack web application that enables customers to appreciate skilled technicians through a dual-mechanism system: free "Thank You" gestures and paid "TOA (Token of Appreciation)" tokens. The platform uses Firebase for data/authentication, Stripe for payments/payouts, and implements a closed-loop token economy.

## Development Commands

```bash
# Development
npm run dev              # Start Next.js dev server at http://localhost:3000

# Production
npm run build            # Build for production
npm start                # Start production server

# Code Quality
npm run lint             # Run ESLint
```

## Environment Setup

Required environment variables (create `.env.local`):

```bash
# Firebase Client (Public)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Server (Server-only)
FIREBASE_SERVICE_ACCOUNT_KEY=     # JSON string
FIREBASE_PROJECT_ID=

# Google Maps (for location/distance features)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=  # Required for geocoding addresses

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_WEBHOOK_SECRET_HIGH_PAYLOAD=
PLATFORM_FLAT_FEE=99              # cents

# App
NEXT_PUBLIC_ADMIN_EMAIL=
NEXT_PUBLIC_APP_URL=
```

See `SIMPLE_SETUP_GUIDE.md`, `STRIPE_SETUP_GUIDE.md`, and `BREVO_SETUP.md` for detailed setup instructions.

## Architecture Overview

### Firebase Integration Pattern

**Client SDK** (`src/lib/firebase.ts`)
- Used for: UI interactions, authentication, public Firestore queries
- Initializes: Auth, Firestore, Storage, Google OAuth provider
- Falls back to mock data mode if Firebase config is missing
- Never use for privileged operations

**Admin SDK** (`src/lib/firebase-admin.js`)
- Used for: Server-side API routes, Stripe webhooks, privileged operations
- Only runs server-side (checks `typeof window === 'undefined'`)
- Uses service account key from `FIREBASE_SERVICE_ACCOUNT_KEY`
- Never expose to browser

### Location-Based Features

The platform uses Google Maps Geocoding API for location-based technician discovery:

**Geocoding Implementation:**
- **During Registration**: When a technician registers with a business address, the address is automatically geocoded to coordinates (lat/lng) and stored in Firestore
- **Distance Calculation**: User's browser geolocation is used to calculate distances to technicians using the Haversine formula
- **Caching**: Geocoded addresses are cached in-memory to reduce API calls
- **Fallback**: If geocoding fails, defaults to Atlanta coordinates

**Key Files:**
- `src/lib/geocoding.ts` - Google Maps Geocoding API wrapper with caching
- `src/lib/techniciansApi.js` - Distance calculation and sorting logic
- `src/lib/firebase.ts` (registerTechnician) - Geocodes address during registration

**Firestore Schema:**
```javascript
technicians: {
  businessAddress: "123 Main St, Atlanta, GA 30309",
  coordinates: {
    lat: 33.7490,
    lng: -84.3880
  }
}
```

**Note**: Requires `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` with Geocoding API enabled. Without this key, distances will default to Atlanta fallback coordinates.

### Token Economy System

ThankATech implements a three-tier appreciation model:

**Tier 1: Free Thank You**
- No cost to sender
- Daily limit: 3 per technician per customer
- Awards: 10 ThankATech Points to technician
- Tracked in `dailyLimits` collection

**Tier 2: TOA Tokens (Purchased)**
- Customers buy token packs: 100-7500 tokens at $1.99-$149.99
- Customers send 1-50 tokens to technicians per transaction
- Awards: 2 ThankATech Points per token to recipient, 1 point to sender
- Real monetary value: ~1.99¢ per token
- Payout: $0.01 per token (85% technician / 15% platform)

**Tier 3: Points Conversion**
- 5 ThankATech Points = 1 TOA token
- Max 20 conversions per day per user
- Encourages platform engagement, prevents points hoarding

**Key Token System Files:**
- `src/lib/tokens.ts` - Token pack definitions, pricing, limits
- `src/lib/token-firebase.ts` - Token balance management, transactions, daily limits
- `src/components/TokenPurchaseModal.tsx` - Token pack purchase UI
- `src/components/TokenSendModal.tsx` - Token sending UI
- `src/components/ConversionWidget.tsx` - Points-to-tokens conversion

### Stripe Payment Architecture

**Token Purchase Flow:**
1. Customer selects token pack → `/api/create-token-checkout`
2. Creates Stripe CheckoutSession with metadata (userId, tokens, type)
3. Redirects to Stripe-hosted checkout
4. On success: Stripe webhook `checkout.session.completed` → `addTokensToBalance()`
5. Tokens credited to `tokenBalances` collection

**Legacy Tip Flow (deprecated but still supported):**
1. Customer enters tip amount → `/api/create-payment-intent`
2. Creates PaymentIntent with direct transfer to technician's Express account
3. Platform fee: $0.99 flat
4. On success: Stripe webhook `payment_intent.succeeded` → records in `tips` collection

**Payout Flow:**
1. Technician requests payout from dashboard
2. Minimum $1.00 threshold
3. Currently mock implementation (simulate payout)
4. Future: Stripe transfers to technician Express accounts

**Webhook Handler:** `src/app/api/stripe-webhook/route.ts`
- Supports multiple webhook secrets (primary, secondary, tertiary)
- Handles: `checkout.session.completed`, `payment_intent.succeeded`, disputes
- Uses Firebase Admin SDK to record transactions server-side

### Authentication Flow

**User Types:**
- **Technician**: Service provider with username, business details, earnable balance
- **Customer/Client**: Sends appreciation, buys tokens
- **Admin**: Platform administrator (detected via `NEXT_PUBLIC_ADMIN_EMAIL`)

**Registration Paths:**
1. **Google OAuth** (Primary): `GoogleSignIn.tsx` → checks if user exists by `uniqueId` → redirects to registration if new
2. **Email/Password**: `Registration.tsx` → technicians require unique `username` (3-20 chars, alphanumeric + `-_`)
3. **Sign In**: `SignIn.tsx` → email/password or Google OAuth

**Auth Helpers:** `src/lib/firebase.ts` exports `authHelpers` object:
- `signUp()`, `signIn()`, `signOut()`, `sendPasswordResetEmail()`
- `onAuthStateChanged()` listener for real-time auth state

### Firestore Collections

**Core Collections:**
- `technicians` - Service provider profiles with business details, earnings, Stripe account ID
- `clients` - Customer profiles with appreciation counts
- `tokenBalances` - User token inventory (tokens, totalPurchased, totalSpent)
- `tokenTransactions` - All appreciation records (thank yous + TOA tokens)
- `dailyLimits` - Daily free thank you tracking per user per technician
- `tips` - Legacy payment transactions (deprecated but kept for migration)

**Transaction Types:**
- `thank_you` / `thankyou` / `appreciation` - Free thank you
- `toa` / `toa_token` - Paid token appreciation
- `token_purchase` - Token pack purchase

**Key Fields:**
- Technicians: `username` (unique, required), `stripeAccountId`, `totalEarnings`, `points`
- Transactions: `fromUserId`, `toTechnicianId`, `tokens`, `type`, `technicianPayout`, `platformFee`, `pointsAwarded`

### Dashboard Architecture

**Technician Dashboard** (`src/app/dashboard/page.tsx`):
- Profile editing with photo upload to Firebase Storage
- Earnings display: total earnings, available balance, tip count
- Transaction history: combines `tokenTransactions` + legacy `tips` collections
- Payout modal for withdrawals (minimum $1.00)
- Uses `useTechnicianEarnings` hook for real-time data

**Customer Dashboard:**
- Token balance display
- Transaction history (sent appreciations)
- Profile management

### API Route Organization

All routes in `src/app/api/`:

**Payment APIs:**
- `/create-payment-intent` - Create Stripe PaymentIntent for tips
- `/create-token-checkout` - Create Stripe CheckoutSession for token purchases
- `/verify-token-purchase` - Verify token purchase completion
- `/create-express-account` - Setup Stripe Express account for technician
- `/create-payout` - Initiate payout to technician

**Webhooks:**
- `/stripe-webhook` - Handle Stripe events

**Utilities:**
- `/auth/forgot-password` - Send password reset email
- `/contact` - Contact form submissions
- `/backfill-tip-totals` - Data migration utility
- `/fix-transaction-data` - Data repair utility

## Important Development Patterns

### Firebase Queries

Always use the client SDK for UI queries:

```typescript
import { db, collection, query, where, getDocs } from '@/lib/firebase';

const techsRef = collection(db, 'technicians');
const q = query(techsRef, where('isActive', '==', true));
const snapshot = await getDocs(q);
```

For real-time updates:

```typescript
import { onSnapshot } from 'firebase/firestore';

const unsubscribe = onSnapshot(docRef, (doc) => {
  setData(doc.data());
});
```

### Token Operations

Always use functions from `src/lib/token-firebase.ts`:

```typescript
import { sendTokens, getUserTokenBalance, checkDailyThankYouLimit } from '@/lib/token-firebase';

// Check balance before sending
const balance = await getUserTokenBalance(userId);
if (balance < tokens) throw new Error('Insufficient tokens');

// Send tokens (creates transaction, updates balances, awards points)
await sendTokens(fromUserId, toTechnicianId, tokens, message, type);
```

### Stripe Integration

Server-side only (API routes):

```typescript
import { getServerStripe, calculatePlatformFee, calculateTechnicianPayout } from '@/lib/stripe';

const stripe = getServerStripe();
const platformFee = calculatePlatformFee(amount); // Always $0.99
const technicianPayout = calculateTechnicianPayout(amount); // amount - $0.99
```

### Authentication Checks

In pages/components:

```typescript
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      // Fetch user profile from Firestore
    } else {
      router.push('/');
    }
  });
  return () => unsubscribe();
}, []);
```

### Path Aliases

TypeScript path aliases configured in `tsconfig.json`:

```typescript
import { db, auth } from '@/lib/firebase';
import { TokenPurchaseModal } from '@/components/TokenPurchaseModal';
```

## Data Migration & Backfill

The platform has evolved from a tip-based system to a token-based system. Key migration considerations:

- Legacy `tips` collection still exists and is displayed in dashboard transaction history
- `totalTipAmount` field on technicians includes both legacy tips and new token earnings
- Use `/api/backfill-tip-totals` for recalculating totals if data inconsistencies occur
- Use `/api/fix-transaction-data` for repairing malformed transaction records

## Security Considerations

- **Firebase Admin SDK**: Only use in server-side API routes, never client-side
- **Stripe Webhook Signature**: Always verify with `stripe.webhooks.constructEvent()`
- **Token Balance**: Only modify via server-side functions, never trust client balance
- **Daily Limits**: Enforced server-side in `token-firebase.ts`, not client-side
- **Content Security Policy**: Configured in `next.config.ts` for Stripe, Vercel Analytics

## Testing & Debugging

When debugging token or payment issues:

1. Check Firestore collections in Firebase Console
2. Verify Stripe webhook delivery in Stripe Dashboard
3. Check server logs for API route errors
4. Use `/api/brevo-status` to verify email service
5. Temporary debug scripts exist in root (e.g., `debug-charlie.js`, `fix-transaction-data.js`) - these are development artifacts, not production code

## Recent Changes (v2.1.x)

- v2.1.3: Restored missing technician dashboard functionality
- v2.1.2: Fixed technician dashboard earnings and token system
- v2.1.1: Cleaned up production console logs
- v2.1.0: Database architecture cleanup
- Previous: Fixed 'fromName undefined' FirebaseError in token transactions

Always check git history before making changes to understand recent fixes and avoid regressions.

## Common Gotchas

1. **Username vs Display Name**: Technicians have both `username` (unique, required) and `name`/`displayName` (friendly name). Username is used for profile URLs (`/[username]`).

2. **Transaction Types**: Multiple type strings exist for historical reasons (`thank_you`, `thankyou`, `appreciation`, `toa`, `toa_token`). Handle all variants when querying.

3. **Points vs Tokens**: Points are earned through activity (2 per token received, 10 per free thank you, 1 per token sent). Tokens are purchased or converted from points. They are separate systems.

4. **Firebase SDK Versions**: Using modular Firebase v12.3.0 (not compat mode). All imports use modular syntax: `import { getFirestore } from 'firebase/firestore'`.

5. **Next.js App Router**: Using Next.js 15 with App Router (not Pages Router). Pages in `src/app/`, API routes in `src/app/api/[route]/route.ts`.

6. **Stripe Connect**: Technicians need Stripe Express accounts for payouts. Account creation flow: `/api/create-express-account` → stores `stripeAccountId` in Firestore → used for transfers.

7. **Email Service**: Uses Brevo (formerly Sendinblue) for transactional emails. Email config in `src/lib/email.ts`. Test with `/api/brevo-test`.

## File Structure Reference

```
src/
├── lib/
│   ├── firebase.ts              # Client SDK, auth helpers, Firestore queries
│   ├── firebase-admin.js        # Server-side admin SDK (Node.js only)
│   ├── token-firebase.ts        # Token system core logic
│   ├── stripe.ts                # Stripe utilities & config
│   ├── tokens.ts                # Token types & constants
│   └── email.ts                 # Email service (Brevo)
├── app/
│   ├── page.tsx                 # Home page (technician rolodex)
│   ├── dashboard/page.tsx       # Protected dashboard
│   ├── [username]/page.tsx      # Dynamic technician profile
│   └── api/                     # API routes
├── components/
│   ├── AppreciationActions.tsx  # Thank You vs TOA token UI
│   ├── TokenPurchaseModal.tsx   # Token pack purchase
│   ├── TokenSendModal.tsx       # Send tokens
│   ├── PayoutModal.tsx          # Request payout
│   └── ...
└── hooks/
    └── useTechnicianEarnings.ts # Dashboard earnings hook
```
