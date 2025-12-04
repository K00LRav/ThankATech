# Token Refund System

## Overview
Automated system to handle Stripe refunds and chargebacks by subtracting tokens from user balances.

## How It Works

### 1. **Automatic Refunds (Stripe Webhook)**
When a customer requests a refund through Stripe:

1. **Stripe processes the refund** → Money returned to customer
2. **Webhook receives `charge.refunded` event**
3. **System finds the original token purchase**
4. **Tokens are subtracted from user's balance**
5. **Refund transaction is recorded**
6. **If balance goes negative → Admin alert email sent**

### 2. **Manual Refunds (Admin Panel)**
Admins can manually process token refunds:

1. Go to **Admin Panel** → **Token Management** → **Process Refunds**
2. Enter:
   - User ID (Firebase Auth UID)
   - Number of tokens to refund
   - Reason (optional)
3. System immediately deducts tokens
4. **Note**: Stripe refund must still be processed separately in Stripe Dashboard

### 3. **Chargebacks/Disputes**
When a customer files a dispute:

1. **Webhook receives `charge.dispute.created` event**
2. **Dispute is logged in Firestore** (`disputes` collection)
3. **Admin is notified** (TODO: implement email notification)
4. **If dispute is lost** (`charge.dispute.closed` with status `lost`):
   - Tokens are automatically refunded
   - Same process as regular refund

## Database Structure

### New Collections

#### `disputes`
```typescript
{
  chargeId: string;           // Stripe charge ID
  paymentIntentId: string;    // Associated payment intent
  userId: string;             // User who made the purchase
  tokens: number;             // Tokens involved
  amount: number;             // Dollar amount (in cents)
  reason: string;             // Dispute reason
  status: 'open' | 'lost' | 'won' | 'closed';
  createdAt: string;
  closedAt?: string;
}
```

### Updated Collections

#### `tokenBalances` (new field)
```typescript
{
  // ... existing fields
  totalRefunded: number;      // NEW: Total tokens refunded
}
```

#### `tokenTransactions` (new type)
```typescript
{
  type: 'token_refund';       // NEW type
  tokens: number;             // NEGATIVE value (e.g., -100)
  dollarValue: number;        // NEGATIVE value (e.g., -10.00)
  stripePaymentIntentId: string;
  refundReason: string;
  createdNegativeBalance: boolean;
}
```

## Negative Balance Handling

### What Happens?
If a user purchased 100 tokens, spent 80, then got refunded:
- Balance before refund: **20 tokens**
- Refund amount: **100 tokens**
- Balance after refund: **-80 tokens** ⚠️

### Detection
- System automatically detects negative balances
- Flags the refund transaction with `createdNegativeBalance: true`
- Sends admin alert email immediately

### Admin Actions Needed
When negative balance occurs:

1. **Review user activity**
   - Check `tokenTransactions` collection
   - See where they spent the tokens
   - Determine if fraud or legitimate use

2. **Possible Actions**:
   - **If legitimate**: Accept the negative balance (user won't be able to send tokens until positive)
   - **If fraud**: Suspend account, contact technicians who received tokens
   - **Contact user**: Request payment for tokens already used

3. **Prevention**:
   - Block token sending when balance < 0
   - Consider adding refund policy (e.g., "Refunds only for unspent tokens")

## Webhook Events Handled

| Event | Action | Result |
|-------|--------|--------|
| `charge.refunded` | Subtract tokens from balance | Refund transaction created |
| `charge.dispute.created` | Log dispute | Dispute record created |
| `charge.dispute.closed` (lost) | Subtract tokens if lost | Refund transaction created |
| `charge.dispute.closed` (won) | Update dispute status | No token change |

## Configuration

### Stripe Webhook Setup
Add these events to your Stripe webhook:
- `charge.refunded`
- `charge.dispute.created`
- `charge.dispute.closed`

### Environment Variables
```bash
ADMIN_EMAIL=admin@thankatech.com  # Receives negative balance alerts
```

## Admin API Endpoints

### POST `/api/admin/process-refund`
Manually process a token refund.

**Request:**
```json
{
  "userId": "firebase_auth_uid",
  "tokensToRefund": 100,
  "refundAmount": 10.00,
  "reason": "Customer request",
  "adminId": "admin_firebase_uid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Refunded 100 tokens for user xyz...",
  "newBalance": -20,
  "negativeBalance": true
}
```

## Testing

### Test Refund Flow
1. **Make a test purchase**:
   - Buy tokens in test mode
   - Note the Payment Intent ID

2. **Process refund in Stripe Dashboard**:
   - Go to Payments → Find payment → Refund
   - Webhook will trigger automatically

3. **Verify**:
   - Check user's `tokenBalances` document
   - Check `tokenTransactions` for refund entry
   - If negative balance, check admin email

### Test Manual Refund
1. Go to Admin Panel (must be logged in as admin)
2. Click "Process Refunds"
3. Enter test user ID and token amount
4. Verify balance updated in Firestore

## Future Improvements

1. **Admin Dashboard**:
   - View all refunds in one place
   - Filter by negative balance
   - Export refund reports

2. **User Notifications**:
   - Email users when refund is processed
   - Show refund in transaction history

3. **Fraud Prevention**:
   - Auto-suspend accounts with negative balance
   - Flag users with multiple refunds
   - Block token sending when balance < 0

4. **Partial Refunds**:
   - Allow refunding less than full purchase amount
   - Prorate token deduction

5. **Refund Policies**:
   - Time limits (e.g., "No refunds after 30 days")
   - Usage limits (e.g., "No refunds if >50% tokens spent")

## Troubleshooting

### Webhook Not Working
1. Check webhook endpoint: `https://yourdomain.com/api/stripe-webhook`
2. Verify webhook secret in `.env.local`
3. Check Stripe webhook logs for errors
4. Test locally with Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe-webhook`

### Refund Not Subtracting Tokens
1. Check Firestore logs for errors
2. Verify `stripeSessionId` matches in `tokenTransactions`
3. Check if refund was already processed (duplicate prevention)

### Negative Balance Email Not Sending
1. Verify `ADMIN_EMAIL` environment variable set
2. Check Brevo API key configured
3. Review server logs for email errors

## Security Considerations

1. **Admin Authentication**: Currently minimal - implement proper admin role verification
2. **Rate Limiting**: Add rate limiting to prevent refund abuse
3. **Audit Trail**: All refunds are logged with timestamp and admin ID
4. **Duplicate Prevention**: System prevents processing same refund twice
