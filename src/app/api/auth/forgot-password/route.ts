/**
 * Custom Password Reset API - Uses Brevo Email Templates
 * This replaces Firebase's default password reset to use our custom email templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { EmailService } from '@/lib/email';
import crypto from 'crypto';

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
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    console.log(`🔐 Processing password reset request for: ${email}`);

    // Check if user exists in Firebase Auth
    let userExists = false;
    let userName = email.split('@')[0]; // Default to email prefix
    
    try {
      const auth = getAuth();
      const userRecord = await auth.getUserByEmail(email);
      userExists = true;
      userName = userRecord.displayName || userName;
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.log(`⚠️ User not found in Firebase Auth: ${email}`);
        // We'll still send an email for security (don't reveal if account exists)
        userExists = false;
      } else {
        console.error('Error checking user:', error);
        return NextResponse.json(
          { success: false, message: 'Error processing request' },
          { status: 500 }
        );
      }
    }

    // Generate secure reset token (24 hour expiry)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store reset token in Firestore (even if user doesn't exist for security)
    const db = getFirestore();
    const resetTokenDoc = doc(db, 'passwordResets', resetToken);
    
    await setDoc(resetTokenDoc, {
      email,
      expiresAt,
      used: false,
      createdAt: new Date(),
    });

    // Create reset link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://thankatech.com';
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

    // Send custom password reset email using Brevo templates
    try {
      await EmailService.sendPasswordResetEmail(email, userName, resetLink);
      console.log(`✅ Password reset email sent successfully to: ${email}`);
    } catch (emailError) {
      console.error('❌ Failed to send password reset email:', emailError);
      return NextResponse.json(
        { success: false, message: 'Failed to send reset email. Please try again.' },
        { status: 500 }
      );
    }

    // Always return successful response for security (don't reveal if account exists)
    return NextResponse.json({
      success: true,
      message: `If an account exists for ${email}, a password reset link has been sent. Please check your email and spam folder.`
    });

  } catch (error) {
    console.error('❌ Password reset API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}