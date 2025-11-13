import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { logger } from '@/lib/logger';
import EmailService from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { userId, userType, userEmail, userName } = await request.json();

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

    logger.info(`🗑️ Starting deletion process for ${userType}: ${userId}`);

    const deletionResults: string[] = [];
    let errors: string[] = [];

    // Step 1: Delete from appropriate collection (technicians or clients)
    try {
      const collection = userType === 'technician' ? 'technicians' : 'clients';
      await adminDb.collection(collection).doc(userId).delete();
      deletionResults.push(`✅ Deleted ${userType} document from ${collection}`);
      logger.info(`Deleted user document from ${collection}`);
    } catch (error: any) {
      errors.push(`❌ Failed to delete user document: ${error.message}`);
      logger.error('Error deleting user document:', error);
    }

    // Step 2: Delete token balance
    try {
      await adminDb.collection('tokenBalances').doc(userId).delete();
      deletionResults.push('✅ Deleted token balance');
      logger.info('Deleted token balance');
    } catch (error: any) {
      // Not critical if token balance doesn't exist
      logger.warn('Token balance not found or error deleting:', error);
    }

    // Step 3: Delete or anonymize transactions
    try {
      // Get all transactions where user is involved
      const transactionsSnapshot = await adminDb
        .collection('tokenTransactions')
        .where(userType === 'technician' ? 'toTechnicianId' : 'fromUserId', '==', userId)
        .get();

      if (!transactionsSnapshot.empty) {
        const batch = adminDb.batch();
        transactionsSnapshot.forEach(doc => {
          // Anonymize instead of delete to preserve transaction history for accounting
          batch.update(doc.ref, {
            [`${userType === 'technician' ? 'toName' : 'fromName'}`]: '[Deleted User]',
            [`${userType === 'technician' ? 'toTechnicianId' : 'fromUserId'}`]: 'deleted_' + userId,
            anonymized: true,
            anonymizedAt: new Date()
          });
        });
        await batch.commit();
        deletionResults.push(`✅ Anonymized ${transactionsSnapshot.size} token transactions`);
        logger.info(`Anonymized ${transactionsSnapshot.size} transactions`);
      }
    } catch (error: any) {
      errors.push(`⚠️ Error processing transactions: ${error.message}`);
      logger.error('Error processing transactions:', error);
    }

    // Step 4: Delete thank you records
    try {
      const thankYousSnapshot = await adminDb
        .collection('thankYous')
        .where(userType === 'technician' ? 'technicianId' : 'fromUserId', '==', userId)
        .get();

      if (!thankYousSnapshot.empty) {
        const batch = adminDb.batch();
        thankYousSnapshot.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        deletionResults.push(`✅ Deleted ${thankYousSnapshot.size} thank you records`);
        logger.info(`Deleted ${thankYousSnapshot.size} thank you records`);
      }
    } catch (error: any) {
      errors.push(`⚠️ Error deleting thank yous: ${error.message}`);
      logger.error('Error deleting thank yous:', error);
    }

    // Step 5: Delete legacy transactions
    try {
      const legacyTransactionsSnapshot = await adminDb
        .collection('transactions')
        .where(userType === 'technician' ? 'technicianId' : 'fromUserId', '==', userId)
        .get();

      if (!legacyTransactionsSnapshot.empty) {
        const batch = adminDb.batch();
        legacyTransactionsSnapshot.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        deletionResults.push(`✅ Deleted ${legacyTransactionsSnapshot.size} legacy transactions`);
        logger.info(`Deleted ${legacyTransactionsSnapshot.size} legacy transactions`);
      }
    } catch (error: any) {
      errors.push(`⚠️ Error deleting legacy transactions: ${error.message}`);
      logger.error('Error deleting legacy transactions:', error);
    }

    // Step 6: Delete Firebase Authentication account
    try {
      const auth = getAuth();
      await auth.deleteUser(userId);
      deletionResults.push('✅ Deleted Firebase Authentication account');
      logger.info('Deleted Firebase Auth account');
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        deletionResults.push('⚠️ Firebase Auth account not found (may already be deleted)');
      } else {
        errors.push(`❌ Failed to delete Firebase Auth account: ${error.message}`);
        logger.error('Error deleting Firebase Auth:', error);
      }
    }

    // Step 7: Send account deletion confirmation email
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

    // Step 8: Log deletion audit trail
    try {
      await adminDb.collection('auditLogs').add({
        action: 'USER_DELETED',
        userId: userId,
        userType: userType,
        userName: userName || 'Unknown',
        userEmail: userEmail || 'Unknown',
        deletedAt: new Date(),
        deletedBy: 'admin', // You can pass admin user ID if needed
        results: deletionResults,
        errors: errors
      });
      logger.info('Audit log created');
    } catch (error: any) {
      logger.error('Error creating audit log:', error);
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
    logger.error('❌ User deletion failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete user',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
