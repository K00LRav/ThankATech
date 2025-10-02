/**
 * Reset Password API
 * Actually resets the user's password using the validated token
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin (if not already initialized)
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Token and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    console.log(`🔐 Processing password reset for token: ${token.substring(0, 8)}...`);

    // Validate token first
    const db = getFirestore();
    const tokenDoc = doc(db, 'passwordResets', token);
    const tokenSnap = await getDoc(tokenDoc);

    if (!tokenSnap.exists()) {
      return NextResponse.json(
        { success: false, message: 'Invalid reset token' },
        { status: 404 }
      );
    }

    const tokenData = tokenSnap.data();
    
    // Check if token is expired
    const now = new Date();
    const expiresAt = tokenData.expiresAt.toDate();
    
    if (now > expiresAt) {
      return NextResponse.json(
        { success: false, message: 'Reset token has expired' },
        { status: 410 }
      );
    }

    // Check if token has already been used
    if (tokenData.used) {
      return NextResponse.json(
        { success: false, message: 'Reset token has already been used' },
        { status: 410 }
      );
    }

    const userEmail = tokenData.email;

    // Update user's password in Firebase Auth
    try {
      const auth = getAuth();
      const userRecord = await auth.getUserByEmail(userEmail);
      
      await auth.updateUser(userRecord.uid, {
        password: newPassword,
      });

      console.log(`✅ Password updated successfully for user: ${userEmail}`);
    } catch (authError: any) {
      console.error('❌ Firebase Auth error:', authError);
      
      if (authError.code === 'auth/user-not-found') {
        return NextResponse.json(
          { success: false, message: 'User account not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { success: false, message: 'Failed to update password' },
        { status: 500 }
      );
    }

    // Mark token as used
    await updateDoc(tokenDoc, {
      used: true,
      usedAt: new Date(),
    });

    console.log(`🎉 Password reset completed successfully for: ${userEmail}`);

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully! You can now sign in with your new password.'
    });

  } catch (error) {
    console.error('❌ Password reset error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}