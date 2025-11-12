import { NextRequest, NextResponse } from 'next/server';
import EmailService from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formData } = body;

    console.log('📧 Contact form submission received:', { 
      name: formData?.name, 
      email: formData?.email,
      subject: formData?.subject 
    });

    // Validate required fields
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      console.error('❌ Missing required fields:', {
        hasName: !!formData.name,
        hasEmail: !!formData.email,
        hasSubject: !!formData.subject,
        hasMessage: !!formData.message
      });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Send email notification to admin
    console.log('🚀 Attempting to send email...');
    const emailSent = await EmailService.sendContactFormNotification(formData);
    console.log('📊 Email send result:', emailSent);

    if (!emailSent) {
      console.error('❌ Failed to send contact form email');
      return NextResponse.json(
        { error: 'Failed to send email notification. Please try again or contact us directly at support@thankatech.com' },
        { status: 500 }
      );
    }

    console.log('✅ Contact form processed successfully');
    // TODO: Store contact form submission in database if needed
    
    return NextResponse.json({ 
      success: true,
      message: 'Thank you for your message! We\'ll get back to you soon.' 
    });

  } catch (error: any) {
    console.error('❌ Contact form submission error:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    });
    return NextResponse.json(
      { 
        error: 'Failed to submit contact form',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}