import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  // Initialize Stripe inside the function to avoid build-time issues
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: 'Stripe configuration missing' },
      { status: 500 }
    );
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-08-27.basil',
  });
  try {
    const { tokenPackId, userId } = await request.json();

    if (!tokenPackId || !userId) {
      return NextResponse.json(
        { error: 'Missing tokenPackId or userId' },
        { status: 400 }
      );
    }

    // Get token pack details (we'll import from tokens.ts)
    const { TOKEN_PACKS } = await import('@/lib/tokens');
    const tokenPack = TOKEN_PACKS.find(pack => pack.id === tokenPackId);
    
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
            unit_amount: tokenPack.price * 100, // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?token_purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?token_purchase=cancelled`,
      metadata: {
        userId: userId,
        tokenPackId: tokenPackId,
        tokens: tokenPack.tokens.toString(),
        type: 'token_purchase'
      },
      customer_email: undefined, // Let Stripe collect email
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating token checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}