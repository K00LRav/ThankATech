import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Email Test API - Starting diagnostic...');
    
    // Check environment variables
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      hasBrevoApiKey: !!process.env.BREVO_API_KEY,
      brevoApiKeyPrefix: process.env.BREVO_API_KEY?.substring(0, 25) + '...',
      emailFrom: process.env.EMAIL_FROM,
      emailFromName: process.env.EMAIL_FROM_NAME,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL
    };

    console.log('🔍 Environment Check:', envCheck);

    const body = await request.json();
    const { to, subject, testType = 'basic' } = body;

    if (!to) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email address required',
        envCheck 
      }, { status: 400 });
    }

    if (!process.env.BREVO_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'BREVO_API_KEY not configured',
        envCheck 
      }, { status: 500 });
    }

    // Simple test email
    const testEmailPayload = {
      sender: {
        name: process.env.EMAIL_FROM_NAME || 'ThankATech Test',
        email: process.env.EMAIL_FROM || 'noreply@thankatech.com'
      },
      to: [{ 
        email: to,
        name: 'Test User'
      }],
      subject: subject || `ThankATech Email Test - ${new Date().toISOString()}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #1e293b 0%, #1e40af 100%); color: white; border-radius: 12px;">
          <h1 style="color: #60a5fa; text-align: center;">🔧 ThankATech Email Test</h1>
          <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #34d399;">✅ Email Service Working!</h2>
            <p><strong>Test Type:</strong> ${testType}</p>
            <p><strong>Environment:</strong> ${process.env.NODE_ENV}</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            <p><strong>From:</strong> ${process.env.EMAIL_FROM || 'noreply@thankatech.com'}</p>
            <p><strong>API Key:</strong> ${process.env.BREVO_API_KEY?.substring(0, 25)}...</p>
          </div>
          <p>If you're reading this, your Brevo email integration is working correctly! 🎉</p>
        </div>
      `,
      textContent: `
ThankATech Email Test

Email Service Working!
Test Type: ${testType}
Environment: ${process.env.NODE_ENV}
Timestamp: ${new Date().toISOString()}

If you're reading this, your Brevo email integration is working correctly!
      `
    };

    console.log('📤 Sending test email via Brevo API...');
    console.log('📋 Payload:', JSON.stringify(testEmailPayload, null, 2));

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify(testEmailPayload),
    });

    const result = await response.json();
    
    console.log('📊 Brevo API Response:', {
      status: response.status,
      statusText: response.statusText,
      result: result
    });

    if (response.ok) {
      console.log('✅ Test email sent successfully');
      
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: 'Test email sent successfully',
        envCheck,
        brevoResponse: result
      });
    } else {
      console.error('❌ Brevo API Error:', result);
      
      return NextResponse.json({
        success: false,
        error: `Brevo API error (${response.status}): ${result.message || 'Unknown error'}`,
        envCheck,
        brevoError: result,
        httpStatus: response.status
      }, { status: 500 });
    }

  } catch (error) {
    console.error('💥 Email test API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// Allow GET for simple health check
export async function GET() {
  return NextResponse.json({
    message: 'Email Test API is running',
    env: process.env.NODE_ENV,
    hasBrevoKey: !!process.env.BREVO_API_KEY,
    timestamp: new Date().toISOString()
  });
}