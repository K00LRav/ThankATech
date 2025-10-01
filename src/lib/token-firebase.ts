'use client';

// Token system Firebase functions
// Separated from main firebase.ts to avoid @ts-nocheck issues

import { logger } from './logger';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  addDoc,
  increment,
  query,
  where,
  getDocs,
  runTransaction 
} from 'firebase/firestore';
import app from './firebase';
import { 
  UserTokenBalance, 
  TokenTransaction, 
  DailyThankYouLimit,
  DailyPointsLimit,
  DailyPerTechnicianLimit,
  PointsConversion,
  TOKEN_LIMITS,
  POINTS_LIMITS,
  CONVERSION_SYSTEM,
  PAYOUT_MODEL 
} from './tokens';
import EmailService from './email';

const db = getFirestore(app);

// Collection names
const COLLECTIONS = {
  TOKEN_BALANCES: 'tokenBalances',
  TOKEN_TRANSACTIONS: 'tokenTransactions', 
  DAILY_LIMITS: 'dailyLimits',
  DAILY_POINTS: 'dailyPoints',
  DAILY_PER_TECH_LIMITS: 'dailyPerTechLimits',
  TECHNICIANS: 'technicians',
  USERS: 'users'
};

/**
 * Get user's token balance
 */
export async function getUserTokenBalance(userId: string): Promise<UserTokenBalance> {
  if (!db) {
    logger.warn('Firebase not configured. Returning mock token balance.');
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
    logger.error('Error getting token balance:', error);
    throw error;
  }
}

/**
 * Add tokens to user's balance (after purchase)
 */
export async function addTokensToBalance(userId: string, tokensToAdd: number, purchaseAmount: number): Promise<void> {
  if (!db) {
    logger.warn('Firebase not configured. Mock tokens added.');
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
    
    logger.success(`Added ${tokensToAdd} tokens to user ${userId}`);
  } catch (error) {
    logger.error('Error adding tokens to balance:', error);
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
    logger.error('Error checking daily limit:', error);
    // Default to allowing free thank you on error
    return { canSendFree: true, remainingFree: 2 };
  }
}

/**
 * Check daily per-technician thank you limit (NEW SYSTEM)
 */
export async function checkDailyPerTechnicianLimit(userId: string, technicianId: string): Promise<{
  canThank: boolean, 
  reason?: string,
  alreadyThankedToday: boolean
}> {
  if (!db) {
    console.warn('Firebase not configured. Returning mock limit check.');
    return { canThank: true, alreadyThankedToday: false };
  }

  try {
    // Prevent self-thanking
    if (userId === technicianId) {
      return { 
        canThank: false, 
        reason: "You cannot thank yourself", 
        alreadyThankedToday: false 
      };
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const limitId = `${userId}_${today}`;
    const limitRef = doc(db, COLLECTIONS.DAILY_PER_TECH_LIMITS, limitId);
    const limitDoc = await getDoc(limitRef);
    
    if (limitDoc.exists()) {
      const data = limitDoc.data() as DailyPerTechnicianLimit;
      const thankedTechnicians = data.thankedTechnicians || [];
      
      // Check if this specific technician was already thanked today
      if (thankedTechnicians.includes(technicianId)) {
        return { 
          canThank: false, 
          reason: "You've already thanked this technician today", 
          alreadyThankedToday: true 
        };
      }

      return { canThank: true, alreadyThankedToday: false };
    } else {
      // First thank you of the day
      return { canThank: true, alreadyThankedToday: false };
    }
  } catch (error) {
    console.error('Error checking daily per-technician limit:', error);
    // Default to allowing thank you on error
    return { canThank: true, alreadyThankedToday: false };
  }
}

/**
 * Update daily per-technician thank you tracking
 */
export async function updateDailyPerTechnicianLimit(userId: string, technicianId: string): Promise<void> {
  if (!db) {
    console.warn('Firebase not configured. Mock limit updated.');
    return;
  }

  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const limitId = `${userId}_${today}`;
    const limitRef = doc(db, COLLECTIONS.DAILY_PER_TECH_LIMITS, limitId);
    const limitDoc = await getDoc(limitRef);
    
    if (limitDoc.exists()) {
      const data = limitDoc.data() as DailyPerTechnicianLimit;
      const thankedTechnicians = [...(data.thankedTechnicians || []), technicianId];
      
      await updateDoc(limitRef, {
        thankedTechnicians
      });
    } else {
      // Create new daily limit record
      const newLimit: DailyPerTechnicianLimit = {
        userId,
        date: today,
        thankedTechnicians: [technicianId],
        maxDailyThanks: POINTS_LIMITS.DAILY_THANK_YOU_LIMIT
      };
      await setDoc(limitRef, newLimit);
    }
    
    logger.success(`Updated daily per-technician limit for user ${userId}`);
  } catch (error) {
    logger.error('Error updating daily per-technician limit:', error);
    throw error;
  }
}



