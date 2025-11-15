import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger';

/**
 * Fix duplicate profile documents
 * 
 * When called with a username, syncs data from the duplicate document 
 * (created by profile page bug) to the original document (shown on /username page)
 * 
 * Usage: POST /api/admin/fix-profile
 * Body: { username: "goodtek", adminSecret: "your-secret" }
 */
export async function POST(request: NextRequest) {
  try {
    const { username, adminSecret } = await request.json();
    
    // Simple security check
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (!username) {
      return NextResponse.json(
        { error: 'Username required' },
        { status: 400 }
      );
    }
    
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Firebase Admin not configured' },
        { status: 503 }
      );
    }
    
    const normalizedUsername = username.toLowerCase().trim();
    logger.info(`🔍 Fixing profile for username: ${normalizedUsername}`);
    
    // Find original document by username
    const usernameQuery = await adminDb.collection('technicians')
      .where('username', '==', normalizedUsername)
      .limit(1)
      .get();
    
    if (usernameQuery.empty) {
      return NextResponse.json(
        { error: `No profile found with username: ${username}` },
        { status: 404 }
      );
    }
    
    const originalDoc = usernameQuery.docs[0];
    const originalData = originalDoc.data();
    
    logger.info(`✅ Found original profile: ${originalDoc.id}`);
    
    // Check if there's a duplicate
    if (!originalData.authUid) {
      return NextResponse.json({
        message: 'No authUid found - no duplicate exists',
        profile: {
          id: originalDoc.id,
          name: originalData.name,
          email: originalData.email
        }
      });
    }
    
    // Find duplicate document
    const duplicateDoc = await adminDb.collection('technicians').doc(originalData.authUid).get();
    
    if (!duplicateDoc.exists) {
      return NextResponse.json({
        message: 'No duplicate found - profile is already correct',
        profile: {
          id: originalDoc.id,
          name: originalData.name,
          email: originalData.email
        }
      });
    }
    
    const duplicateData = duplicateDoc.data();
    logger.info(`🔄 Found duplicate: ${duplicateDoc.id}`);
    
    // Merge data - prefer duplicate (most recent) but keep username
    const mergedData = {
      ...duplicateData,
      username: normalizedUsername,
      uniqueId: originalData.uniqueId,
      updatedAt: new Date().toISOString(),
    };
    
    // Update original document
    await adminDb.collection('technicians').doc(originalDoc.id).update(mergedData);
    
    logger.info(`✅ Synced data to original document ${originalDoc.id}`);
    
    return NextResponse.json({
      success: true,
      message: `Profile ${normalizedUsername} synced successfully!`,
      synced: {
        from: duplicateDoc.id,
        to: originalDoc.id,
        fields: Object.keys(duplicateData).filter(k => k !== 'createdAt')
      },
      profile: {
        id: originalDoc.id,
        name: mergedData.name,
        email: mergedData.email,
        username: mergedData.username,
        photoUpdated: !!mergedData.image || !!mergedData.photoURL,
        aboutUpdated: !!mergedData.about
      }
    });
    
  } catch (error: any) {
    logger.error('Error fixing profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fix profile' },
      { status: 500 }
    );
  }
}
