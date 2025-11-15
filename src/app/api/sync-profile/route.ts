import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger';

/**
 * TEMPORARY API - Sync duplicate technician profiles
 * Finds technician by username, copies data from user.uid document to the main document
 */
export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    logger.info(`🔄 Syncing profile for username: ${username}`);

    // Find the main technician document by username
    const mainDocsQuery = await adminDb.collection('technicians')
      .where('username', '==', username.toLowerCase())
      .limit(1)
      .get();

    if (mainDocsQuery.empty) {
      return NextResponse.json(
        { error: `No technician found with username: ${username}` },
        { status: 404 }
      );
    }

    const mainDoc = mainDocsQuery.docs[0];
    const mainData = mainDoc.data();
    const mainDocId = mainDoc.id;

    logger.info(`📄 Found main document: ${mainDocId}`);
    logger.info(`🔍 Looking for duplicate with authUid: ${mainData.authUid}`);

    // Find the duplicate document (created by profile page) using authUid
    if (!mainData.authUid) {
      return NextResponse.json(
        { error: 'Technician has no authUid, cannot find duplicate' },
        { status: 400 }
      );
    }

    // Check if there's a document with authUid as the document ID
    const duplicateDoc = await adminDb.collection('technicians').doc(mainData.authUid).get();

    if (!duplicateDoc.exists) {
      return NextResponse.json(
        { 
          message: `No duplicate found for ${username}. Profile is already in sync!`,
          mainDocId: mainDocId
        },
        { status: 200 }
      );
    }

    const duplicateData = duplicateDoc.data();
    logger.info(`📄 Found duplicate document: ${duplicateDoc.id}`);

    // Fields to sync from duplicate to main (updated by profile page)
    const fieldsToSync = {
      // Basic info
      name: duplicateData.name,
      phone: duplicateData.phone,
      location: duplicateData.location,
      
      // Business info
      businessName: duplicateData.businessName,
      businessAddress: duplicateData.businessAddress,
      businessPhone: duplicateData.businessPhone,
      businessEmail: duplicateData.businessEmail,
      website: duplicateData.website,
      
      // Profile details
      about: duplicateData.description || duplicateData.about, // description field in duplicate
      experience: duplicateData.experience,
      certifications: duplicateData.certifications,
      serviceArea: duplicateData.serviceArea,
      hourlyRate: duplicateData.hourlyRate,
      availability: duplicateData.availability,
      
      // Photo - prioritize newer update
      image: duplicateData.photoURL || duplicateData.image || mainData.image,
      photoURL: duplicateData.photoURL || duplicateData.image || mainData.photoURL,
      
      // Username (in case it was updated)
      username: duplicateData.username || mainData.username,
      
      // System fields
      updatedAt: new Date(),
    };

    // Remove undefined fields
    Object.keys(fieldsToSync).forEach(key => {
      if (fieldsToSync[key] === undefined) {
        delete fieldsToSync[key];
      }
    });

    // Update the main document with data from duplicate
    await adminDb.collection('technicians').doc(mainDocId).update(fieldsToSync);

    logger.info(`✅ Synced profile data from duplicate (${duplicateDoc.id}) to main (${mainDocId})`);

    return NextResponse.json({
      success: true,
      message: `Profile synced successfully for ${username}`,
      mainDocId: mainDocId,
      duplicateDocId: duplicateDoc.id,
      syncedFields: Object.keys(fieldsToSync),
      updatedData: {
        username: fieldsToSync.username,
        image: fieldsToSync.image,
        about: fieldsToSync.about,
      }
    });

  } catch (error: any) {
    logger.error('❌ Profile sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync profile' },
      { status: 500 }
    );
  }
}
