'use client';

// Token system Firebase functions
// Separated from main firebase.ts to avoid @ts-nocheck issues

import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  addDoc,
  increment 
} from 'firebase/firestore';
import app from './firebase';
import { 
  UserTokenBalance, 
  TokenTransaction, 
  DailyThankYouLimit, 
  getRandomThankYouMessage,
  TOKEN_LIMITS 
} from './tokens';
import EmailService from './email';

const db = getFirestore(app);

// Collection names
const COLLECTIONS = {
  TOKEN_BALANCES: 'tokenBalances',
  TOKEN_TRANSACTIONS: 'tokenTransactions', 
  DAILY_LIMITS: 'dailyLimits',
  TECHNICIANS: 'technicians',
  USERS: 'users'
};

/**
 * Get user's token balance
 */
export async function getUserTokenBalance(userId: string): Promise<UserTokenBalance> {
  if (!db) {
    console.warn('Firebase not configured. Returning mock token balance.');
    return {
      userId,
      tokens: 100,
      totalPurchased: 100,
      totalSpent: 0,
      lastUpdated: new Date()
    };
  }

  try {
    const balanceRef = doc(db, COLLECTIONS.TOKEN_BALANCES, userId);
    const balanceDoc = await getDoc(balanceRef);
    
    if (balanceDoc.exists()) {
      const data = balanceDoc.data();
      return { id: balanceDoc.id, ...data } as unknown as UserTokenBalance;
    } else {
      // Create initial balance record
      const initialBalance: UserTokenBalance = {
        userId,
        tokens: 0,
        totalPurchased: 0,
        totalSpent: 0,
        lastUpdated: new Date()
      };
      
      await setDoc(balanceRef, initialBalance);
      return initialBalance;
    }
  } catch (error) {
    console.error('Error getting token balance:', error);
    throw error;
  }
}

/**
 * Add tokens to user's balance (after purchase)
 */
export async function addTokensToBalance(userId: string, tokensToAdd: number, purchaseAmount: number): Promise<void> {
  if (!db) {
    console.warn('Firebase not configured. Mock tokens added.');
    return;
  }

  try {
    const balanceRef = doc(db, COLLECTIONS.TOKEN_BALANCES, userId);
    const balanceDoc = await getDoc(balanceRef);
    
    if (balanceDoc.exists()) {
      await updateDoc(balanceRef, {
        tokens: increment(tokensToAdd),
        totalPurchased: increment(tokensToAdd),
        lastUpdated: new Date()
      });
    } else {
      // Create new balance record
      await setDoc(balanceRef, {
        userId,
        tokens: tokensToAdd,
        totalPurchased: tokensToAdd,
        totalSpent: 0,
        lastUpdated: new Date()
      });
    }
    
    console.log(`✅ Added ${tokensToAdd} tokens to user ${userId}`);
  } catch (error) {
    console.error('Error adding tokens to balance:', error);
    throw error;
  }
}

/**
 * Check daily thank you limit
 */
export async function checkDailyThankYouLimit(userId: string, technicianId: string): Promise<{canSendFree: boolean, remainingFree: number}> {
  if (!db) {
    console.warn('Firebase not configured. Returning mock limit check.');
    return { canSendFree: true, remainingFree: 2 };
  }

  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const limitId = `${userId}_${technicianId}_${today}`;
    const limitRef = doc(db, COLLECTIONS.DAILY_LIMITS, limitId);
    const limitDoc = await getDoc(limitRef);
    
    if (limitDoc.exists()) {
      const data = limitDoc.data();
      const remainingFree = TOKEN_LIMITS.FREE_DAILY_LIMIT - data.freeThankYous;
      return {
        canSendFree: remainingFree > 0,
        remainingFree: Math.max(0, remainingFree)
      };
    } else {
      // First thank you of the day
      return {
        canSendFree: true,
        remainingFree: TOKEN_LIMITS.FREE_DAILY_LIMIT - 1
      };
    }
  } catch (error) {
    console.error('Error checking daily limit:', error);
    // Default to allowing free thank you on error
    return { canSendFree: true, remainingFree: 2 };
  }
}

/**
 * Send tokens (new thank you system)
 */
