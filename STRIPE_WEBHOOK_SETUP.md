# 🔗 Stripe Webhook Setup Guide for ThankATech

## Overview
Your ThankATech app now supports multiple Stripe webhooks for different payload types:
- **Primary webhook**: General payment events
- **High payload webhook**: Large transactions 
- **Minimum payload webhook**: Small transactions

## 🚀 Quick Setup

### Step 1: ✅ Webhook Secrets Configured!
Your webhook secrets are now properly configured in `.env.local`:

```bash
# ✅ CONFIGURED - Your actual webhook secrets
STRIPE_WEBHOOK_SECRET=whsec_TR33rSd8HNW8Tu2VgROXWJYW2wqICDxS
STRIPE_WEBHOOK_SECRET_HIGH_PAYLOAD=whsec_FQlOL2rBYk4aVkdCelzRpYFwVXHdUoHm
STRIPE_WEBHOOK_SECRET_MIN_PAYLOAD=whsec_THIRD_SECRET_IF_YOU_HAVE_ONE
```

### Step 2: Set Up Webhooks in Stripe Dashboard

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/webhooks
2. **Create webhooks** for each endpoint you need:

#### Primary Webhook (General Events)
- **Endpoint URL**: `https://yourdomain.com/api/stripe-webhook`
- **Events to send**:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `charge.dispute.created`

#### High Payload Webhook (Large Transactions)
- **Endpoint URL**: `https://yourdomain.com/api/stripe-webhook` (same endpoint)
- **Events to send**:
  - `payment_intent.succeeded` (for tips > $50)
  - `invoice.payment_succeeded`
  - Custom events for high-value transactions

#### Minimum Payload Webhook (Small Transactions)  
- **Endpoint URL**: `https://yourdomain.com/api/stripe-webhook` (same endpoint)
- **Events to send**:
  - `payment_intent.succeeded` (for tips < $10)
  - Micro-transactions events

### Step 3: Test Your Webhooks

The webhook handler will automatically:
- ✅ Try each webhook secret until one works
- ✅ Log which webhook type was used
- ✅ Process the payment data
- ✅ Update your Firebase database

## 🔧 Webhook Event Handling

Your webhook now handles these events:

| Event Type | Description | Action |
|------------|-------------|--------|
| `payment_intent.succeeded` | Tip payment completed | Updates technician points & tips |
| `payment_intent.payment_failed` | Payment failed | Logs failure & notifies user |
| `charge.dispute.created` | Customer disputed payment | Logs dispute for review |
| `invoice.payment_succeeded` | Subscription payment | Handles recurring payments |
| `customer.subscription.*` | Subscription changes | Future feature support |

## 🎯 Testing

1. **Use Stripe CLI** to test webhooks locally:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe-webhook
   ```

2. **Test with different secrets**:
   ```bash
   stripe trigger payment_intent.succeeded
   ```

3. **Check your console logs** - you'll see:
   ```
   ✅ Webhook verified with primary secret
   🔔 Webhook received: payment_intent.succeeded (verified with primary)
   💰 Payment succeeded: pi_1234567890
   ```

## 🚨 Security Notes

- ✅ Webhook signature verification with multiple secrets
- ✅ Automatic secret detection and validation  
- ✅ Detailed logging for debugging
- ✅ Error handling for failed webhooks
- ✅ HTTPS required for production webhooks

## 🔍 Troubleshooting

**If webhooks fail:**
1. Check your `.env.local` has correct webhook secrets
2. Verify your domain is accessible from Stripe
3. Check console logs for verification errors
4. Test with Stripe CLI first

**Common issues:**
- Wrong webhook secret → `Invalid signature` error
- Missing events → Check Stripe Dashboard webhook configuration
- Network issues → Ensure your app is deployed and accessible

## 📱 Integration with ThankATech

Your webhook automatically integrates with:
- 🔥 **Firebase**: Updates technician tips and points
- 💰 **Platform fees**: Calculates and tracks commission
- 👤 **User stats**: Updates customer and technician records
- 📊 **Analytics**: Logs all payment events

Ready to test! 🚀