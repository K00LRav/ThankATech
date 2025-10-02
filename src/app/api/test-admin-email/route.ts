/**
 * Admin Email Testing API - Test email functionality from admin panel
 */

import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/email';

export async function POST(request: NextRequest) {
  console.log('🧪 Admin email API called');
  
  try {
    console.log('📄 Parsing request body...');
    const { email, to, subject, message, testType = 'basic' } = await request.json();
    console.log('✅ Request body parsed successfully');

    // Accept either 'email' or 'to' parameter for backwards compatibility
    const recipientEmail = email || to;

    if (!recipientEmail) {
      return NextResponse.json(
        { success: false, message: 'Email is required (use "email" or "to" parameter)' },
        { status: 400 }
      );
    }

    console.log(`🧪 Admin Email Test - Type: ${testType}, To: ${recipientEmail}`);
    console.log(`📄 Subject: ${subject || 'Default test subject'}`);
    console.log(`� Message: ${message || 'Default test message'}`);
    console.log(`�🔑 Brevo API Key exists: ${!!process.env.BREVO_API_KEY}`);
    console.log(`📧 From Email: ${process.env.EMAIL_FROM}`);
    console.log(`👤 From Name: ${process.env.EMAIL_FROM_NAME}`);

    try {
      let result;
      
      // If admin panel provided custom subject and message, use them
      if (subject && message) {
        result = await EmailService.sendRawEmail(
          recipientEmail, 
          subject, 
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 8px;">
              <h1 style="color: #1e293b; text-align: center;">📧 Admin Test Email</h1>
              <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <p style="color: #475569; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
              </div>
              <div style="margin-top: 20px; padding: 15px; background: #e0f2fe; border-radius: 6px; border-left: 4px solid #0284c7;">
                <p style="margin: 0; color: #0c4a6e; font-size: 14px;">
                  <strong>Test Details:</strong><br>
                  To: ${recipientEmail}<br>
                  From: ${process.env.EMAIL_FROM}<br>
                  Sent: ${new Date().toISOString()}<br>
                  Environment: ${process.env.NODE_ENV}
                </p>
              </div>
            </div>
          `
        );
      } else {
        // Use template-based testing
        switch (testType) {
          case 'password-reset':
            const userName = recipientEmail.split('@')[0];
            const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://thankatech.com'}/reset-password?token=test-token-123`;
            result = await EmailService.sendPasswordResetEmail(recipientEmail, userName, resetLink);
            break;
            
          case 'welcome':
            const name = recipientEmail.split('@')[0];
            result = await EmailService.sendWelcomeEmail(recipientEmail, name, 'customer');
            break;
            
          case 'thank-you':
            result = await EmailService.sendToaReceivedNotification(recipientEmail, 'Test Technician', 'Test Customer', 5, 'Great work!');
            break;
            
          case 'toaSent':
            result = await EmailService.sendToaSentNotification(recipientEmail, 'Test Customer', 'Test Technician', 5, 'Excellent service!');
            break;
            
          case 'toaReceived':
            result = await EmailService.sendToaReceivedNotification(recipientEmail, 'Test Technician', 'Test Customer', 5, 'Thank you for your service!');
            break;
            
          case 'pointsReceived':
            result = await EmailService.sendPointsNotification(recipientEmail, 'Test Technician', 'Test Customer', 10, 'Points earned for great service!');
            break;
            
          default: // basic test
            result = await EmailService.sendRawEmail(
              recipientEmail, 
              'ThankATech Admin Test Email', 
              `
                <h1>🧪 Admin Email Test</h1>
                <p>This is a test email sent from the ThankATech admin panel.</p>
                <p><strong>Test Details:</strong></p>
                <ul>
                  <li>To: ${recipientEmail}</li>
                  <li>From: ${process.env.EMAIL_FROM}</li>
                  <li>Sent: ${new Date().toISOString()}</li>
                  <li>Environment: ${process.env.NODE_ENV}</li>
                </ul>
                <p>If you receive this email, the email service is working correctly! ✅</p>
              `
            );
        }
      }

      if (result) {
        console.log(`✅ Admin test email sent successfully to: ${recipientEmail}`);
        return NextResponse.json({
          success: true,
          message: `Test email sent successfully to ${recipientEmail}`,
          timestamp: new Date().toISOString(),
          debug: {
            brevoConfigured: !!process.env.BREVO_API_KEY,
            emailFrom: process.env.EMAIL_FROM,
            emailFromName: process.env.EMAIL_FROM_NAME,
            testType: testType,
            recipient: recipientEmail,
            subject: subject || 'Template-based test'
          }
        });
      } else {
        throw new Error('Email service returned false');
      }

    } catch (emailError: any) {
      console.error('❌ Admin email test failed:', emailError);
      
      return NextResponse.json({
        success: false,
        message: `Failed to send test email: ${emailError.message}`,
        error: emailError.message,
        debug: {
          brevoConfigured: !!process.env.BREVO_API_KEY,
          emailFrom: process.env.EMAIL_FROM,
          emailFromName: process.env.EMAIL_FROM_NAME,
          testType: testType
        }
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ Admin email test API error:', error);
    console.error('❌ Error stack:', error.stack);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error', 
        error: error.message,
        details: error.stack?.substring(0, 500) // First 500 chars of stack trace
      },
      { status: 500 }
    );
  }
}