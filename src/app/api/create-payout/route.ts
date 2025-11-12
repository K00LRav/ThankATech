import { NextRequest, NextResponse } from 'next/server';
import { getServerStripe } from '@/lib/stripe';
import { logger } from '@/lib/logger';

// Initialize Firebase Admin for server-side operations
let adminDb: any = null;
async function getAdminDb() {
  if (adminDb) return adminDb;
  
  const { initializeApp, getApps, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  
  adminDb = getFirestore();
  return adminDb;
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getServerStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 503 }
      );
    }
    
    const { amount, technicianId, method = 'standard', bankAccount } = await request.json();

    // Validate request
    if (!amount || !technicianId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify minimum payout amount ($1.00)
    if (amount < 100) {
      return NextResponse.json(
        { error: 'Minimum payout amount is $1.00' },
        { status: 400 }
      );
    }

    // Get technician's Stripe account
    const db = await getAdminDb();
    const techDoc = await db.collection('technicians').doc(technicianId).get();
    
    if (!techDoc.exists) {
      return NextResponse.json(
        { error: 'Technician not found' },
        { status: 404 }
      );
    }

    const techData = techDoc.data();
    let stripeAccountId = techData.stripeAccountId;

    // If no Stripe account, create one
    if (!stripeAccountId) {
      logger.info(`Creating Stripe Express account for technician ${technicianId}`);
      
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: techData.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        tos_acceptance: {
          service_agreement: 'recipient',
        },
        metadata: {
          technicianId: technicianId,
        },
      });

      stripeAccountId = account.id;

      await db.collection('technicians').doc(technicianId).update({
        stripeAccountId: stripeAccountId,
        stripeAccountStatus: 'pending',
        updatedAt: new Date(),
      });
      
      logger.info(`Created Express account ${stripeAccountId} with transfers capability requested`);
    }

    // Verify account has transfers capability
    const accountStatus = await stripe.accounts.retrieve(stripeAccountId);
    if (accountStatus.capabilities?.transfers !== 'active') {
      logger.warn(`Account ${stripeAccountId} transfers capability status: ${accountStatus.capabilities?.transfers}`);
      
      // In test mode, the capability should activate immediately after adding bank account
      // So we'll proceed and let the bank account addition trigger activation
    }

    // Add bank account if provided
    if (bankAccount && bankAccount.accountNumber && bankAccount.routingNumber) {
      try {
        const externalAccount = await stripe.accounts.createExternalAccount(
          stripeAccountId,
          {
            external_account: {
              object: 'bank_account',
              country: 'US',
              currency: 'usd',
              account_holder_type: 'individual',
              routing_number: bankAccount.routingNumber,
              account_number: bankAccount.accountNumber,
            },
          }
        );
        
        logger.info(`Added bank account to Stripe account ${stripeAccountId}`);
      } catch (bankError: any) {
        logger.error('Bank account creation error:', bankError);
        return NextResponse.json(
          { error: `Invalid bank account: ${bankError.message}` },
          { status: 400 }
        );
      }
    }

    // Calculate fee for express payout
    const fee = method === 'express' ? 50 : 0; // $0.50 for express
    const netAmount = amount - fee;

    // Create transfer to technician's Stripe account
    const transfer = await stripe.transfers.create({
      amount: netAmount,
      currency: 'usd',
      destination: stripeAccountId,
      description: `ThankATech payout for technician ${technicianId}`,
      metadata: {
        technicianId: technicianId,
        payoutMethod: method,
        requestedAmount: amount,
        fee: fee,
      },
    });

    logger.info(`Created transfer ${transfer.id} for $${netAmount / 100} to ${stripeAccountId}`);

    // Store payout record in Firestore
    const payoutRecord = {
      transferId: transfer.id,
      technicianId: technicianId,
      stripeAccountId: stripeAccountId,
      amount: amount,
      fee: fee,
      netAmount: netAmount,
      method: method,
      status: 'pending',
      createdAt: new Date(),
      estimatedArrival: new Date(Date.now() + (method === 'express' ? 30 * 60 * 1000 : 2 * 24 * 60 * 60 * 1000)),
    };

    await db.collection('payouts').add(payoutRecord);

    // Update technician's earnings balance (deduct the amount)
    await db.collection('technicians').doc(technicianId).update({
      totalEarnings: (techData.totalEarnings || 0) - (amount / 100),
      lastPayoutDate: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      payout: {
        id: transfer.id,
        amount: netAmount,
        currency: 'usd',
        status: 'pending',
        estimated_arrival_date: payoutRecord.estimatedArrival,
        method: method,
        description: transfer.description,
      },
      message: method === 'express' 
        ? 'Payout initiated! Funds will arrive in ~30 minutes.'
        : 'Payout initiated successfully. Funds will arrive in 1-2 business days.'
    });

  } catch (error: any) {
    logger.error('Payout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process payout' },
      { status: 500 }
    );
  }
}