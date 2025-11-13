# 🚀 Live Stripe Launch Guide

## Prerequisites

### Set Up Environment Variables

1. **Copy the template file:**
   ```bash
   copy .env.local.template .env.local
   ```

2. **Fill in your Firebase credentials:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Go to Project Settings → General
   - Scroll to "Your apps" section
   - Copy all the config values into `.env.local`

3. **Add your Stripe keys:**
   - Get from [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
   - Start with test keys, will switch to live later

**Your `.env.local` should look like:**
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Pre-Launch Checklist

### 1. Backup Test Data (Optional)
```bash
npm run export-test-data
```
This creates a backup of all test transactions in `backups/` folder.

### 2. Reset Database for Live Launch
```bash
npm run reset-for-live
```

**What this script does:**
- ✅ Deletes all token transactions
- ✅ Resets all token balances to 0
- ✅ Deletes all thank you transactions
- ✅ Resets client statistics (totalTipsSent, totalSpent, totalThankYous, points)
- ✅ Resets technician statistics (totalTips, totalThankYous, points)
- ✅ **PRESERVES** your client and technician accounts
- ✅ Skips all mock data

**After running this:**
- Your admin dashboard will show all zeros
- Your accounts (Ravin as client, Charlie as technician) will still exist
- You can log in with the same credentials
- Ready for first real transaction!

### 3. Switch to Live Stripe Keys

Update your `.env.local` file:

```env
# REMOVE test keys:
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
# STRIPE_SECRET_KEY=sk_test_...

# ADD live keys:
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_LIVE_WEBHOOK_SECRET
```

### 4. Update Stripe Webhook for Production

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://www.thankatech.com/api/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
4. Copy the webhook signing secret
5. Update `STRIPE_WEBHOOK_SECRET` in your `.env.local`

### 5. Test First Live Transaction

1. **As Client (Ravin):**
   - Purchase 100 TOA tokens with real card
   - Verify tokens appear in your balance

2. **Send TOA to Technician (Charlie):**
   - Send 50 TOA to Charlie
   - Verify transaction appears in both dashboards

3. **Check Admin Panel:**
   - Token Economy Analytics should show:
     - Tokens Purchased: 100
     - Tokens Spent: 50
     - Tokens in Circulation: 50
   - Verify revenue calculations are correct

### 6. Monitor for Issues

Watch for:
- Stripe payment confirmations
- Email notifications being sent
- Admin analytics updating correctly
- No "Unknown User" or placeholder text
- Correct TOA to dollar conversions ($0.01/TOA, 85%/15% split)

---

## Rollback Plan

If you need to go back to test mode:

1. Switch back to test Stripe keys in `.env.local`
2. Your live transactions are preserved in Firebase
3. You can continue testing without affecting live data

---

## Important Notes

⚠️ **Before running reset:**
- Make sure you're okay losing all test transaction history
- Consider running `npm run export-test-data` first for backup
- This is **irreversible** - test data will be permanently deleted

✅ **Safe to reset:**
- Your user accounts are preserved
- Your profile information stays intact
- You can log in immediately after reset
- Mock data is automatically skipped

🎯 **After reset, your database will show:**
```
Token Economy:
- Tokens Purchased: 0
- Tokens Spent: 0
- Tokens in Circulation: 0

Your Accounts:
- Client: Ravin (balance: 0 TOA)
- Technician: Charlie (balance: 0 TOA)
```

---

## Commands Summary

```bash
# 1. (Optional) Backup test data
npm run export-test-data

# 2. Reset database for live launch
npm run reset-for-live

# 3. Restart dev server with new Stripe keys
npm run dev
```

---

## Support

If anything goes wrong:
1. Check Firebase console for data integrity
2. Check Stripe dashboard for payment status
3. Check Vercel logs for API errors
4. Admin panel should show accurate analytics

Good luck with your launch! 🚀
