/**
 * Server-side token functions using Firebase Admin SDK
 * For use in API routes and webhooks only
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  if (process.env.FIREBASE_PRIVATE_KEY) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  } else if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    // Fallback for environments without admin credentials
    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }
}

const db = getFirestore();

const COLLECTIONS = {
  TOKEN_BALANCES: 'tokenBalances',
  TOKEN_TRANSACTIONS: 'tokenTransactions',
  CLIENTS: 'clients',
  TECHNICIANS: 'technicians',
};

/**
 * Add tokens to user's balance (server-side)
 * Called from Stripe webhook after successful payment
 */
export async function addTokensToBalance(
  userId: string,
  tokensToAdd: number,
  purchaseAmount: number,
  sessionId?: string
): Promise<void> {
  try {
    // Check for duplicate processing if sessionId provided
    if (sessionId) {
      const existingTxQuery = db
        .collection(COLLECTIONS.TOKEN_TRANSACTIONS)
        .where('stripeSessionId', '==', sessionId)
        .limit(1);

      const existingTx = await existingTxQuery.get();

      if (!existingTx.empty) {
        console.warn(
          `⚠️ Duplicate purchase detected - session ${sessionId} already processed`
        );
        return; // Skip duplicate processing
      }
    }

    const balanceRef = db.collection(COLLECTIONS.TOKEN_BALANCES).doc(userId);
    const balanceDoc = await balanceRef.get();

    if (balanceDoc.exists) {
      // Update existing balance
      await balanceRef.update({
        tokens: FieldValue.increment(tokensToAdd),
        totalPurchased: FieldValue.increment(tokensToAdd),
        lastUpdated: FieldValue.serverTimestamp(),
      });
    } else {
      // Create new balance record
      await balanceRef.set({
        userId,
        tokens: tokensToAdd,
        totalPurchased: tokensToAdd,
        totalSpent: 0,
        lastUpdated: FieldValue.serverTimestamp(),
      });
    }

    // Create transaction record for token purchase
    await db.collection(COLLECTIONS.TOKEN_TRANSACTIONS).add({
      fromUserId: userId,
      toTechnicianId: '', // Token purchase doesn't have a recipient
      tokens: tokensToAdd,
      message: `Purchased ${tokensToAdd} TOA tokens via Stripe payment ($${purchaseAmount.toFixed(
        2
      )})`,
      isRandomMessage: false,
      timestamp: FieldValue.serverTimestamp(),
      type: 'token_purchase',
      dollarValue: purchaseAmount,
      pointsAwarded: 0, // Token purchases don't award points
      stripeSessionId: sessionId,
    });

    console.log(
      `✅ Added ${tokensToAdd} tokens to user ${userId} (session: ${sessionId})`
    );
  } catch (error) {
    console.error('❌ Error adding tokens to balance:', error);
    throw error;
  }
}

/**
 * Process token refund (server-side)
 * Called from Stripe webhook when a refund is issued
 */
export async function processTokenRefund(
  userId: string,
  tokensToRefund: number,
  refundAmount: number,
  paymentIntentId: string,
  reason?: string
): Promise<{ success: boolean; message: string; negativeBalance?: boolean }> {
  try {
    // Check for duplicate refund processing
    const existingRefundQuery = db
      .collection(COLLECTIONS.TOKEN_TRANSACTIONS)
      .where('stripePaymentIntentId', '==', paymentIntentId)
      .where('type', '==', 'token_refund')
      .limit(1);

    const existingRefund = await existingRefundQuery.get();

    if (!existingRefund.empty) {
      console.warn(`⚠️ Duplicate refund detected - payment ${paymentIntentId} already refunded`);
      return { success: false, message: 'Refund already processed' };
    }

    // Get user's current balance
    const balanceRef = db.collection(COLLECTIONS.TOKEN_BALANCES).doc(userId);
    const balanceDoc = await balanceRef.get();

    const currentBalance = balanceDoc.exists ? balanceDoc.data()?.tokens || 0 : 0;
    const newBalance = currentBalance - tokensToRefund;

    // Check if refund would create negative balance
    const willBeNegative = newBalance < 0;

    if (willBeNegative) {
      console.warn(
        `⚠️ Refund will create negative balance for user ${userId}: ${currentBalance} - ${tokensToRefund} = ${newBalance}`
      );
      // We'll still process it but flag it
    }

    // Update balance (allow negative)
    if (balanceDoc.exists) {
      await balanceRef.update({
        tokens: FieldValue.increment(-tokensToRefund),
        totalRefunded: FieldValue.increment(tokensToRefund),
        lastUpdated: FieldValue.serverTimestamp(),
      });
    } else {
      // User doesn't have a balance record - create one with negative balance
      await balanceRef.set({
        userId,
        tokens: -tokensToRefund,
        totalPurchased: 0,
        totalSpent: 0,
        totalRefunded: tokensToRefund,
        lastUpdated: FieldValue.serverTimestamp(),
      });
    }

    // Create refund transaction record
    await db.collection(COLLECTIONS.TOKEN_TRANSACTIONS).add({
      fromUserId: userId,
      toTechnicianId: '',
      tokens: -tokensToRefund, // Negative to indicate refund
      message: `Refund: ${tokensToRefund} TOA tokens ($${refundAmount.toFixed(2)})${reason ? ` - Reason: ${reason}` : ''}`,
      isRandomMessage: false,
      timestamp: FieldValue.serverTimestamp(),
      type: 'token_refund',
      dollarValue: -refundAmount, // Negative amount
      pointsAwarded: 0,
      stripePaymentIntentId: paymentIntentId,
      refundReason: reason || 'Customer requested refund',
      createdNegativeBalance: willBeNegative,
    });

    const message = willBeNegative
      ? `⚠️ Refunded ${tokensToRefund} tokens for user ${userId} - WARNING: Negative balance (${newBalance} tokens)`
      : `✅ Refunded ${tokensToRefund} tokens for user ${userId} (new balance: ${newBalance})`;

    console.log(message);

    return {
      success: true,
      message,
      negativeBalance: willBeNegative,
    };
  } catch (error) {
    console.error('❌ Error processing token refund:', error);
    throw error;
  }
}

/**
 * Get user's token balance (server-side)
 */
export async function getUserTokenBalance(userId: string): Promise<number> {
  try {
    const balanceRef = db.collection(COLLECTIONS.TOKEN_BALANCES).doc(userId);
    const balanceDoc = await balanceRef.get();

    if (!balanceDoc.exists) {
      return 0;
    }

    return balanceDoc.data()?.tokens || 0;
  } catch (error) {
    console.error('❌ Error getting user token balance:', error);
    return 0;
  }
}
