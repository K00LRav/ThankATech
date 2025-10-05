import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  console.log('🔄 Token checkout API called');
  
  // Initialize Stripe inside the function to avoid build-time issues
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY environment variable not set');
    console.log('💡 For testing: Set STRIPE_SECRET_KEY in your environment variables');
    return NextResponse.json(
      { error: 'Stripe configuration missing. Please set STRIPE_SECRET_KEY environment variable.' },
      { status: 500 }
    );
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-08-27.basil',
  });
  try {
    const body = await request.json();
    console.log('📦 Request body:', body);
    
    const { packId, userId, tokens, price } = body;

    if (!packId || !userId || !tokens || !price) {
      console.error('❌ Missing parameters:', { packId, userId, tokens, price });
      return NextResponse.json(
        { error: 'Missing required parameters: packId, userId, tokens, price' },
        { status: 400 }
      );
    }

    // Create token pack object from provided data
    const tokenPack = {
      id: packId,
      tokens: tokens,
      price: price
    };
    
    if (!tokenPack) {
      return NextResponse.json(
        { error: 'Invalid token pack' },
        { status: 400 }
      );
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${tokenPack.tokens} ThankATech Tokens`,
              description: `Token pack - Send appreciation to technicians`,
              images: ['https://your-domain.com/token-icon.png'], // You can add a token icon
            },
            unit_amount: tokenPack.price, // Price is already in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?token_purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?token_purchase=cancelled`,
      metadata: {
        userId: userId,
        tokenPackId: tokenPack.id,
        tokens: tokenPack.tokens.toString(),
        type: 'token_purchase'
      },
      customer_email: undefined, // Let Stripe collect email
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating token checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}