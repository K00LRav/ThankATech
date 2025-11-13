import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import EmailService from '@/lib/email';
import { logger } from '@/lib/logger';

const COLLECTIONS = {
  TOKEN_BALANCES: 'tokenBalances',
  TOKEN_TRANSACTIONS: 'tokenTransactions',
  CLIENTS: 'clients',
  TECHNICIANS: 'technicians',
  DAILY_LIMITS: 'dailyLimits'
};

const PAYOUT_MODEL = {
  customerPaysPerTOA: 0.01,
  technicianGetsPerTOA: 0.0085,
  platformFeePerTOA: 0.0015
};

const POINTS_LIMITS = {
  POINTS_PER_THANK_YOU: 1,
  POINTS_PER_TOA_TRANSACTION: 2
};

const TOKEN_LIMITS = {
  FREE_DAILY_LIMIT: 1
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { fromUserId, toTechnicianId, tokens, message, isFreeThankYou } = body;

    if (!fromUserId || !toTechnicianId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate token amount for paid transactions
    if (!isFreeThankYou && (!tokens || tokens <= 0)) {
      return NextResponse.json(
        { success: false, error: 'Invalid token amount' },
        { status: 400 }
      );
    }

    // For free thank yous, generate a random meaningful message if not provided
    if (isFreeThankYou && !message) {
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
      message = thankYouMessages[Math.floor(Math.random() * thankYouMessages.length)];
    }

    // For paid transactions, check balance
    if (!isFreeThankYou) {
      const balanceDoc = await adminDb.collection(COLLECTIONS.TOKEN_BALANCES).doc(fromUserId).get();
      if (!balanceDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'No token balance found' },
          { status: 400 }
        );
      }

      const balance = balanceDoc.data();
      if ((balance?.tokens || 0) < tokens) {
        return NextResponse.json(
          { success: false, error: 'Insufficient token balance' },
          { status: 400 }
        );
      }
    }

    // Fetch sender and recipient names
    let senderData: any = {};
    let senderType: 'client' | 'technician' = 'client';

    // Find sender (client or technician)
    const clientsQuery = await adminDb.collection(COLLECTIONS.CLIENTS)
      .where('authUid', '==', fromUserId)
      .limit(1)
      .get();

    if (!clientsQuery.empty) {
      senderData = clientsQuery.docs[0].data();
      senderType = 'client';
    } else {
      const techQuery = await adminDb.collection(COLLECTIONS.TECHNICIANS)
        .where('authUid', '==', fromUserId)
        .limit(1)
        .get();

      if (!techQuery.empty) {
        senderData = techQuery.docs[0].data();
        senderType = 'technician';
      }
    }

    const recipientDoc = await adminDb.collection(COLLECTIONS.TECHNICIANS).doc(toTechnicianId).get();
    if (!recipientDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Technician not found' },
        { status: 404 }
      );
    }

    const recipientData = recipientDoc.data();
    const fromName = senderData?.name || senderData?.displayName || senderData?.businessName || (senderType === 'technician' ? 'Technician' : 'Customer');
    const toName = recipientData?.name || 'Technician';

    // Calculate TOA business model values
    const dollarValue = isFreeThankYou ? 0 : tokens * PAYOUT_MODEL.customerPaysPerTOA;
    const technicianPayout = isFreeThankYou ? 0 : tokens * PAYOUT_MODEL.technicianGetsPerTOA;
    const platformFee = isFreeThankYou ? 0 : tokens * PAYOUT_MODEL.platformFeePerTOA;
    const pointsAwarded = isFreeThankYou ? POINTS_LIMITS.POINTS_PER_THANK_YOU : POINTS_LIMITS.POINTS_PER_TOA_TRANSACTION;

    // Create transaction record
    const transaction = {
      fromUserId,
      toTechnicianId,
      fromName,
      toName,
      technicianName: toName,
      tokens: tokens || 0,
      message: message || '',
      isRandomMessage: !isFreeThankYou,
      timestamp: new Date(),
      type: isFreeThankYou ? 'thank_you' : 'toa_token',
      dollarValue,
      technicianPayout,
      platformFee,
      pointsAwarded
    };

    const transactionRef = await adminDb.collection(COLLECTIONS.TOKEN_TRANSACTIONS).add(transaction);

    // Update balances and limits
    if (!isFreeThankYou) {
      // Deduct tokens from sender
      await adminDb.collection(COLLECTIONS.TOKEN_BALANCES).doc(fromUserId).update({
        tokens: adminDb.FieldValue.increment(-tokens),
        totalSpent: adminDb.FieldValue.increment(tokens),
        lastUpdated: new Date()
      });
    } else {
      // Update daily limit counter
      const today = new Date().toISOString().split('T')[0];
      const limitId = `${fromUserId}_${toTechnicianId}_${today}`;
      const limitRef = adminDb.collection(COLLECTIONS.DAILY_LIMITS).doc(limitId);
      const limitDoc = await limitRef.get();

      if (limitDoc.exists) {
        await limitRef.update({
          freeThankYous: adminDb.FieldValue.increment(1)
        });
      } else {
        await limitRef.set({
          userId: fromUserId,
          technicianId: toTechnicianId,
          date: today,
          freeThankYous: 1,
          maxFreeThankYous: TOKEN_LIMITS.FREE_DAILY_LIMIT
        });
      }
    }

    // Update technician stats
    const updateData: any = {
      points: adminDb.FieldValue.increment(pointsAwarded),
      totalThankYous: adminDb.FieldValue.increment(1),
      totalTips: adminDb.FieldValue.increment(isFreeThankYou ? 0 : tokens),
      lastAppreciationDate: new Date()
    };

    if (!isFreeThankYou) {
      updateData.totalToaReceived = adminDb.FieldValue.increment(tokens);
      updateData.totalToaValue = adminDb.FieldValue.increment(dollarValue);
      updateData.totalEarnings = adminDb.FieldValue.increment(technicianPayout);
    }

    await adminDb.collection(COLLECTIONS.TECHNICIANS).doc(toTechnicianId).update(updateData);

    // Update sender stats
    if (senderType === 'client') {
      const clientsQuery2 = await adminDb.collection(COLLECTIONS.CLIENTS)
        .where('authUid', '==', fromUserId)
        .limit(1)
        .get();

      if (!clientsQuery2.empty) {
        const senderUpdateData: any = {
          totalThankYousSent: adminDb.FieldValue.increment(1),
          lastAppreciationDate: new Date()
        };

        if (!isFreeThankYou) {
          senderUpdateData.points = adminDb.FieldValue.increment(1);
          senderUpdateData.totalToaSent = adminDb.FieldValue.increment(tokens);
          senderUpdateData.totalSpent = adminDb.FieldValue.increment(dollarValue);
          senderUpdateData.totalTokensSent = adminDb.FieldValue.increment(tokens);
        }

        await adminDb.collection(COLLECTIONS.CLIENTS).doc(clientsQuery2.docs[0].id).update(senderUpdateData);
      }
    } else if (senderType === 'technician') {
      const senderUpdateData: any = {
        totalThankYousSent: adminDb.FieldValue.increment(1),
        lastAppreciationDate: new Date()
      };

      if (!isFreeThankYou) {
        senderUpdateData.points = adminDb.FieldValue.increment(1);
        senderUpdateData.totalToaSent = adminDb.FieldValue.increment(tokens);
        senderUpdateData.totalSpent = adminDb.FieldValue.increment(dollarValue);
        senderUpdateData.totalTokensSent = adminDb.FieldValue.increment(tokens);
      }

      await adminDb.collection(COLLECTIONS.TECHNICIANS).doc(fromUserId).update(senderUpdateData);
    }

    // Send email notifications
    try {
      const senderEmail = senderData?.email;
      const recipientEmail = recipientData?.email;

      // Send email to recipient (technician)
      if (recipientEmail) {
        if (isFreeThankYou) {
          await EmailService.sendThankYouNotification(
            recipientEmail,
            toName,
            fromName,
            message
          );
          logger.info(`✉️ Sent thank you email to ${recipientEmail}`);
        } else {
          await EmailService.sendToaReceivedNotification(
            recipientEmail,
            toName,
            fromName,
            tokens,
            message
          );
          logger.info(`✉️ Sent TOA received email to ${recipientEmail}`);
        }
      }

      // Send confirmation email to sender
      if (senderEmail && !isFreeThankYou) {
        await EmailService.sendToaSentNotification(
          senderEmail,
          fromName,
          toName,
          tokens,
          message
        );
        logger.info(`✉️ Sent TOA sent confirmation to ${senderEmail}`);
      }
    } catch (emailError) {
      logger.error('❌ Failed to send notification emails:', emailError);
      // Don't fail the transaction if email fails
    }

    return NextResponse.json({
      success: true,
      transactionId: transactionRef.id
    });

  } catch (error: any) {
    logger.error('❌ Error sending tokens:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send tokens' },
      { status: 500 }
    );
  }
}