/**
 * Send free thank you with ThankATech Points (NEW SYSTEM)
 */
export async function sendFreeThankYou(
  fromUserId: string, 
  toTechnicianId: string
): Promise<{success: boolean, transactionId?: string, error?: string, pointsRemaining?: number}> {
  if (!db) {
    console.warn('Firebase not configured. Mock thank you sent.');
    return { success: true, transactionId: 'mock-thank-you-' + Date.now(), pointsRemaining: 0 };
  }

  try {
    // Check per-technician daily limit and prevent self-thanking
    const limitCheck = await checkDailyPerTechnicianLimit(fromUserId, toTechnicianId);
    if (!limitCheck.canThank) {
      return { 
        success: false, 
        error: limitCheck.reason || 'Cannot thank this technician today',
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
    
    // Update user's daily per-technician limit tracking
    await updateDailyPerTechnicianLimit(fromUserId, toTechnicianId);
    
    // Award ThankATech Points to both technician AND customer
    const technicianRef = doc(db, COLLECTIONS.TECHNICIANS, toTechnicianId);
    const techDoc = await getDoc(technicianRef);
    if (techDoc.exists()) {
      await updateDoc(technicianRef, {
        points: increment(POINTS_LIMITS.POINTS_PER_THANK_YOU),
        totalThankYous: increment(1)
      });
      
      console.log(`✅ Awarded ${POINTS_LIMITS.POINTS_PER_THANK_YOU} ThankATech Point to technician ${toTechnicianId} (free thank you)`);
    }

    // 🆕 Award ThankATech Points to customer for being generous!
    const customerRef = doc(db, COLLECTIONS.USERS, fromUserId);
    const customerDoc = await getDoc(customerRef);
    
    if (customerDoc.exists()) {
      await updateDoc(customerRef, {
        points: increment(POINTS_LIMITS.POINTS_PER_THANK_YOU),
        totalThankYousSent: increment(1)
      });
    } else {
      // Create customer record if doesn't exist
      await setDoc(customerRef, {
        id: fromUserId,
        points: POINTS_LIMITS.POINTS_PER_THANK_YOU,
        totalThankYousSent: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    console.log(`✅ Awarded ${POINTS_LIMITS.POINTS_PER_THANK_YOU} ThankATech Point to customer ${fromUserId} for sending thank you`);

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
    
    // With new per-technician system, no global daily points limit
    // Each technician can only be thanked once per day
    
    return { 
      success: true, 
      transactionId: transactionRef.id,
      pointsRemaining: 0 // No longer tracking global daily points
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
    const message = isFreeThankYou 
      ? `Thank you for your exceptional service! Your expertise and dedication truly make a difference.`
      : `Thank you for your exceptional service! Your expertise and dedication truly make a difference. Here's ${tokens} TOA tokens as a token of my appreciation.`;
    
    // Calculate TOA business model values
    const dollarValue = isFreeThankYou ? 0 : tokens * PAYOUT_MODEL.customerPaysPerTOA;
    const technicianPayout = isFreeThankYou ? 0 : tokens * PAYOUT_MODEL.technicianGetsPerTOA;
    const platformFee = isFreeThankYou ? 0 : tokens * PAYOUT_MODEL.platformFeePerTOA;
    const pointsAwarded = isFreeThankYou ? POINTS_LIMITS.POINTS_PER_THANK_YOU : (tokens * POINTS_LIMITS.POINTS_PER_TOKEN);
    
    // Create transaction record with TOA business model tracking
    const transaction: Omit<TokenTransaction, 'id'> = {
      fromUserId,
      toTechnicianId,
      tokens,
      message,
      isRandomMessage: false,
      timestamp: new Date(),
      type: isFreeThankYou ? 'thank_you' : 'toa',
      dollarValue,
      technicianPayout,
      platformFee,
      pointsAwarded
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
    
    // Update technician ThankATech Points and TOA tracking (new system)
    const technicianRef = doc(db, COLLECTIONS.TECHNICIANS, toTechnicianId);
    const techDoc = await getDoc(technicianRef);
    if (techDoc.exists()) {
      // New TOA business model updates
      const updateData: any = {
        points: increment(pointsAwarded),
        totalThankYous: increment(1),
        totalTips: increment(isFreeThankYou ? 0 : tokens), // Track TOA received
        lastAppreciationDate: new Date()
      };
      
      // Add TOA-specific tracking for paid transactions
      if (!isFreeThankYou) {
        updateData.totalToaReceived = increment(tokens);
        updateData.totalToaValue = increment(dollarValue);
        updateData.totalEarnings = increment(technicianPayout); // Track 85% payout
      }
      
      await updateDoc(technicianRef, updateData);
      
      console.log(`✅ Awarded ${pointsAwarded} ThankATech Points to technician ${toTechnicianId} (${isFreeThankYou ? 'free thank you' : tokens + ' TOA received'})`);
    }

    // Award ThankATech Points to customer (TOA business model)
    const customerRef = doc(db, COLLECTIONS.USERS, fromUserId);
    const customerDoc = await getDoc(customerRef);
    
    if (customerDoc.exists()) {
      const updateData: any = {
        points: increment(POINTS_LIMITS.POINTS_PER_THANK_YOU), // 1 point for sending thank you
        totalThankYousSent: increment(1),
        lastAppreciationDate: new Date()
      };
      
      // Add TOA-specific tracking for paid transactions
      if (!isFreeThankYou) {
        updateData.points = increment(tokens); // 1 point per TOA sent (overrides thank you points)
        updateData.totalToaSent = increment(tokens);
        updateData.totalSpent = increment(dollarValue);
        updateData.totalTokensSent = increment(tokens);
      }
      
      await updateDoc(customerRef, updateData);
    } else {
      // Create customer record if doesn't exist
      const initialData: any = {
        id: fromUserId,
        points: isFreeThankYou ? POINTS_LIMITS.POINTS_PER_THANK_YOU : tokens,
        totalThankYousSent: 1,
        totalToaSent: isFreeThankYou ? 0 : tokens,
        totalSpent: isFreeThankYou ? 0 : dollarValue,
        totalTokensSent: isFreeThankYou ? 0 : tokens,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAppreciationDate: new Date()
      };
      
      await setDoc(customerRef, initialData);
    }
    
    console.log(`✅ Awarded ${isFreeThankYou ? POINTS_LIMITS.POINTS_PER_THANK_YOU : tokens} ThankATech Points to customer ${fromUserId} for ${isFreeThankYou ? 'sending thank you' : 'sending ' + tokens + ' TOA tokens'}`);

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
    logger.error('Error sending tokens:', error);
    return { success: false, error: error.message };
  }
}

// 🔄 CLOSED-LOOP CONVERSION SYSTEM
// Convert ThankATech Points to TOA tokens

export const convertPointsToTOA = async (userId: string, pointsToConvert: number) => {
  try {
    // Validation
    if (pointsToConvert < CONVERSION_SYSTEM.minimumConversion) {
      return { 
        success: false, 
        error: `Minimum conversion is ${CONVERSION_SYSTEM.minimumConversion} points` 
      };
    }

    if (pointsToConvert % CONVERSION_SYSTEM.pointsToTOARate !== 0) {
      return { 
        success: false, 
        error: `Points must be divisible by ${CONVERSION_SYSTEM.pointsToTOARate}` 
      };
    }

    // Check daily conversion limit
    const today = new Date().toISOString().split('T')[0];
    const conversionsQuery = query(
      collection(db, 'pointsConversions'),
      where('userId', '==', userId),
      where('conversionDate', '==', today)
    );
    const dailyConversions = await getDocs(conversionsQuery);

    const tokensAlreadyConverted = dailyConversions.docs.reduce((total, doc) => 
      total + doc.data().tokensGenerated, 0);

    const tokensToGenerate = Math.floor(pointsToConvert / CONVERSION_SYSTEM.pointsToTOARate);
    
    if (tokensAlreadyConverted + tokensToGenerate > CONVERSION_SYSTEM.maxDailyConversions) {
      return { 
        success: false, 
        error: `Daily conversion limit: ${CONVERSION_SYSTEM.maxDailyConversions} TOA tokens` 
      };
    }

    // Get user's current points balance (check both collections)
    let userRef = doc(db, 'technicians', userId);
    let userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      userRef = doc(db, 'users', userId);
      userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        return { success: false, error: 'User not found' };
      }
    }

    const userData = userDoc.data() as any;
    const currentPoints = userData.points || 0;

    if (currentPoints < pointsToConvert) {
      return { 
        success: false, 
        error: `Insufficient points. You have ${currentPoints} points.`
      };
    }

    // Perform the conversion in a transaction
    await runTransaction(db, async (transaction) => {
      // Deduct points
      transaction.update(userRef, {
        points: currentPoints - pointsToConvert,
        updatedAt: new Date()
      });

      // Add TOA tokens
      const tokenBalance = await getUserTokenBalance(userId);
      const tokenDocRef = doc(db, 'userTokens', userId);
      const tokenDoc = await getDoc(tokenDocRef);
      
      if (tokenDoc.exists()) {
        transaction.update(tokenDocRef, {
          tokens: (tokenBalance.tokens || 0) + tokensToGenerate,
          totalPurchased: (tokenBalance.totalPurchased || 0) + tokensToGenerate,
          lastUpdated: new Date()
        });
      } else {
        transaction.set(tokenDocRef, {
          userId,
          tokens: tokensToGenerate,
          totalPurchased: tokensToGenerate,
          totalSpent: 0,
          lastUpdated: new Date()
        });
      }

      // Record the conversion
      const conversionRef = doc(collection(db, 'pointsConversions'));
      transaction.set(conversionRef, {
        id: conversionRef.id,
        userId,
        pointsConverted: pointsToConvert,
        tokensGenerated: tokensToGenerate,
        conversionDate: today,
        conversionRate: CONVERSION_SYSTEM.pointsToTOARate,
        createdAt: new Date()
      });
    });

    logger.info(`Converted ${pointsToConvert} points to ${tokensToGenerate} TOA for user ${userId}`);

    return { 
      success: true, 
      tokensGenerated: tokensToGenerate,
      newPointsBalance: currentPoints - pointsToConvert,
      message: `🎉 Successfully converted ${pointsToConvert} points to ${tokensToGenerate} TOA tokens!`
    };

  } catch (error) {
    logger.error('Error converting points to TOA:', error);
    return { success: false, error: 'Conversion failed. Please try again.' };
  }
};

// Check how many points user can convert today
export const getConversionStatus = async (userId: string) => {
  try {
    // Get user's current points (check both collections)
    let userRef = doc(db, 'technicians', userId);
    let userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      userRef = doc(db, 'users', userId);
      userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        return { availablePoints: 0, canConvert: 0, dailyLimit: CONVERSION_SYSTEM.maxDailyConversions };
      }
    }

    const userData = userDoc.data() as any;
    const availablePoints = userData.points || 0;

    // Check today's conversions
    const today = new Date().toISOString().split('T')[0];
    const conversionsQuery = query(
      collection(db, 'pointsConversions'),
      where('userId', '==', userId),
      where('conversionDate', '==', today)
    );
    const dailyConversions = await getDocs(conversionsQuery);

    const tokensAlreadyConverted = dailyConversions.docs.reduce((total, doc) => 
      total + doc.data().tokensGenerated, 0);

    const remainingDailyLimit = CONVERSION_SYSTEM.maxDailyConversions - tokensAlreadyConverted;
    const maxConvertableFromPoints = Math.floor(availablePoints / CONVERSION_SYSTEM.pointsToTOARate);
    const canConvert = Math.min(maxConvertableFromPoints, remainingDailyLimit);

    return {
      availablePoints,
      canConvert: Math.max(0, canConvert),
      dailyLimit: CONVERSION_SYSTEM.maxDailyConversions,
      usedToday: tokensAlreadyConverted,
      conversionRate: CONVERSION_SYSTEM.pointsToTOARate
    };

  } catch (error) {
    logger.error('Error getting conversion status:', error);
    return { availablePoints: 0, canConvert: 0, dailyLimit: CONVERSION_SYSTEM.maxDailyConversions };
  }
};