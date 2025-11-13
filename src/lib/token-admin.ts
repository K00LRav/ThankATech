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
