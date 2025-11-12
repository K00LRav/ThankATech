import { NextRequest, NextResponse } from 'next/server';
import { getServerStripe } from '@/lib/stripe';

const stripe = getServerStripe();

export async function POST(req: NextRequest) {
  try {
    // Create a test charge to add funds to platform balance
    const charge = await stripe.charges.create({
      amount: 100000, // $1,000.00
      currency: 'usd',
      source: 'tok_bypassPending', // Test token that succeeds immediately
      description: 'Test funds for payout testing',
    });

    return NextResponse.json({
      success: true,
      message: 'Added $1,000 to test account balance',
      chargeId: charge.id,
      balance: '$1,000.00',
    });

  } catch (error: any) {
    console.error('Add test funds error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add test funds' },
      { status: 500 }
    );
  }
}
