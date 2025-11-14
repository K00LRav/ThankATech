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
  CLIENTS: 'clients', // Clients (customers who send appreciation)
  ADMINS: 'admins'    // Admins (platform administrators)
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
export async function addTokensToBalance(userId: string, tokensToAdd: number, purchaseAmount: number, sessionId?: string): Promise<void> {
  if (!db) {
    logger.warn('Firebase not configured. Mock tokens added.');
    return;
  }

  try {
    // Check for duplicate processing if sessionId provided
    if (sessionId) {
      const existingTxQuery = query(
        collection(db, COLLECTIONS.TOKEN_TRANSACTIONS),
        where('stripeSessionId', '==', sessionId)
      );
      const existingTx = await getDocs(existingTxQuery);
      
      if (!existingTx.empty) {
        logger.warn(`⚠️ Duplicate purchase detected - session ${sessionId} already processed`);
        return; // Skip duplicate processing
      }
    }
    
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

    // 🆕 Create transaction record for token purchase
    const transaction: Omit<TokenTransaction, 'id'> & { stripeSessionId?: string } = {
      fromUserId: userId,
      toTechnicianId: '', // Token purchase doesn't have a recipient
      tokens: tokensToAdd,
      message: `Purchased ${tokensToAdd} TOA tokens via Stripe payment ($${purchaseAmount.toFixed(2)})`,
      isRandomMessage: false,
      timestamp: new Date(),
      type: 'token_purchase', // Changed from 'toa' to 'token_purchase'
      dollarValue: purchaseAmount,
      pointsAwarded: 0, // Token purchases don't award points, sending tokens does
      stripeSessionId: sessionId // Store session ID to prevent duplicate processing
    };

    await addDoc(collection(db, COLLECTIONS.TOKEN_TRANSACTIONS), transaction);
    
    // Development only logging
    if (process.env.NODE_ENV === 'development') {
      logger.info(`Added ${tokensToAdd} tokens to user ${userId} and created transaction record`);
    }
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
    logger.warn('Firebase not configured. Returning mock limit check.');
    return { canSendFree: true, remainingFree: 2 };
  }

  try {
    // Check if user is admin - admins have unlimited tokens and thank yous
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@thankatech.com';
    // Check admins collection first, then clients collection
    let userRef = doc(db, COLLECTIONS.ADMINS, userId);
    let userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      userRef = doc(db, COLLECTIONS.CLIENTS, userId);
      userDoc = await getDoc(userRef);
    }
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      if (userData.email === adminEmail) {
        // Development only logging
        if (process.env.NODE_ENV === 'development') {
          logger.info(`Admin user ${adminEmail} bypassing daily limits`);
        }
        return { canSendFree: true, remainingFree: 999 }; // Unlimited for admin
      }
    }

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
    logger.warn('Firebase not configured. Returning mock limit check.');
    return { canThank: true, alreadyThankedToday: false };
  }

  try {
    // Check if user is admin - admins have unlimited thank yous (but still can't thank themselves)
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@thankatech.com';
    
    // Check admins collection first
    try {
      const adminRef = doc(db, COLLECTIONS.ADMINS, userId);
      const adminDoc = await getDoc(adminRef);
      
      if (adminDoc.exists()) {
        const adminData = adminDoc.data();
        if (adminData.email === adminEmail) {
          // Prevent self-thanking even for admin
          if (userId === technicianId) {
            return { 
              canThank: false, 
              reason: "You cannot thank yourself", 
              alreadyThankedToday: false 
            };
          }
          // Development only logging
          if (process.env.NODE_ENV === 'development') {
            logger.info(`Admin user ${adminEmail} bypassing per-technician daily limits`);
          }
          return { canThank: true, alreadyThankedToday: false };
        }
      }
    } catch {
      // Continue checking other collections
    }
    
    // Check clients collection for admin email
    try {
      const clientRef = doc(db, COLLECTIONS.CLIENTS, userId);
      const clientDoc = await getDoc(clientRef);
      
      if (clientDoc.exists()) {
        const clientData = clientDoc.data();
        if (clientData.email === adminEmail) {
          // Prevent self-thanking even for admin
          if (userId === technicianId) {
            return { 
              canThank: false, 
              reason: "You cannot thank yourself", 
              alreadyThankedToday: false 
            };
          }
          // Development only logging
          if (process.env.NODE_ENV === 'development') {
            logger.info(`Admin user ${adminEmail} bypassing per-technician daily limits`);
          }
          return { canThank: true, alreadyThankedToday: false };
        }
      }
    } catch {
      // Continue
    }

    // Prevent self-thanking - check FIRST before any other validation
    if (userId === technicianId) {
      return { 
        canThank: false, 
        reason: "You cannot thank yourself", 
        alreadyThankedToday: false 
      };
    }

    // Also check if the user's auth UID matches the technician's authUid field
    try {
      const techDoc = await getDoc(doc(db, COLLECTIONS.TECHNICIANS, technicianId));
      if (techDoc.exists()) {
        const techData = techDoc.data();
        if (techData.authUid === userId || techData.uid === userId) {
          return {
            canThank: false,
            reason: "You cannot thank yourself",
            alreadyThankedToday: false
          };
        }
      }
    } catch (err) {
      logger.warn('Error checking technician auth UID:', err);
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
    logger.error('Error checking daily per-technician limit:', error);
    // Default to allowing thank you on error
    return { canThank: true, alreadyThankedToday: false };
  }
}

