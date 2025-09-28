import { NextRequest, NextResponse } from 'next/server';
import { getServerStripe, calculatePlatformFee, calculateTechnicianPayout } from '@/lib/stripe';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

    // Get technician's Stripe account ID from Firebase
    const techDoc = await getDoc(doc(db, 'technicians', technicianId));
    const techData = techDoc.data();

    if (!techData?.stripeAccountId) {
      return NextResponse.json(
        { error: 'Technician payment setup incomplete. Please ask them to set up their payment account.' },
        { status: 400 }
      );
    }

    // Check if technician's account can receive payments
    if (techData.stripeAccountStatus !== 'active') {
      return NextResponse.json(
        { error: 'Technician payment account is not ready to receive payments.' },
        { status: 400 }
      );
    }

    // Calculate fees
    const platformFee = calculatePlatformFee(amount);
    const technicianPayout = calculateTechnicianPayout(amount);

    // Get server-side Stripe instance
    const stripe = getServerStripe();

    // Create payment intent with direct payment to technician's Express account
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      application_fee_amount: platformFee, // Your platform fee
      transfer_data: {
        destination: techData.stripeAccountId, // Send to technician's account
      },
      metadata: {
        technicianId,
        customerId,
        platformFee: platformFee.toString(),
        technicianPayout: technicianPayout.toString(),
        type: 'tip',
      },
      description: `Tip for technician ${technicianId}`,
    });

    console.log(`Created payment intent for technician ${technicianId} (${techData.stripeAccountId}): $${amount/100}`);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      platformFee,
      technicianPayout,
      technicianAccountStatus: techData.stripeAccountStatus,
    });
  } catch (error) {
    console.error('Payment intent creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}