export async function sendTokens(
  fromUserId: string, 
  toTechnicianId: string, 
  tokens: number, 
  customMessage?: string
): Promise<{success: boolean, transactionId?: string, error?: string}> {
  if (!db) {
    console.warn('Firebase not configured. Mock tokens sent.');
    return { success: true, transactionId: 'mock-transaction-' + Date.now() };
  }

  try {
    // Check if this is a free thank you or token transaction
    const isFreeThankYou = tokens === 0;
    
    if (isFreeThankYou) {
      // Check daily limit for free thank yous
      const limitCheck = await checkDailyThankYouLimit(fromUserId, toTechnicianId);
      if (!limitCheck.canSendFree) {
        return { 
          success: false, 
          error: 'Daily free thank you limit reached (3 per day per technician)' 
        };
      }
    } else {
      // Check user has enough tokens
      const balance = await getUserTokenBalance(fromUserId);
      if (balance.tokens < tokens) {
        return { 
          success: false, 
          error: `Insufficient tokens. You have ${balance.tokens}, need ${tokens}` 
        };
      }
    }

    // Get random message if no custom message provided
    const message = customMessage || getRandomThankYouMessage();
    
    // Create transaction record
    const transaction: Omit<TokenTransaction, 'id'> = {
      fromUserId,
      toTechnicianId,
      tokens,
      message,
      isRandomMessage: !customMessage,
      timestamp: new Date(),
      type: 'thank_you'
    };
    
    const transactionRef = await addDoc(collection(db, COLLECTIONS.TOKEN_TRANSACTIONS), transaction);
    
    if (!isFreeThankYou) {
      // Deduct tokens from sender
      const balanceRef = doc(db, COLLECTIONS.TOKEN_BALANCES, fromUserId);
      await updateDoc(balanceRef, {
        tokens: increment(-tokens),
        totalSpent: increment(tokens),
        lastUpdated: new Date()
      });
    } else {
      // Update daily limit counter
      const today = new Date().toISOString().split('T')[0];
      const limitId = `${fromUserId}_${toTechnicianId}_${today}`;
      const limitRef = doc(db, COLLECTIONS.DAILY_LIMITS, limitId);
      const limitDoc = await getDoc(limitRef);
      
      if (limitDoc.exists()) {
        await updateDoc(limitRef, {
          freeThankYous: increment(1)
        });
      } else {
        await setDoc(limitRef, {
          userId: fromUserId,
          technicianId: toTechnicianId,
          date: today,
          freeThankYous: 1,
          maxFreeThankYous: TOKEN_LIMITS.FREE_DAILY_LIMIT
        });
      }
    }
    
    // Update technician points (keep existing point system for now)
    const technicianRef = doc(db, COLLECTIONS.TECHNICIANS, toTechnicianId);
    const techDoc = await getDoc(technicianRef);
    if (techDoc.exists()) {
      const pointsToAdd = isFreeThankYou ? 10 : tokens; // Free = 10 points, tokens = 1:1
      await updateDoc(technicianRef, {
        points: increment(pointsToAdd),
        totalThankYous: increment(1)
      });
    }

    // Send email notification
    try {
      const techData = techDoc?.data();
      const fromUserRef = doc(db, COLLECTIONS.USERS, fromUserId);
      const fromUserDoc = await getDoc(fromUserRef);
      const fromUserData = fromUserDoc.exists() ? fromUserDoc.data() : {};
      
      if (techData?.email) {
        const technicianName = techData.name || 'Technician';
        const customerName = fromUserData.displayName || fromUserData.name || 'A customer';
        
        if (isFreeThankYou) {
          // Send regular thank you notification
          await EmailService.sendThankYouNotification(
            techData.email,
            technicianName,
            customerName,
            message
          );
        } else {
          // Send token notification (we'll update this template next)
          await EmailService.sendTipNotification(
            techData.email,
            technicianName,
            customerName,
            Math.round(tokens * 0.1), // Convert tokens to dollar equivalent for now
            message
          );
        }
      }
    } catch (emailError) {
      console.error('❌ Failed to send notification email:', emailError);
      // Don't fail the transaction if email fails
    }
    
    return { success: true, transactionId: transactionRef.id };
  } catch (error) {
    console.error('Error sending tokens:', error);
    return { success: false, error: error.message };
  }
}