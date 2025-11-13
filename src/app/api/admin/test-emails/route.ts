import { NextRequest, NextResponse } from 'next/server';
import EmailService from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { templateType, email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email address required' },
        { status: 400 }
      );
    }

    let result = false;
    let message = '';

    switch (templateType) {
      case 'welcome-customer':
        result = await EmailService.sendWelcomeEmail(email, 'Test Customer', 'customer');
        message = 'Welcome email (Customer) sent';
        break;

      case 'welcome-technician':
        result = await EmailService.sendWelcomeEmail(email, 'Test Technician', 'technician');
        message = 'Welcome email (Technician) sent';
        break;

      case 'thank-you-received':
        result = await EmailService.sendThankYouNotification(
          email,
          'John Technician',
          'Jane Customer',
          'Great job fixing my AC! Very professional and fast service.'
        );
        message = 'Thank you notification sent';
        break;

      case 'points-received':
        result = await EmailService.sendPointsNotification(
          email,
          'John Technician',
          'Jane Customer',
          5,
          'Excellent work on the plumbing repair!'
        );
        message = 'Points notification sent';
        break;

      case 'toa-sent':
        result = await EmailService.sendToaSentNotification(
          email,
          'Jane Customer',
          'John Technician',
          100,
          'Thanks for the amazing service!'
        );
        message = 'TOA sent notification sent';
        break;

      case 'toa-received':
        result = await EmailService.sendToaReceivedNotification(
          email,
          'John Technician',
          'Jane Customer',
          100,
          'Your work was outstanding!'
        );
        message = 'TOA received notification sent';
        break;

      case 'account-deletion':
        result = await EmailService.sendAccountDeletionConfirmation(email, 'Test User');
        message = 'Account deletion confirmation sent';
        break;

      case 'password-reset':
        result = await EmailService.sendPasswordResetEmail(
          email,
          'Test User',
          `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.thankatech.com'}/reset-password?token=test-token-123`
        );
        message = 'Password reset email sent';
        break;

      case 'contact-form':
        result = await EmailService.sendContactFormNotification({
          name: 'Test Customer',
          email: 'test@example.com',
          subject: 'Test Contact Form',
          message: 'This is a test message from the contact form testing feature.',
          userType: 'Customer'
        });
        message = 'Contact form notification sent';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid template type' },
          { status: 400 }
        );
    }

    if (result) {
      return NextResponse.json({
        success: true,
        message: `✅ ${message} to ${email}`
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send email. Check Brevo configuration.' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('❌ Email test error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send test email' },
      { status: 500 }
    );
  }
}
