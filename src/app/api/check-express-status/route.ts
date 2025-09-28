import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const { technicianId } = await request.json();

    if (!technicianId) {
      return NextResponse.json(
        { error: 'Missing technician ID' },
        { status: 400 }
      );
    }

    // Get technician data from Firebase
    const techDoc = await getDoc(doc(db, 'technicians', technicianId));
    const techData = techDoc.data();

    if (!techData?.stripeAccountId) {
      return NextResponse.json({
        status: 'none',
        message: 'No Stripe account found'
      });
    }

    // Check account status with Stripe
    const account = await stripe.accounts.retrieve(techData.stripeAccountId);
    
    let status: 'none' | 'pending' | 'active' = 'pending';
    let message = 'Account setup in progress';

    if (account.charges_enabled && account.payouts_enabled) {
      status = 'active';
      message = 'Account fully set up and ready to receive payments';
    } else if (account.requirements?.currently_due && account.requirements.currently_due.length > 0) {
      status = 'pending';
      message = `Account setup incomplete. Missing: ${account.requirements.currently_due.join(', ')}`;
    } else if (account.requirements?.pending_verification && account.requirements.pending_verification.length > 0) {
      status = 'pending';
      message = `Verification pending for: ${account.requirements.pending_verification.join(', ')}`;
    }

    // Update status in Firebase if it changed
    if (techData.stripeAccountStatus !== status) {
      await updateDoc(doc(db, 'technicians', technicianId), {
        stripeAccountStatus: status,
        stripeAccountLastChecked: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      status,
      message,
      accountId: techData.stripeAccountId,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      requirements: {
        currentlyDue: account.requirements?.currently_due || [],
        pendingVerification: account.requirements?.pending_verification || [],
      }
    });

  } catch (error) {
    console.error('Account status check failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to check account status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}