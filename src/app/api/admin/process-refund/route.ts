import { NextRequest, NextResponse } from 'next/server';
import { processTokenRefund, getUserTokenBalance } from '@/lib/token-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, tokensToRefund, refundAmount, reason, adminId } = body;

    // Validate input
    if (!userId || !tokensToRefund || tokensToRefund <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid input parameters' },
        { status: 400 }
      );
    }

    // TODO: Add admin authentication check here
    // Verify that the requesting user is actually an admin
    // For now, we'll trust the adminId passed in

    console.log(`🔄 Admin ${adminId} processing refund: ${tokensToRefund} tokens for user ${userId}`);

    // Process the refund
    const result = await processTokenRefund(
      userId,
      tokensToRefund,
      refundAmount,
      `manual_refund_${Date.now()}`, // Generate unique ID for manual refunds
      reason
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 500 }
      );
    }

    // Get updated balance
    const newBalance = await getUserTokenBalance(userId);

    return NextResponse.json({
      success: true,
      message: result.message,
      newBalance,
      negativeBalance: result.negativeBalance,
    });
  } catch (error) {
    console.error('❌ Error processing admin refund:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
