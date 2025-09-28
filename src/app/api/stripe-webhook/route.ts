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
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 503 }
      );
    }
    
    let event: any = null;
    let webhookType = 'unknown';

    // Try to verify with different webhook secrets
    for (const [type, secret] of Object.entries(WEBHOOK_SECRETS)) {
      if (!secret) continue;
      
      try {
        event = stripe.webhooks.constructEvent(body, signature, secret);
        webhookType = type;
        break;
      } catch (err) {
        continue;
      }
    }

    if (!event) {
      console.error('❌ Webhook signature verification failed with all secrets');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }


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
  const { technicianId, customerId, customerName, customerEmail, platformFee, technicianPayout, type } = paymentIntent.metadata;
  
  // Debug: Log received metadata
  
  try {
    // Only process tip payments
    if (type === 'tip') {
      
      // Import Firebase functions and calculate fees if missing
      const { recordTransaction, getTechnician, getUser } = await import('@/lib/firebase');
      const { calculatePlatformFee, calculateTechnicianPayout } = await import('@/lib/stripe');
      
      // Get technician and customer details
      const technician = await getTechnician(technicianId) as any;
      const customer = customerId ? await getUser(customerId) as any : null;
      
      // Parse fees from metadata, or calculate if missing
      const parsedPlatformFee = parseInt(platformFee) || calculatePlatformFee(paymentIntent.amount);
      const parsedTechnicianPayout = parseInt(technicianPayout) || calculateTechnicianPayout(paymentIntent.amount);
      
      // Record the transaction in Firebase
      const transactionData = {
        amount: paymentIntent.amount, // Amount in cents
        technicianId: technicianId,
        technicianEmail: technician?.email,
        technicianName: technician?.name || technician?.businessName,
        customerId: customerId || null,
        customerEmail: customerEmail || customer?.email,
        customerName: customerName || customer?.name || customer?.displayName || 'Anonymous',
        paymentIntentId: paymentIntent.id,
        platformFee: parsedPlatformFee,
        technicianPayout: parsedTechnicianPayout,
        status: 'completed',
        paymentMethod: paymentIntent.metadata.paymentMethod || 'unknown',
        createdAt: new Date().toISOString(),
        description: `Tip payment via Stripe`
      };
      
      await recordTransaction(transactionData);
      
    } else {
    }
    
  } catch (error) {
    console.error('❌ Error processing successful payment:', error);
  }
}

async function handlePaymentFailed(paymentIntent: any) {
  const { technicianId, customerId } = paymentIntent.metadata;
  
  try {
    // Handle failed payment logic here
    // Maybe send notification to user about failed payment
  } catch (error) {
    console.error('❌ Error processing failed payment:', error);
  }
}

async function handleDispute(charge: any) {
  
  try {
    // Handle dispute logic here
    // Maybe notify admin or freeze payments
  } catch (error) {
    console.error('❌ Error processing dispute:', error);
  }
}

async function handleInvoicePayment(invoice: any) {
  
  try {
    // Handle subscription or invoice payments
  } catch (error) {
    console.error('❌ Error processing invoice payment:', error);
  }
}

async function handleSubscriptionChange(subscription: any, eventType: string) {
  
  try {
    // Handle subscription changes if you add subscription features later
  } catch (error) {
    console.error('❌ Error processing subscription change:', error);
  }
}
