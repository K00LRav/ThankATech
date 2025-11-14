/**
 * API Authentication Middleware
 * Validates Firebase Auth tokens in API routes
 */

import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from './firebase-admin';
import { logger } from './logger';

export interface AuthenticatedRequest {
  userId: string;
  email: string;
  userType?: 'technician' | 'client' | 'admin';
}

/**
 * Verify Firebase ID token from Authorization header
 * Usage: const auth = await verifyAuth(request);
 */
export async function verifyAuth(request: NextRequest): Promise<AuthenticatedRequest> {
  try {
    // Get Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid Authorization header');
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    if (!idToken) {
      throw new Error('No token provided');
    }

    // Verify the ID token with Firebase Admin
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    logger.info(`✅ Authenticated user: ${decodedToken.uid} (${decodedToken.email})`);

    return {
      userId: decodedToken.uid,
      email: decodedToken.email || '',
    };
  } catch (error: any) {
    logger.error('❌ Authentication failed:', error.message);
    throw new Error('Authentication failed: ' + error.message);
  }
}

/**
 * Verify user is admin
 * Checks both admins collection and hardcoded admin email
 */
export async function verifyAdmin(userId: string, email: string): Promise<boolean> {
  try {
    // Check admins collection
    const adminDoc = await adminDb.collection('admins').doc(userId).get();
    
    if (adminDoc.exists) {
      return true;
    }

    // Check hardcoded admin email
    const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase();
    if (email.toLowerCase() === ADMIN_EMAIL) {
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Error verifying admin status:', error);
    return false;
  }
}

/**
 * Verify user owns the resource (technician ID matches auth user)
 */
export async function verifyOwnership(
  userId: string,
  technicianId: string
): Promise<boolean> {
  try {
    // Direct ID match
    if (userId === technicianId) {
      return true;
    }

    // Check if technician document's authUid matches
    const techDoc = await adminDb.collection('technicians').doc(technicianId).get();
    
    if (techDoc.exists) {
      const techData = techDoc.data();
      if (techData?.authUid === userId || techData?.uid === userId) {
        return true;
      }
    }

    // Check clients collection
    const clientDoc = await adminDb.collection('clients').doc(technicianId).get();
    
    if (clientDoc.exists) {
      const clientData = clientDoc.data();
      if (clientData?.authUid === userId || clientData?.uid === userId) {
        return true;
      }
    }

    return false;
  } catch (error) {
    logger.error('Error verifying ownership:', error);
    return false;
  }
}
