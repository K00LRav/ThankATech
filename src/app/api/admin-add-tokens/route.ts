import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();
    const { userId, tokens, adminSecret } = body;

    // Simple admin secret check (you should use a proper secret)
    if (adminSecret !== 'admin-test-tokens-2025') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: 'Firebase Admin SDK not configured' },
        { status: 500 }
      );
    }

    if (!userId || !tokens) {
      return NextResponse.json(
        { error: 'Missing userId or tokens parameter' },
        { status: 400 }
      );
    }

    // Add tokens to the user's balance
    const balanceRef = adminDb.collection('tokenBalances').doc(userId);
    const balanceDoc = await balanceRef.get();
    
    if (balanceDoc.exists) {
      // Update existing balance
      const currentData = balanceDoc.data();
      await balanceRef.update({
        tokens: (currentData?.tokens || 0) + tokens,
        totalPurchased: (currentData?.totalPurchased || 0) + tokens,
        lastUpdated: new Date()
      });
    } else {
      // Create new balance record
      await balanceRef.set({
        userId,
        tokens: tokens,
        totalPurchased: tokens,
        totalSpent: 0,
        lastUpdated: new Date()
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully added ${tokens} tokens to user ${userId}`,
      userId,
      tokensAdded: tokens
    });

  } catch (error) {
    console.error('Error adding admin tokens:', error);
    return NextResponse.json(
      { error: 'Failed to add tokens', details: error.message },
      { status: 500 }
    );
  }
}