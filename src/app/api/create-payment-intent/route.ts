// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getServerStripe, calculatePlatformFee, calculateTechnicianPayout } from '@/lib/stripe';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { amount, technicianId, customerId, customerName, customerEmail } = await request.json();

    // Debug: Log received customer data

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

    // Calculate fees
    const platformFee = calculatePlatformFee(amount);
    const technicianPayout = calculateTechnicianPayout(amount);

    // Get server-side Stripe instance
    const stripe = getServerStripe();

    // Check if technician has Express account set up
    if (techData?.stripeAccountId && techData.stripeAccountStatus === 'active') {
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
          customerName: customerName || '',
          customerEmail: customerEmail || '',
          platformFee: platformFee.toString(),
          technicianPayout: technicianPayout.toString(),
          type: 'tip',
          paymentMethod: 'express_account',
        },
        description: `Tip for technician ${technicianId}`,
      });

      
      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
        platformFee,
        technicianPayout,
        technicianAccountStatus: techData.stripeAccountStatus,
        paymentMethod: 'express_account',
      });
    } else {
      // Fallback: Create regular payment intent (money goes to platform account for now)
      // This allows testing while technicians set up their Express accounts
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        metadata: {
          technicianId,
          customerId,
          customerName: customerName || '',
          customerEmail: customerEmail || '',
          platformFee: platformFee.toString(),
          technicianPayout: technicianPayout.toString(),
          type: 'tip',
          paymentMethod: 'platform_account',
          note: 'Payment to platform account - technician Express account not set up yet',
        },
        description: `Tip for technician ${technicianId} (via platform)`,
      });

      
      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
        platformFee,
        technicianPayout,
        technicianAccountStatus: techData?.stripeAccountStatus || 'none',
        paymentMethod: 'platform_account',
        message: 'Payment processed via platform account. Technician can set up direct payments in their dashboard.',
      });
    }


  } catch (error) {
    console.error('Payment intent creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
