import { NextRequest, NextResponse } from 'next/server';
import { getServerStripe, calculatePlatformFee, calculateTechnicianPayout } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { amount, technicianId, customerId } = await request.json();

    // Validate input
    if (!amount || !technicianId || !customerId) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, technicianId, customerId' },
        { status: 400 }
      );
    }

    // Validate amount (minimum $1, maximum $500)
    if (amount < 100 || amount > 50000) {
      return NextResponse.json(
        { error: 'Amount must be between $1.00 and $500.00' },
        { status: 400 }
      );
    }

    // Calculate fees
    const platformFee = calculatePlatformFee(amount);
    const technicianPayout = calculateTechnicianPayout(amount);

    // Get server-side Stripe instance
    const stripe = getServerStripe();

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: {
        technicianId,
        customerId,
        platformFee: platformFee.toString(),
        technicianPayout: technicianPayout.toString(),
      },
      description: `Tip for technician ${technicianId}`,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      platformFee,
      technicianPayout,
    });
  } catch (error) {
    console.error('Payment intent creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}