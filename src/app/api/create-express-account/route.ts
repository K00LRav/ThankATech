// @ts-nocheck
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe only if secret key is available
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function POST(request: Request) {
  try {
    // Check if required services are available
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 503 }
      );
    }

    const { technicianId, email, returnUrl, refreshUrl } = await request.json();

    if (!technicianId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate Stripe key is test key for development
    if (process.env.NODE_ENV === 'development' && process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
      console.warn('⚠️  Using live Stripe keys in development mode!');
    }

    // Dynamically import Firebase to avoid build-time issues
    const { doc, updateDoc, getDoc } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase');

    if (!db) {
      return NextResponse.json(
        { error: 'Firebase not configured' },
        { status: 503 }
      );
    }

    // Check if technician already has a Stripe account
    const techDoc = await getDoc(doc(db, 'technicians', technicianId));
    const techData = techDoc.data();

    let stripeAccountId = techData?.stripeAccountId;

    // Create new Stripe Express account if one doesn't exist
    if (!stripeAccountId) {
      console.log(`Creating Stripe Express account for technician: ${technicianId}`);
      
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          technicianId: technicianId,
        },
      });

      stripeAccountId = account.id;

      // Save the account ID to Firebase
      await updateDoc(doc(db, 'technicians', technicianId), {
        stripeAccountId: stripeAccountId,
        stripeAccountStatus: 'pending',
        stripeAccountCreated: new Date().toISOString(),
      });

      console.log(`Created Stripe account: ${stripeAccountId} for technician: ${technicianId}`);
    }

    // Create account link for onboarding
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl || `${baseUrl}/dashboard?refresh=true`,
      return_url: returnUrl || `${baseUrl}/dashboard?setup=complete`,
      type: 'account_onboarding',
    });

    console.log(`Created account link for: ${stripeAccountId}`);

    return NextResponse.json({
      success: true,
      accountId: stripeAccountId,
      onboardingUrl: accountLink.url,
    });

  } catch (error) {
    console.error('Stripe Express account creation failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create payment account',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}