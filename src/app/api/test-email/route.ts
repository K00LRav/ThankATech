/**
 * Test Email API - Debug email sending
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

    console.log(`🧪 Testing email send to: ${email}`);
    console.log(`🔑 Brevo API Key configured: ${!!process.env.BREVO_API_KEY}`);
    console.log(`📧 Email from configured: ${process.env.EMAIL_FROM}`);

    try {
      // Test sending a simple password reset email
      const userName = email.split('@')[0];
      const resetLink = 'https://thankatech.com/test-reset-link';
      
      console.log(`🧪 About to send test email...`);
      console.log(`📧 From: ${process.env.EMAIL_FROM}`);
      console.log(`👤 From Name: ${process.env.EMAIL_FROM_NAME}`);
      console.log(`🔑 Brevo API Key exists: ${!!process.env.BREVO_API_KEY}`);
      console.log(`🎯 To: ${email}`);
      console.log(`👤 User: ${userName}`);
      console.log(`🔗 Reset Link: ${resetLink}`);
      
      await EmailService.sendPasswordResetEmail(email, userName, resetLink);
      
      console.log(`✅ Test email sent successfully to: ${email}`);
      
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${email}`,
        debug: {
          brevoConfigured: !!process.env.BREVO_API_KEY,
          emailFrom: process.env.EMAIL_FROM,
          emailFromName: process.env.EMAIL_FROM_NAME
        }
      });

    } catch (emailError: any) {
      console.error('❌ Email send error:', emailError);
      
      return NextResponse.json({
        success: false,
        message: `Failed to send email: ${emailError.message}`,
        debug: {
          brevoConfigured: !!process.env.BREVO_API_KEY,
          emailFrom: process.env.EMAIL_FROM,
          emailFromName: process.env.EMAIL_FROM_NAME,
          error: emailError.message
        }
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ Test email API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}