# Stripe Connect Setup Guide for ThankATech

## Overview
ThankATech uses **Stripe Connect** with **Express Accounts** to enable technicians to receive payouts directly to their bank accounts.

## Architecture

```
Customer → ThankATech Platform → Stripe Connect → Technician Bank Account
           (Stripe Account)       (Express Account)
```

### Payment Flow:
1. Customer purchases TOA tokens via Stripe Checkout
2. Funds go to ThankATech's main Stripe account
3. When customer sends TOA to technician, 85% is tracked as earnings
4. Technician requests payout through dashboard
5. Platform creates Stripe Transfer to technician's Express Account
6. Funds arrive in technician's bank account

---

## Setup Steps

### 1. Enable Stripe Connect

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Connect** → **Settings**
3. Enable **Connect** for your account
4. Choose **Express** as your account type

### 2. Configure Connect Settings

**Branding:**
- Set your business name: "ThankATech"
- Upload logo (if available)
- Set brand colors

**Account Types:**
- Enable: **Express Accounts** (recommended)
- Disable: Standard and Custom accounts (not needed)

**Capabilities:**
- ✅ Transfers (required)
- ❌ Card payments (not needed - we handle on platform)

### 3. Environment Variables

Add to your `.env.local`:

```bash
# Stripe API Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # or pk_live_...
STRIPE_SECRET_KEY=sk_test_...                    # or sk_live_...

# Firebase Admin (for server-side operations)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 4. Test Mode vs Live Mode

**Test Mode** (Development):
- Use `sk_test_` and `pk_test_` keys
- Test bank accounts:
  - Routing: `110000000`
  - Account: `000123456789`
- Payouts are simulated, no real money

**Live Mode** (Production):
- Use `sk_live_` and `pk_live_` keys
- Real bank accounts required
- Identity verification required
- Payouts process real money

---

## How It Works

### Creating Express Accounts

When a technician first requests a payout:

```typescript
// API: /api/create-payout
1. Check if technician has stripeAccountId in Firestore
2. If not, create Express Account:
   - Type: 'express'
   - Country: 'US'
   - Capabilities: transfers
