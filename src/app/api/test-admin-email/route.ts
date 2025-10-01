import { NextRequest, NextResponse } from 'next/server';
import EmailService from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, message, templateData } = body;

    // Admin Email Test - Request received

    // Validate required fields
    if (!to || !subject || !message) {
      // Admin Email Test - Missing required fields
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, message' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      // Admin Email Test - Invalid email format
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      );
    }

    console.log('📧 Admin Email Test - Attempting to send email...');
    console.log('📋 Email Details:', {
      recipient: to,
      subject,
      messagePreview: message.substring(0, 100) + '...',
      fullMessageLength: message.length
    });

    // Send email directly using the raw email method
    const emailSent = await EmailService.sendRawEmail(to, subject, message);

    if (emailSent) {
      // Admin Email Test - Email sent successfully
      
      return NextResponse.json({ 
        success: true,
        message: 'Test email sent successfully!',
        details: {
          recipient: to,
          subject,
          timestamp: new Date().toISOString(),
          status: 'DELIVERED'
        }
      });
    } else {
      // Admin Email Test - Email service error
      
      return NextResponse.json(
        { 
          error: 'Email service failed to send email',
          details: 'Check server logs for email service configuration'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('💥 Admin Email Test - Error occurred:', error);
    console.error('🔍 Error details:', {
      message: error.message,
      stack: error.stack?.substring(0, 200) + '...'
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to send test email',
        details: error.message 
      },
      { status: 500 }
    );
  }
}