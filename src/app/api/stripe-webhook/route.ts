import { NextRequest, NextResponse } from 'next/server';
import { getServerStripe } from '@/lib/stripe';

// Webhook endpoint secrets for different webhook endpoints
const WEBHOOK_SECRETS = {
  primary: process.env.STRIPE_WEBHOOK_SECRET!, // whsec_TR33rSd8HNW8Tu2VgROXWJYW2wqICDxS
  secondary: process.env.STRIPE_WEBHOOK_SECRET_HIGH_PAYLOAD, // whsec_FQlOL2rBYk4aVkdCelzRpYFwVXHdUoHm
  tertiary: process.env.STRIPE_WEBHOOK_SECRET_MIN_PAYLOAD, // For third webhook if needed
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('Missing Stripe signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const stripe = getServerStripe();
    let event: any = null;
    let webhookType = 'unknown';

    // Try to verify with different webhook secrets
    for (const [type, secret] of Object.entries(WEBHOOK_SECRETS)) {
      if (!secret) continue;
      
      try {
        event = stripe.webhooks.constructEvent(body, signature, secret);
        webhookType = type;
        console.log(`✅ Webhook verified with ${type} secret`);
        break;
      } catch (err) {
        console.log(`❌ Failed to verify with ${type} secret:`, (err as Error).message);
        continue;
      }
    }

    if (!event) {
      console.error('❌ Webhook signature verification failed with all secrets');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log(`🔔 Webhook received: ${event.type} (verified with ${webhookType})`);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      case 'charge.dispute.created':
        await handleDispute(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePayment(event.data.object);
        break;
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionChange(event.data.object, event.type);
        break;
      
      default:
        console.log(`🤷 Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true, type: event.type, webhook: webhookType });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Handler functions for different event types
async function handlePaymentSuccess(paymentIntent: any) {
  console.log('💰 Payment succeeded:', paymentIntent.id);
  const { technicianId, customerId, platformFee, technicianPayout } = paymentIntent.metadata;
  
  try {
    // Update your database with successful payment
    // Add your Firebase/database logic here
    console.log(`✅ Processing tip: $${paymentIntent.amount / 100} to technician ${technicianId}`);
    
    // You can import and use your Firebase functions here
    // const { sendTip } = await import('@/lib/firebase');
    // await sendTip(technicianId, customerId, paymentIntent.amount, 'Stripe payment completed');
    
    // Log the transaction
    console.log(`Platform fee: $${platformFee / 100}, Technician payout: $${technicianPayout / 100}`);
    
  } catch (error) {
    console.error('❌ Error processing successful payment:', error);
  }
}

async function handlePaymentFailed(paymentIntent: any) {
  console.log('❌ Payment failed:', paymentIntent.id);
  const { technicianId, customerId } = paymentIntent.metadata;
  
  try {
    // Handle failed payment logic here
    // Maybe send notification to user about failed payment
    console.log(`Payment failed for tip to technician ${technicianId} from customer ${customerId}`);
  } catch (error) {
    console.error('❌ Error processing failed payment:', error);
  }
}

async function handleDispute(charge: any) {
  console.log('⚠️ Dispute created for charge:', charge.id);
  
  try {
    // Handle dispute logic here
    // Maybe notify admin or freeze payments
    console.log(`Dispute amount: $${charge.amount / 100}, Reason: ${charge.dispute?.reason}`);
  } catch (error) {
    console.error('❌ Error processing dispute:', error);
  }
}

async function handleInvoicePayment(invoice: any) {
  console.log('📄 Invoice payment succeeded:', invoice.id);
  
  try {
    // Handle subscription or invoice payments
    console.log(`Invoice paid: $${invoice.amount_paid / 100}`);
  } catch (error) {
    console.error('❌ Error processing invoice payment:', error);
  }
}

async function handleSubscriptionChange(subscription: any, eventType: string) {
  console.log(`📋 Subscription ${eventType}:`, subscription.id);
  
  try {
    // Handle subscription changes if you add subscription features later
    console.log(`Subscription status: ${subscription.status}`);
  } catch (error) {
    console.error('❌ Error processing subscription change:', error);
  }
}