3. Save stripeAccountId to technician profile
4. Add bank account to Express Account
5. Create transfer
```

### Bank Account Linking

Technicians provide:
- Routing number (9 digits)
- Account number (up to 17 digits)
- Account type (checking/savings)

```typescript
// Stripe validates the bank account
stripe.accounts.createExternalAccount(stripeAccountId, {
  external_account: {
    object: 'bank_account',
    routing_number: '110000000',
    account_number: '000123456789',
    account_holder_type: 'individual',
  }
});
```

### Transfer Process

```typescript
// Create transfer from platform to technician
const transfer = await stripe.transfers.create({
  amount: netAmount,  // in cents
  currency: 'usd',
  destination: stripeAccountId,
  description: 'ThankATech payout',
});
```

---

## Payout Options

### Standard Payout (Free)
- **Fee:** $0
- **Arrival:** 1-2 business days
- **Best for:** Most payouts

### Express Payout ($0.50 fee)
- **Fee:** $0.50
- **Arrival:** ~30 minutes
- **Best for:** Urgent needs

---

## Firestore Structure

### Technicians Collection
```typescript
{
  id: "tech123",
  name: "John Doe",
  email: "john@example.com",
  stripeAccountId: "acct_1234567890",  // Stripe Express Account
  stripeAccountStatus: "active",
  totalEarnings: 42.50,  // Available balance
  lastPayoutDate: "2025-11-12T10:00:00Z",
}
```

### Payouts Collection
```typescript
{
  id: "payout123",
  transferId: "tr_1234567890",  // Stripe Transfer ID
  technicianId: "tech123",
  stripeAccountId: "acct_1234567890",
  amount: 1000,  // $10.00 in cents
  fee: 0,  // Standard = free, Express = 50
  netAmount: 1000,
  method: "standard",
  status: "pending",
  createdAt: "2025-11-12T10:00:00Z",
  estimatedArrival: "2025-11-14T10:00:00Z",
}
```

---

## Testing

### Test Bank Accounts (Stripe Test Mode)

**Valid US Bank Account:**
- Routing: `110000000`
- Account: `000123456789`
- Result: Success

**Invalid Routing Number:**
- Routing: `111111111`
- Account: `000123456789`
- Result: Error (invalid routing)

**Insufficient Balance Simulation:**
- Routing: `110000000`
- Account: `000999999999`
- Result: Transfer succeeds but shows as failed

### Testing Flow

1. **Create Test Technician:**
   ```bash
   - Register as technician
   - Receive some TOA tokens
   - Check earnings in dashboard
   ```

2. **Request Test Payout:**
   ```bash
   - Click "Request Payout"
   - Enter amount ($1.00 minimum)
   - Add test bank account
   - Choose Standard (free)
   - Submit
   ```

3. **Verify in Stripe Dashboard:**
   ```bash
   - Go to Connect → Accounts
   - Find newly created Express Account
   - Check Transfers tab
   - See pending transfer
   ```

4. **Check Firestore:**
   ```bash
   - Open Firebase Console
   - Check payouts collection
   - Verify payout record created
   ```

---

## Production Checklist

Before going live:

- [ ] Switch to live Stripe keys (`sk_live_`, `pk_live_`)
- [ ] Enable identity verification for Express Accounts
- [ ] Set up Stripe webhooks for transfer status updates
- [ ] Test with real bank account (use your own first)
- [ ] Configure payout schedule (daily, weekly, etc.)
- [ ] Set minimum payout amounts ($1, $5, $10, etc.)
- [ ] Add payout history to technician dashboard
- [ ] Implement email notifications for successful payouts
- [ ] Set up error handling for failed transfers
- [ ] Add support for multiple currencies (if international)

---

## Security Considerations

### Bank Account Data
- ✅ Never store raw bank account numbers in Firestore
- ✅ Stripe handles all sensitive bank data
- ✅ Only store Stripe tokens/IDs
- ✅ Use HTTPS for all API calls
- ✅ Validate amounts server-side

### Express Accounts
- ✅ One Express Account per technician
- ✅ Store `stripeAccountId` in Firestore
- ✅ Check account status before transfers
- ✅ Handle account verification failures gracefully

---

## Common Issues & Solutions

### Issue: "Invalid routing number"
**Solution:** Verify routing number is 9 digits and valid US routing number

### Issue: "Insufficient balance"
**Solution:** Ensure platform has funds in Stripe balance for transfers

### Issue: "Account not enabled for transfers"
**Solution:** Wait for Express Account approval (test mode = instant)

### Issue: "Transfer failed"
**Solution:** Check Stripe Dashboard for detailed error, verify bank account

---

## API Endpoints

### Create Express Account
```bash
POST /api/create-express-account
Body: { technicianId, email, returnUrl, refreshUrl }
Response: { accountId, onboardingUrl }
```

### Create Payout
```bash
POST /api/create-payout
Body: { 
  amount: 1000,  # in cents
  technicianId: "tech123",
  method: "standard",
  bankAccount: { routingNumber, accountNumber, accountType }
}
Response: { success, payout, message }
```

---

## Support Resources

- [Stripe Connect Docs](https://stripe.com/docs/connect)
- [Express Accounts Guide](https://stripe.com/docs/connect/express-accounts)
- [Bank Account Verification](https://stripe.com/docs/connect/bank-account-verification)
- [Testing Bank Accounts](https://stripe.com/docs/connect/testing)
- [Stripe Support](https://support.stripe.com/)

---

## Next Steps

1. ✅ Complete this setup guide
2. ⏳ Test payout flow in development
3. ⏳ Add payout history to dashboard
4. ⏳ Implement webhook handlers for status updates
5. ⏳ Deploy to production with live keys
