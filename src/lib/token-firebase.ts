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
  DailyPointsLimit,
  TOKEN_LIMITS,
  POINTS_LIMITS 
} from './tokens';
import EmailService from './email';

const db = getFirestore(app);

// Collection names
const COLLECTIONS = {
  TOKEN_BALANCES: 'tokenBalances',
  TOKEN_TRANSACTIONS: 'tokenTransactions', 
  DAILY_LIMITS: 'dailyLimits',
  DAILY_POINTS: 'dailyPoints',
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
 * Check daily points limit (consolidated system)
 */
export async function checkDailyPointsLimit(userId: string): Promise<{canUsePoints: boolean, remainingPoints: number, pointsGiven: number}> {
  if (!db) {
    console.warn('Firebase not configured. Returning mock points limit check.');
    return { canUsePoints: true, remainingPoints: 4, pointsGiven: 1 };
  }

  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const limitId = `${userId}_${today}`;
    const limitRef = doc(db, COLLECTIONS.DAILY_POINTS, limitId);
    const limitDoc = await getDoc(limitRef);
    
    if (limitDoc.exists()) {
      const data = limitDoc.data() as DailyPointsLimit;
      const remainingPoints = POINTS_LIMITS.DAILY_FREE_POINTS - data.pointsGiven;
      return {
        canUsePoints: remainingPoints > 0,
        remainingPoints: Math.max(0, remainingPoints),
        pointsGiven: data.pointsGiven
      };
    } else {
      // First points usage of the day
      return {
        canUsePoints: true,
        remainingPoints: POINTS_LIMITS.DAILY_FREE_POINTS - POINTS_LIMITS.POINTS_PER_THANK_YOU,
        pointsGiven: 0
      };
    }
  } catch (error) {
    console.error('Error checking daily points limit:', error);
    // Default to allowing points usage on error
    return { canUsePoints: true, remainingPoints: 4, pointsGiven: 0 };
  }
}

/**
 * Update daily points usage tracking
 */
export async function updateDailyPointsUsage(userId: string, pointsToAdd: number): Promise<void> {
  if (!db) {
    console.warn('Firebase not configured. Mock points updated.');
    return;
  }

  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const limitId = `${userId}_${today}`;
    const limitRef = doc(db, COLLECTIONS.DAILY_POINTS, limitId);
    const limitDoc = await getDoc(limitRef);
    
    if (limitDoc.exists()) {
      await updateDoc(limitRef, {
        pointsGiven: increment(pointsToAdd)
      });
    } else {
      // Create new daily points record
      const newLimit: DailyPointsLimit = {
        userId,
        date: today,
        pointsGiven: pointsToAdd,
        maxDailyPoints: POINTS_LIMITS.DAILY_FREE_POINTS
      };
      await setDoc(limitRef, newLimit);
    }
    
    console.log(`✅ Updated daily points usage: +${pointsToAdd} for user ${userId}`);
  } catch (error) {
    console.error('Error updating daily points usage:', error);
    throw error;
  }
}

/**
 * Send free thank you with points (consolidated system)
 */
export async function sendFreeThankYou(
  fromUserId: string, 
  toTechnicianId: string
): Promise<{success: boolean, transactionId?: string, error?: string, pointsRemaining?: number}> {
  if (!db) {
    console.warn('Firebase not configured. Mock thank you sent.');
    return { success: true, transactionId: 'mock-thank-you-' + Date.now(), pointsRemaining: 4 };
  }

  try {
    // Check if user has points remaining for the day
    const pointsCheck = await checkDailyPointsLimit(fromUserId);
    if (!pointsCheck.canUsePoints) {
      return { 
        success: false, 
        error: `Daily free points limit reached (${POINTS_LIMITS.DAILY_FREE_POINTS} per day)`,
        pointsRemaining: 0
      };
    }

    // Use fixed meaningful message for appreciation
    const message = `Thank you for your exceptional service! Your expertise and dedication truly make a difference.`;
    
    // Create transaction record
    const transaction: Omit<TokenTransaction, 'id'> = {
      fromUserId,
      toTechnicianId,
      tokens: 0, // Free thank you
      message,
      isRandomMessage: false,
      timestamp: new Date(),
      type: 'thank_you'
    };
    
    const transactionRef = await addDoc(collection(db, COLLECTIONS.TOKEN_TRANSACTIONS), transaction);
    
    // Update user's daily points usage
    await updateDailyPointsUsage(fromUserId, POINTS_LIMITS.POINTS_PER_THANK_YOU);
    
    // Award points to technician
    const technicianRef = doc(db, COLLECTIONS.TECHNICIANS, toTechnicianId);
    const techDoc = await getDoc(technicianRef);
    if (techDoc.exists()) {
      await updateDoc(technicianRef, {
        points: increment(POINTS_LIMITS.POINTS_PER_THANK_YOU),
        totalThankYous: increment(1)
      });
      
      console.log(`✅ Awarded ${POINTS_LIMITS.POINTS_PER_THANK_YOU} point to technician ${toTechnicianId} (free thank you)`);
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
        
        await EmailService.sendThankYouNotification(
          techData.email,
          technicianName,
          customerName,
          message
        );
      }
    } catch (emailError) {
      console.error('❌ Failed to send notification email:', emailError);
      // Don't fail the transaction if email fails
    }
    
    // Calculate remaining points for the day
    const remainingPoints = pointsCheck.remainingPoints - POINTS_LIMITS.POINTS_PER_THANK_YOU;
    
    return { 
      success: true, 
      transactionId: transactionRef.id,
      pointsRemaining: Math.max(0, remainingPoints)
    };
  } catch (error) {
    console.error('Error sending free thank you:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send tokens (new thank you system)
 */
export async function sendTokens(
  fromUserId: string, 
  toTechnicianId: string, 
  tokens: number
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

    // Use fixed meaningful message for token appreciation
    const message = `Thank you for your exceptional service! Your expertise and dedication truly make a difference. Here's ${tokens} tokens as a token of my appreciation.`;
    
    // Create transaction record
    const transaction: Omit<TokenTransaction, 'id'> = {
      fromUserId,
      toTechnicianId,
      tokens,
      message,
      isRandomMessage: false,
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
    
    // Update technician points (new consolidated system)
    const technicianRef = doc(db, COLLECTIONS.TECHNICIANS, toTechnicianId);
    const techDoc = await getDoc(technicianRef);
    if (techDoc.exists()) {
      // New points system: 1 point per thank you, 2 points per token received
      const pointsToAdd = isFreeThankYou ? POINTS_LIMITS.POINTS_PER_THANK_YOU : (tokens * POINTS_LIMITS.POINTS_PER_TOKEN);
      await updateDoc(technicianRef, {
        points: increment(pointsToAdd),
        totalThankYous: increment(1)
      });
      
      console.log(`✅ Awarded ${pointsToAdd} points to technician ${toTechnicianId} (${isFreeThankYou ? 'free thank you' : tokens + ' tokens received'})`);
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