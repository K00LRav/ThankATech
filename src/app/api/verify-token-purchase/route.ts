import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  console.log('🔍 Token purchase verification API called');
  
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY not configured');
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 500 }
    );
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-08-27.basil',
  });

  try {
    const { sessionId, userId } = await request.json();
    
    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'Missing sessionId or userId' },
        { status: 400 }
      );
    }

    console.log('🔍 Verifying session:', sessionId, 'for user:', userId);

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Verify the session was successful and belongs to this user
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }

    if (session.metadata?.userId !== userId) {
      return NextResponse.json(
        { error: 'Session does not belong to this user' },
        { status: 403 }
      );
    }

    if (session.metadata?.type !== 'token_purchase') {
      return NextResponse.json(
        { error: 'Not a token purchase session' },
        { status: 400 }
      );
    }

    console.log('✅ Session verified:', {
      sessionId,
      userId,
      tokens: session.metadata.tokens,
      amount: session.amount_total
    });

    // Add tokens to user's balance
    const tokensToAdd = parseInt(session.metadata.tokens || '0');
    const purchaseAmount = (session.amount_total || 0) / 100; // Convert from cents to dollars
    
    if (tokensToAdd > 0) {
      // For now, just return success - the client will handle token addition
      // This is a temporary solution until Firebase Admin SDK is properly configured
      console.log(`✅ Payment verified for ${tokensToAdd} tokens to user ${userId}`);
      console.log('💡 Note: Firebase Admin SDK not configured. Tokens will be added via client-side.');
      
      return NextResponse.json({
        success: true,
        tokens: tokensToAdd,
        amount: purchaseAmount,
        sessionId,
        requiresClientUpdate: true // Flag to indicate client should add tokens
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid token amount' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('❌ Token purchase verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}