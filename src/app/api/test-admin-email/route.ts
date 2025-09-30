import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, message } = body;

    console.log('🔧 Admin email test started:', { to, subject });

    if (!process.env.BREVO_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'BREVO_API_KEY not found' 
      }, { status: 500 });
    }

    // Use the exact same payload structure that works in test-brevo
    const emailPayload = {
      sender: {
        name: process.env.EMAIL_FROM_NAME || 'ThankATech',
        email: process.env.EMAIL_FROM || 'noreply@thankatech.com'
      },
      to: [{ 
        email: to,
        name: to.split('@')[0] // Use email prefix as name
      }],
      subject: subject,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1e293b 0%, #1e40af 100%); color: white; border-radius: 12px;">
          <div style="padding: 40px 32px; text-align: center;">
            <h1 style="color: #60a5fa; margin-bottom: 24px;">🧪 Admin Test Email</h1>
            <p style="font-size: 18px; margin-bottom: 16px;">This is a test email from the ThankATech admin panel.</p>
            <p style="margin-bottom: 24px;">${message}</p>
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="font-size: 14px; opacity: 0.8;">Sent at: ${new Date().toISOString()}</p>
            </div>
          </div>
        </div>
      `,
      textContent: `Admin Test Email: ${message} - Sent at: ${new Date().toISOString()}`
    };

    console.log('📤 Sending admin test email via Brevo API...');

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const result = await response.json();
    
    console.log('📊 Admin Email API Response:', {
      status: response.status,
      statusText: response.statusText,
      result: result
    });

    if (response.ok) {
      console.log('✅ Admin test email sent successfully');
      return NextResponse.json({ 
        success: true, 
        messageId: result.messageId,
        message: 'Test email sent successfully!' 
      });
    } else {
      console.error('❌ Brevo API Error:', result);
      return NextResponse.json({ 
        success: false, 
        error: `Brevo API error (${response.status}): ${result.message || 'Unknown error'}`
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Admin email test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}