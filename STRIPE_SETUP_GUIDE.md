# 🧪 Stripe Test Setup Guide

## Step 1: Get Your Stripe Test Keys

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/
2. **Switch to Test Mode**: Toggle the "Test mode" switch in the top-right corner
3. **Get Test API Keys**:
   - Go to **Developers** → **API keys**
   - Copy your **Publishable key** (starts with `pk_test_`)
   - Click "Reveal test key" for **Secret key** (starts with `sk_test_`)

## Step 2: Set Up Test Webhooks (Optional for Express Testing)

1. **Go to Webhooks**: **Developers** → **Webhooks** → **Add endpoint**
2. **Endpoint URL**: `http://localhost:3000/api/stripe-webhook`
3. **Events to send**:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed` 
   - `account.updated`
   - `capability.updated`
4. **Copy webhook secret** (starts with `whsec_`)

## Step 3: Update .env.local

Replace the placeholder values in `.env.local`:

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_TEST_KEY
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_TEST_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_TEST_WEBHOOK_SECRET
```

## Step 4: Test the Express Flow

1. **Start dev server**: `npm run dev`
2. **Register as technician** 
3. **Go to dashboard** → Click "Connect Bank Account"
4. **Complete Stripe Express onboarding** (use test data)
5. **Test tipping flow** with test cards

## Test Card Numbers

- **Success**: `4242424242424242`
- **Decline**: `4000000000000002`
- **3D Secure**: `4000002500003155`

## When Ready for Live

1. Switch Stripe dashboard to **Live mode**
2. Get live API keys (pk_live_, sk_live_)
3. Comment out test keys, uncomment live keys in `.env.local`
4. Update webhook endpoints to production domain
5. Complete Stripe Express platform application (if required)

## 🚨 Important Notes

- **Test Mode**: Stripe Express onboarding uses fake data, no real money moves
- **Live Mode**: Requires real identity verification and bank accounts
- **Platform Requirements**: Some Express features may require Stripe approval