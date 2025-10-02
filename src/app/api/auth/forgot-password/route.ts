/**
 * Custom Password Reset API - Uses Firebase REST API + Brevo Email Templates
 * This sends password reset emails using Firebase's REST API but with custom Brevo templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/email';

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

    // Use Firebase REST API to send password reset email
    const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    
    if (!firebaseApiKey) {
      console.error('❌ Firebase API key not configured');
      return NextResponse.json(
        { success: false, message: 'Email service not configured' },
        { status: 500 }
      );
    }

    try {
      // First, try to send Firebase's password reset email to see if user exists
      const firebaseResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestType: 'PASSWORD_RESET',
          email: email,
        }),
      });

      const firebaseData = await firebaseResponse.json();

      if (firebaseResponse.ok) {
        // User exists, now send our custom Brevo email
        const userName = email.split('@')[0];
        
        // Create a simple reset link that directs to Firebase's action handler
        // but we could also create our own reset page
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://thankatech.com';
        const resetLink = `${baseUrl}/?reset-password-mode=true`;

        try {
          await EmailService.sendPasswordResetEmail(email, userName, resetLink);
          console.log(`✅ Custom password reset email sent successfully to: ${email}`);
        } catch (emailError) {
          console.error('❌ Failed to send custom email, but Firebase email was sent:', emailError);
          // Don't fail the request - Firebase email was already sent
        }

        return NextResponse.json({
          success: true,
          message: `Password reset instructions have been sent to ${email}. Please check your email and spam folder.`
        });

      } else {
        // Handle Firebase errors
        if (firebaseData.error?.message?.includes('EMAIL_NOT_FOUND')) {
          // For security, don't reveal that account doesn't exist
          return NextResponse.json({
            success: true,
            message: `If an account exists for ${email}, a password reset link has been sent. Please check your email and spam folder.`
          });
        } else {
          console.error('❌ Firebase password reset error:', firebaseData.error);
          return NextResponse.json(
            { success: false, message: 'Failed to send password reset email. Please try again.' },
            { status: 500 }
          );
        }
      }
    } catch (fetchError) {
      console.error('❌ Error calling Firebase API:', fetchError);
      return NextResponse.json(
        { success: false, message: 'Failed to send password reset email. Please try again.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Password reset API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}