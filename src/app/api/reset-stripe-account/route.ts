import { NextRequest, NextResponse } from 'next/server';
import { getServerStripe } from '@/lib/stripe';
import getFirebaseAdmin from '@/lib/firebase-admin';

const { db } = getFirebaseAdmin();
const stripe = getServerStripe();

export async function POST(req: NextRequest) {
  try {
    const { technicianId } = await req.json();

    if (!technicianId) {
      return NextResponse.json({ error: 'Technician ID required' }, { status: 400 });
    }

    // Get technician data
    const techDoc = await db.collection('technicians').doc(technicianId).get();
    if (!techDoc.exists) {
      return NextResponse.json({ error: 'Technician not found' }, { status: 404 });
    }

    const techData = techDoc.data();
    const oldAccountId = techData?.stripeAccountId;

    // Delete old Stripe account if it exists
    if (oldAccountId) {
      try {
        await stripe.accounts.del(oldAccountId);
        console.log(`Deleted old Stripe account: ${oldAccountId}`);
      } catch (error: any) {
        console.warn(`Could not delete old account: ${error.message}`);
      }
    }

    // Clear from Firestore
    await db.collection('technicians').doc(technicianId).update({
      stripeAccountId: null,
      stripeAccountStatus: null,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Stripe account reset. Try requesting payout again to create a fresh account.',
      deletedAccountId: oldAccountId,
    });

  } catch (error: any) {
    console.error('Reset account error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reset account' },
      { status: 500 }
    );
  }
}
