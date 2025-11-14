import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import EmailService from '@/lib/email';
import { verifyAuth, verifyAdmin } from '@/lib/api-auth';

// Note: This API provides orchestration and email sending.
// The actual Firestore operations should be done client-side since
// Firebase Admin SDK requires server credentials that aren't configured.

export async function POST(request: NextRequest) {
  try {
    // ===== AUTHENTICATION & ADMIN CHECK =====
    let auth;
    try {
      auth = await verifyAuth(request);
    } catch (authError: any) {
      logger.error('❌ Authentication failed:', authError.message);
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    logger.info(`🔐 Authenticated user: ${auth.userId} (${auth.email})`);

    // Verify user is admin
    const isAdmin = await verifyAdmin(auth.userId, auth.email);
    
    if (!isAdmin) {
      logger.error(`❌ Non-admin user ${auth.userId} attempted to delete user`);
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    logger.info(`✅ Admin ${auth.userId} authorized for user deletion`);

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