/**
 * Update daily per-technician thank you tracking
 */
export async function updateDailyPerTechnicianLimit(userId: string, technicianId: string): Promise<void> {
  if (!db) {
    logger.warn('Firebase not configured. Mock limit updated.');
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
    
    // Development only logging
    if (process.env.NODE_ENV === 'development') {
      logger.info(`Updated daily per-technician limit for user ${userId}`);
    }
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
    logger.warn('Firebase not configured. Mock thank you sent.');
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

    // Pre-selected meaningful thank you messages for consistency and positivity
    const thankYouMessages = [
      "Thank you for your exceptional service! Your expertise and dedication truly make a difference.",
      "Your professional work and attention to detail are greatly appreciated. Thank you!",
      "Excellent service! Your skills and reliability make you a valued professional.",
      "Thank you for going above and beyond. Your work quality is outstanding!",
      "Your expertise and friendly service are much appreciated. Thank you for everything!",
      "Professional, reliable, and skilled - thank you for your excellent work!",
      "Your dedication to quality service is evident. Thank you for your hard work!",
      "Thank you for your prompt and professional service. Truly appreciated!",
      "Your attention to detail and expert skills are valued. Thank you so much!",
      "Exceptional work and great communication. Thank you for your professionalism!"
    ];
    
    // Randomly select a message for variety while maintaining quality
    const message = thankYouMessages[Math.floor(Math.random() * thankYouMessages.length)];
    
    // Fetch sender and recipient names for proper display
    // Sender is always a client, recipient is always a technician
    const senderDoc = await getDoc(doc(db, COLLECTIONS.CLIENTS, fromUserId));
    
    const recipientDoc = await getDoc(doc(db, COLLECTIONS.TECHNICIANS, toTechnicianId));
    
    const senderData = senderDoc.exists() ? senderDoc.data() : {};
    const fromName = senderData?.name || senderData?.displayName || 'Customer';
    const toName = recipientDoc.exists() ? recipientDoc.data()?.name : 'Technician';
    
    // Create transaction record with names
    const transaction: Omit<TokenTransaction, 'id'> = {
      fromUserId,
      toTechnicianId,
      fromName,
      toName,
      technicianName: toName, // For compatibility
      tokens: 0, // Free thank you
      message,
      isRandomMessage: true, // Now using random messages
      timestamp: new Date(),
      type: 'thank_you',
      pointsAwarded: POINTS_LIMITS.POINTS_PER_THANK_YOU // 1 ThankATech Point for thank you
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
      
      // Development only logging
      if (process.env.NODE_ENV === 'development') {
        logger.info(`✅ Awarded ${POINTS_LIMITS.POINTS_PER_THANK_YOU} ThankATech Point to technician ${toTechnicianId} (free thank you)`);
      }
    }

    // Track customer activity but DON'T award points for free thank yous
    // Customer is always in clients collection - find by authUid first
    const clientsQuery = query(collection(db, COLLECTIONS.CLIENTS), where('authUid', '==', fromUserId));
    const clientSnapshot = await getDocs(clientsQuery);
    
    if (!clientSnapshot.empty) {
      const customerRef = doc(db, COLLECTIONS.CLIENTS, clientSnapshot.docs[0].id);
      await updateDoc(customerRef, {
        // No points awarded - only tracking
        totalThankYousSent: increment(1)
      });
    } else {
      // Customer document not found - this shouldn't happen for existing users
      logger.warn('Customer document not found for authUid:', fromUserId);
    }
    
    // Development only logging
    if (process.env.NODE_ENV === 'development') {
      logger.info(`✅ Free thank you sent from customer ${fromUserId} - only technician gets points, not customer`);
    }

    // Send email notification
    try {
      const techData = techDoc?.data();
      // Get client data for email notification
      const fromUserRef = doc(db, COLLECTIONS.CLIENTS, fromUserId);
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
      logger.error('❌ Failed to send notification email:', emailError);
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
    logger.error('Error sending free thank you:', error);
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
    logger.warn('Firebase not configured. Mock tokens sent.');
    return { success: true, transactionId: 'mock-transaction-' + Date.now() };
  }

  try {
    // Prevent self-thanking
    if (fromUserId === toTechnicianId) {
      return {
        success: false,
        error: 'You cannot send tokens to yourself'
      };
    }

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

    // Random TOA appreciation messages
    const toaMessages = [
      `Your outstanding work deserves recognition! Here's ${tokens} TOA tokens as appreciation.`,
      `Exceptional service! These ${tokens} TOA tokens are a small token of my gratitude.`,
      `Thank you for going above and beyond! Enjoy these ${tokens} TOA tokens.`,
      `Your professionalism and skill are incredible! Here are ${tokens} TOA tokens.`,
      `Amazing work quality! These ${tokens} TOA tokens are well-deserved.`,
      `Your dedication to excellence shows! Please accept these ${tokens} TOA tokens.`,
      `Outstanding service delivery! Here's ${tokens} TOA tokens as my thanks.`,
      `Your expertise made all the difference! Enjoy these ${tokens} TOA tokens.`,
      `Truly exceptional work! These ${tokens} TOA tokens are for you.`,
      `Your professional service exceeded expectations! Here are ${tokens} TOA tokens.`
    ];
    
    // Select appropriate message
    const message = isFreeThankYou 
      ? `` // Free thank yous use separate message system
      : toaMessages[Math.floor(Math.random() * toaMessages.length)];
    
    // Fetch sender and recipient names
    // Sender can be either a client OR a technician (technicians can send to other technicians)
    let senderData: any = {};
    let senderType: 'client' | 'technician' = 'client';
    
    // First try to find client by authUid (since document ID might be different from userId)
    const clientsQuery = query(collection(db, COLLECTIONS.CLIENTS), where('authUid', '==', fromUserId));
    const clientSnapshot = await getDocs(clientsQuery);
    
    if (!clientSnapshot.empty) {
      senderData = clientSnapshot.docs[0].data();
      senderType = 'client';
    } else {
      // Check if sender is a technician by authUid
      const techQuery = query(collection(db, COLLECTIONS.TECHNICIANS), where('authUid', '==', fromUserId));
      const techSnapshot = await getDocs(techQuery);
      
      if (!techSnapshot.empty) {
        senderData = techSnapshot.docs[0].data();
        senderType = 'technician';
      }
    }
    
    const recipientDoc = await getDoc(doc(db, COLLECTIONS.TECHNICIANS, toTechnicianId));
    
    const fromName = senderData?.name || senderData?.displayName || senderData?.businessName || (senderType === 'technician' ? 'Technician' : 'Customer');
    const toName = recipientDoc.exists() ? recipientDoc.data()?.name : 'Technician';
    
    // Calculate TOA business model values
    const dollarValue = isFreeThankYou ? 0 : tokens * PAYOUT_MODEL.customerPaysPerTOA;
    const technicianPayout = isFreeThankYou ? 0 : tokens * PAYOUT_MODEL.technicianGetsPerTOA;
    const platformFee = isFreeThankYou ? 0 : tokens * PAYOUT_MODEL.platformFeePerTOA;
    // Points awarded ONLY to technician for free thank yous, both client & technician for TOA
    // TOA transactions award 2 points total per transaction, not per token
    const pointsAwarded = isFreeThankYou ? POINTS_LIMITS.POINTS_PER_THANK_YOU : POINTS_LIMITS.POINTS_PER_TOA_TRANSACTION;
    
    // Create transaction record with names and TOA business model tracking
    const transaction: Omit<TokenTransaction, 'id'> = {
      fromUserId,
      toTechnicianId,
      fromName,
      toName,
      technicianName: toName, // For compatibility
      tokens,
      message,
      isRandomMessage: !isFreeThankYou, // TOA messages are random, thank yous handled separately
      timestamp: new Date(),
      type: isFreeThankYou ? 'thank_you' : 'toa_token',
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
      
      // Development only logging
      if (process.env.NODE_ENV === 'development') {
        logger.info(`✅ Awarded ${pointsAwarded} ThankATech Points to technician ${toTechnicianId} (${isFreeThankYou ? 'free thank you' : tokens + ' TOA received'})`);
      }
    }

    // Award ThankATech Points to sender ONLY for TOA tokens (paid appreciation)
    // Sender can be either client or technician - check which collection they're in
    if (senderType === 'client') {
      // Find client by authUid
      const clientsQuery = query(collection(db, COLLECTIONS.CLIENTS), where('authUid', '==', fromUserId));
      const clientSnapshot = await getDocs(clientsQuery);
      
      if (!clientSnapshot.empty) {
        const customerRef = doc(db, COLLECTIONS.CLIENTS, clientSnapshot.docs[0].id);
        
        const updateData: any = {
          totalThankYousSent: increment(1),
          lastAppreciationDate: new Date()
        };
        
        // ONLY award points to client for TOA tokens (paid appreciation)
        if (!isFreeThankYou) {
          updateData.points = increment(1); // 1 point per TOA transaction (not per token)
          updateData.totalToaSent = increment(tokens);
          updateData.totalSpent = increment(dollarValue);
          updateData.totalTokensSent = increment(tokens);
        }
        // Free thank yous do NOT award points to clients - only to technicians
        
        await updateDoc(customerRef, updateData);
      } else {
        // Create customer record if doesn't exist - this shouldn't happen for existing users
        logger.warn('Customer document not found for authUid:', fromUserId);
      }
    } else if (senderType === 'technician') {
      // Sender is a technician sending to another technician
      const techSenderRef = doc(db, COLLECTIONS.TECHNICIANS, fromUserId);
      
      const updateData: any = {
        totalThankYousSent: increment(1),
        lastAppreciationDate: new Date()
      };
      
      // ONLY award points to technician for TOA tokens (paid appreciation)
      if (!isFreeThankYou) {
        updateData.points = increment(1); // 1 point per TOA transaction (not per token)
        updateData.totalToaSent = increment(tokens);
        updateData.totalSpent = increment(dollarValue);
        updateData.totalTokensSent = increment(tokens);
      }
      // Free thank yous do NOT award points for sending - only receiving
      
      await updateDoc(techSenderRef, updateData);
    }
    
    // Development only logging
    if (process.env.NODE_ENV === 'development') {
      if (!isFreeThankYou) {
        logger.info(`✅ Awarded 1 ThankATech Point to ${senderType} ${fromUserId} for sending ${tokens} TOA tokens (2 points to recipient)`);
      } else {
        logger.info(`✅ Free thank you sent from ${senderType} ${fromUserId} to technician ${toTechnicianId} - only technician gets points`);
      }
    }

    // Send email notifications to both sender and recipient
    try {
      const techData = techDoc?.data();
      // Get sender data for email notification (could be client or technician)
      let fromUserData: any = {};
      let senderEmail: string | undefined;
      
      if (senderType === 'client') {
        // Lookup client by authUid (since doc ID might differ)
        const clientsQuery = query(collection(db, COLLECTIONS.CLIENTS), where('authUid', '==', fromUserId));
        const clientSnapshot = await getDocs(clientsQuery);
        if (!clientSnapshot.empty) {
          fromUserData = clientSnapshot.docs[0].data();
          senderEmail = fromUserData.email;
        }
      } else {
        // Lookup technician by authUid
        const techQuery = query(collection(db, COLLECTIONS.TECHNICIANS), where('authUid', '==', fromUserId));
        const techSnapshot = await getDocs(techQuery);
        if (!techSnapshot.empty) {
          fromUserData = techSnapshot.docs[0].data();
          senderEmail = fromUserData.email;
        }
      }
      
      const technicianName = techData?.name || 'Technician';
      const senderName = fromUserData.displayName || fromUserData.name || fromUserData.businessName || (senderType === 'technician' ? 'A fellow technician' : 'A customer');
      
      // Send email to recipient (technician)
      if (techData?.email) {
        if (isFreeThankYou) {
          // Send regular thank you notification
          await EmailService.sendThankYouNotification(
            techData.email,
            technicianName,
            senderName,
            message
          );
        } else {
          // Send TOA received notification
          await EmailService.sendToaReceivedNotification(
            techData.email,
            technicianName,
            senderName,
            tokens,
            message
          );
        }
      }
      
      // Send confirmation email to sender
      if (senderEmail && !isFreeThankYou) {
        // Only send TOA sent confirmation for paid tokens (not free thank yous)
        await EmailService.sendToaSentNotification(
          senderEmail,
          senderName,
          technicianName,
          tokens,
          message
        );
      }
    } catch (emailError) {
      logger.error('❌ Failed to send notification email:', emailError);
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
    logger.info(`Starting conversion for user ${userId}, converting ${pointsToConvert} points`);
    
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

    const tokensToGenerate = Math.floor(pointsToConvert / CONVERSION_SYSTEM.pointsToTOARate);
    logger.info(`Will generate ${tokensToGenerate} TOA tokens`);

    // Get user's current points balance (check all collections using authUid)
    let userDocSnapshot = null;
    let userRef = null;
    
    // Check technicians collection
    const techQuery = query(collection(db, COLLECTIONS.TECHNICIANS), where('authUid', '==', userId));
    const techDocs = await getDocs(techQuery);
    
    if (!techDocs.empty) {
      userDocSnapshot = techDocs.docs[0];
      userRef = userDocSnapshot.ref;
    } else {
      // Check clients collection
      const clientQuery = query(collection(db, COLLECTIONS.CLIENTS), where('authUid', '==', userId));
      const clientDocs = await getDocs(clientQuery);
      
      if (!clientDocs.empty) {
        userDocSnapshot = clientDocs.docs[0];
        userRef = userDocSnapshot.ref;
      } else {
        // Check admins collection
        const adminQuery = query(collection(db, COLLECTIONS.ADMINS), where('authUid', '==', userId));
        const adminDocs = await getDocs(adminQuery);
        
        if (!adminDocs.empty) {
          userDocSnapshot = adminDocs.docs[0];
          userRef = adminDocs.docs[0].ref;
        } else {
          return { success: false, error: 'User not found' };
        }
      }
    }

    const userData = userDocSnapshot.data() as any;
    const currentPoints = userData.points || 0;
    logger.info(`User found with ${currentPoints} points`);

    if (currentPoints < pointsToConvert) {
      return { 
        success: false, 
        error: `Insufficient points. You have ${currentPoints} points.`
      };
    }

    // Get token balance before transaction
    const tokenBalance = await getUserTokenBalance(userId);
    const tokenDocRef = doc(db, COLLECTIONS.TOKEN_BALANCES, userId);
    const tokenDoc = await getDoc(tokenDocRef);
    logger.info(`Current token balance: ${tokenBalance.tokens}, will add ${tokensToGenerate}`);

    // Perform the conversion in a transaction
    await runTransaction(db, async (transaction) => {
      logger.info(`Starting transaction - deducting ${pointsToConvert} points, adding ${tokensToGenerate} tokens`);
      
      // Deduct points from user profile
      transaction.update(userRef, {
        points: currentPoints - pointsToConvert,
        updatedAt: new Date()
      });

      // Add TOA tokens to tokenBalances collection
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
      const today = new Date().toISOString().split('T')[0];
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

    logger.info(`Transaction completed successfully`);

    // Verify the changes were actually written
    const updatedUserDoc = await getDoc(userRef);
    const updatedUserData = updatedUserDoc.data() as any;
    logger.info(`After transaction - User points in DB: ${updatedUserData.points}`);
    
    const updatedTokenDoc = await getDoc(tokenDocRef);
    if (updatedTokenDoc.exists()) {
      const updatedTokenData = updatedTokenDoc.data() as any;
      logger.info(`After transaction - Token balance in DB: ${updatedTokenData.tokens}`);
    }

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

// Check user's conversion status
export const getConversionStatus = async (userId: string) => {
  try {
    // Get user's current points (check all collections using authUid)
    let userDocSnapshot = null;
    
    // Check technicians collection
    const techQuery = query(collection(db, COLLECTIONS.TECHNICIANS), where('authUid', '==', userId));
    const techDocs = await getDocs(techQuery);
    
    if (!techDocs.empty) {
      userDocSnapshot = techDocs.docs[0];
    } else {
      // Check clients collection
      const clientQuery = query(collection(db, COLLECTIONS.CLIENTS), where('authUid', '==', userId));
      const clientDocs = await getDocs(clientQuery);
      
      if (!clientDocs.empty) {
        userDocSnapshot = clientDocs.docs[0];
      } else {
        // Check admins collection
        const adminQuery = query(collection(db, COLLECTIONS.ADMINS), where('authUid', '==', userId));
        const adminDocs = await getDocs(adminQuery);
        
        if (!adminDocs.empty) {
          userDocSnapshot = adminDocs.docs[0];
        } else {
          return { availablePoints: 0, canConvert: 0 };
        }
      }
    }

    const userData = userDocSnapshot.data() as any;
    const availablePoints = userData.points || 0;

    const maxConvertableFromPoints = Math.floor(availablePoints / CONVERSION_SYSTEM.pointsToTOARate);

    return {
      availablePoints,
      canConvert: Math.max(0, maxConvertableFromPoints),
      conversionRate: CONVERSION_SYSTEM.pointsToTOARate
    };

  } catch (error) {
    logger.error('Error getting conversion status:', error);
    return { availablePoints: 0, canConvert: 0 };
  }
};
