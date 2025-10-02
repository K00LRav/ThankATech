/**
 * Validate Reset Token API
 * Checks if a password reset token is valid and not expired
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';

// Initialize Firebase if not already done
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!getApps().length) {
  initializeApp(firebaseConfig);
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Reset token is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Validating password reset token: ${token.substring(0, 8)}...`);

    const db = getFirestore();
    const tokenDoc = doc(db, 'passwordResets', token);
    const tokenSnap = await getDoc(tokenDoc);

    if (!tokenSnap.exists()) {
      console.log('❌ Token not found in database');
      return NextResponse.json(
        { success: false, message: 'Invalid reset link. Please request a new password reset.' },
        { status: 404 }
      );
    }

    const tokenData = tokenSnap.data();
    
    // Check if token is expired
    const now = new Date();
    const expiresAt = tokenData.expiresAt.toDate();
    
    if (now > expiresAt) {
      console.log('❌ Token has expired');
      return NextResponse.json(
        { success: false, message: 'Reset link has expired. Please request a new password reset.' },
        { status: 410 }
      );
    }

    // Check if token has already been used
    if (tokenData.used) {
      console.log('❌ Token has already been used');
      return NextResponse.json(
        { success: false, message: 'Reset link has already been used. Please request a new password reset.' },
        { status: 410 }
      );
    }

    console.log(`✅ Token is valid for email: ${tokenData.email}`);

    return NextResponse.json({
      success: true,
      email: tokenData.email,
      message: 'Reset token is valid'
    });

  } catch (error) {
    console.error('❌ Token validation error:', error);
    return NextResponse.json(
      { success: false, message: 'Error validating reset token' },
      { status: 500 }
    );
  }
}