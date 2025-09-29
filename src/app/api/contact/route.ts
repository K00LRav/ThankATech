import { NextRequest, NextResponse } from 'next/server';
import EmailService from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formData } = body;

    // Validate required fields
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Send email notification to admin
    const emailSent = await EmailService.sendContactFormNotification(formData);

    if (!emailSent) {
      console.error('Failed to send contact form email');
      // Don't fail the request if email fails - log it instead
    }

    // TODO: Store contact form submission in database if needed
    
    return NextResponse.json({ 
      success: true,
      message: 'Thank you for your message! We\'ll get back to you soon.' 
    });

  } catch (error) {
    console.error('Contact form submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit contact form' },
      { status: 500 }
    );
  }
}