import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import EmailService from '@/lib/email';
import { logger } from '@/lib/logger';
import { verifyAuth } from '@/lib/api-auth';

const COLLECTIONS = {
  CLIENTS: 'clients',
  TECHNICIANS: 'technicians'
};

// Simple API to send email notifications after token transfer
export async function POST(request: NextRequest) {
  try {
    // ===== AUTHENTICATION CHECK =====
    let auth;
    try {
      auth = await verifyAuth(request);
    } catch (authError: any) {
      logger.error('❌ Authentication failed:', authError.message);
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please sign in to send tokens' },
        { status: 401 }
      );
    }

    logger.info(`🔐 Authenticated user: ${auth.userId} (${auth.email})`);

    const body = await request.json();
    const { fromUserId, toTechnicianId, tokens, message, isFreeThankYou } = body;

    if (!fromUserId || !toTechnicianId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // ===== AUTHORIZATION CHECK =====
    // Verify the authenticated user matches the fromUserId
    if (auth.userId !== fromUserId) {
      logger.error(`❌ User ${auth.userId} attempted to send tokens as ${fromUserId}`);
      return NextResponse.json(
        { success: false, error: 'Forbidden - You can only send your own tokens' },
        { status: 403 }
      );
    }

    logger.info(`✅ Authorized token send: User ${auth.userId} sending ${tokens} tokens to ${toTechnicianId}`);

    // Fetch sender and recipient data for emails
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
      return NextResponse.json(
        { success: false, error: 'Failed to send emails' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Emails sent successfully'
    });

  } catch (error: any) {
    logger.error('❌ Error sending notification emails:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send notifications' },
      { status: 500 }
    );
  }
}
