import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import EmailService from '@/lib/email';

// Note: This API provides orchestration and email sending.
// The actual Firestore operations should be done client-side since
// Firebase Admin SDK requires server credentials that aren't configured.

export async function POST(request: NextRequest) {
  try {
    const { userId, userType, userEmail, userName, clientSideResults } = await request.json();

    if (!userId || !userType) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and userType' },
        { status: 400 }
      );
    }

    if (!['technician', 'customer'].includes(userType)) {
      return NextResponse.json(
        { error: 'Invalid userType. Must be "technician" or "customer"' },
        { status: 400 }
      );
    }

    logger.info(`🗑️ Processing deletion notification for ${userType}: ${userId}`);

    const deletionResults: string[] = clientSideResults || [];
    const errors: string[] = [];

    // Send account deletion confirmation email
    if (userEmail && userName) {
      try {
        await EmailService.sendAccountDeletionConfirmation(userEmail, userName);
        deletionResults.push('✅ Sent account deletion confirmation email');
        logger.info('Sent deletion confirmation email');
      } catch (error: any) {
        errors.push(`⚠️ Failed to send confirmation email: ${error.message}`);
        logger.error('Error sending email:', error);
      }
    }

    const success = errors.length === 0;
    const summary = {
      success,
      message: success 
        ? `User ${userId} (${userType}) successfully deleted` 
        : 'User deletion completed with some errors',
      results: deletionResults,
      errors: errors.length > 0 ? errors : undefined
    };

    logger.info('Deletion process completed:', summary);

    return NextResponse.json(summary, { status: success ? 200 : 207 });

  } catch (error: any) {
    logger.error('❌ User deletion notification failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process deletion notification',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
