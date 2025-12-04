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
      
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      
      case 'charge.refunded':
        await handleRefund(event.data.object);
        break;
      
      case 'charge.dispute.created':
        await handleDispute(event.data.object);
        break;
      
      case 'charge.dispute.closed':
        await handleDisputeClosed(event.data.object);
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
      const { recordTransaction, getTechnician, getClient } = await import('@/lib/firebase');
      const { calculatePlatformFee, calculateTechnicianPayout } = await import('@/lib/stripe');
      
      // Get technician and customer details
      const technician = await getTechnician(technicianId) as any;
      const customer = customerId ? await getClient(customerId) as any : null;
      
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
  console.log('🚨 Dispute created:', charge.id);
  
  try {
    // Get payment intent to find associated purchase
    const paymentIntentId = charge.payment_intent;
    
    // Check if this was a token purchase
    const { getFirestore } = await import('firebase-admin/firestore');
    const db = getFirestore();
    
    const txQuery = db
      .collection('tokenTransactions')
      .where('stripeSessionId', '==', paymentIntentId)
      .limit(1);
    
    const txSnapshot = await txQuery.get();
    
    if (!txSnapshot.empty) {
      const tx = txSnapshot.docs[0].data();
      
      // Create dispute record
      await db.collection('disputes').add({
        chargeId: charge.id,
        paymentIntentId,
        userId: tx.fromUserId,
        tokens: tx.tokens,
        amount: charge.amount,
        reason: charge.dispute?.reason || 'unknown',
        status: 'open',
        createdAt: new Date().toISOString(),
      });
      
      console.log(`🚨 Dispute logged for user ${tx.fromUserId} - ${tx.tokens} tokens`);
      
      // TODO: Send admin notification email about dispute
    }
  } catch (error) {
    console.error('❌ Error processing dispute:', error);
  }
}

async function handleDisputeClosed(charge: any) {
  console.log('⚖️ Dispute closed:', charge.id, 'Status:', charge.dispute?.status);
  
  try {
    const { getFirestore } = await import('firebase-admin/firestore');
    const db = getFirestore();
    
    // Update dispute record
    const disputeQuery = db
      .collection('disputes')
      .where('chargeId', '==', charge.id)
      .limit(1);
    
    const disputeSnapshot = await disputeQuery.get();
    
    if (!disputeSnapshot.empty) {
      const disputeRef = disputeSnapshot.docs[0].ref;
      await disputeRef.update({
        status: charge.dispute?.status || 'closed',
        closedAt: new Date().toISOString(),
      });
      
      // If dispute was lost (customer won), process refund
      if (charge.dispute?.status === 'lost') {
        console.log('❌ Dispute lost - processing token refund');
        await handleRefund(charge);
      }
    }
  } catch (error) {
    console.error('❌ Error processing dispute closure:', error);
  }
}

async function handleRefund(charge: any) {
  console.log('💰 Refund processed:', charge.id);
  
  try {
    const paymentIntentId = charge.payment_intent;
    const refundAmount = charge.amount_refunded / 100; // Convert cents to dollars
    
    // Find the original token purchase
    const { getFirestore } = await import('firebase-admin/firestore');
    const db = getFirestore();
    
    // Look for token purchase by session ID or payment intent
    const txQuery = db
      .collection('tokenTransactions')
      .where('type', '==', 'token_purchase')
      .where('stripeSessionId', '==', paymentIntentId)
      .limit(1);
    
    const txSnapshot = await txQuery.get();
    
    if (txSnapshot.empty) {
      console.warn(`⚠️ No token purchase found for payment intent: ${paymentIntentId}`);
      return;
    }
    
    const purchaseTx = txSnapshot.docs[0].data();
    const userId = purchaseTx.fromUserId;
    const tokensToRefund = purchaseTx.tokens;
    
    // Process the token refund
    const { processTokenRefund } = await import('@/lib/token-admin');
    const result = await processTokenRefund(
      userId,
      tokensToRefund,
      refundAmount,
      paymentIntentId,
      charge.refund?.reason || 'Stripe refund processed'
    );
    
    if (result.success) {
      console.log(`✅ Token refund completed: ${tokensToRefund} tokens for user ${userId}`);
      
      if (result.negativeBalance) {
        console.warn(`⚠️ USER ${userId} NOW HAS NEGATIVE BALANCE - Manual review needed`);
        
        // TODO: Send admin alert email about negative balance
        try {
          const EmailService = (await import('@/lib/email')).default;
          await EmailService.sendRawEmail(
            process.env.ADMIN_EMAIL || 'admin@thankatech.com',
            '🚨 ALERT: Negative Token Balance Detected',
            `
              <h2>Negative Balance Alert</h2>
              <p>User ${userId} now has a negative token balance after refund.</p>
              <ul>
                <li><strong>Tokens Refunded:</strong> ${tokensToRefund}</li>
                <li><strong>Amount:</strong> $${refundAmount.toFixed(2)}</li>
                <li><strong>Payment Intent:</strong> ${paymentIntentId}</li>
              </ul>
              <p><strong>Action Required:</strong> Review user activity and consider account restrictions.</p>
            `
          );
        } catch (emailError) {
          console.error('❌ Failed to send negative balance alert:', emailError);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error processing refund:', error);
  }
}

async function handleInvoicePayment(invoice: any) {
  
  try {
    // Handle subscription or invoice payments
  } catch (error) {
    console.error('❌ Error processing invoice payment:', error);
  }
}

async function handleCheckoutCompleted(session: any) {
  try {
    const { userId, tokenPackId, tokens, type } = session.metadata;
    
    // Handle token purchases
    if (type === 'token_purchase' && userId && tokens) {
      // Import server-side token functions
      const { addTokensToBalance } = await import('@/lib/token-admin');
      const EmailService = (await import('@/lib/email')).default;
      
      // Add tokens to user's balance
      const tokensToAdd = parseInt(tokens);
      const purchaseAmount = session.amount_total / 100; // Convert from cents to dollars
      
      await addTokensToBalance(userId, tokensToAdd, purchaseAmount, session.id);
      
      console.log(`✅ Token purchase completed: ${tokensToAdd} tokens for user ${userId}`);
      
      // Send purchase confirmation email
      try {
        // Get user email from session or fetch from database
        const customerEmail = session.customer_email || session.customer_details?.email;
        const customerName = session.customer_details?.name || 'Customer';
        
        if (customerEmail) {
          await EmailService.sendTokenPurchaseConfirmation(
            customerEmail,
            customerName,
            tokensToAdd,
            purchaseAmount,
            session.id
          );
          console.log(`✅ Purchase confirmation email sent to ${customerEmail}`);
        } else {
          console.warn(`⚠️ No customer email found for session ${session.id}`);
        }
      } catch (emailError) {
        console.error('❌ Failed to send purchase confirmation email:', emailError);
        // Don't fail the webhook if email fails
      }
    }
    
  } catch (error) {
    console.error('❌ Error processing checkout completion:', error);
  }
}

async function handleSubscriptionChange(subscription: any, eventType: string) {
  
  try {
    // Handle subscription changes if you add subscription features later
  } catch (error) {
    console.error('❌ Error processing subscription change:', error);
  }
}
