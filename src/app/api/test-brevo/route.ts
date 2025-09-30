import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🧪 Testing Brevo API Key...');
    
    if (!process.env.BREVO_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'BREVO_API_KEY not found in environment variables' 
      }, { status: 500 });
    }

    // Test API key by getting account info
    const response = await fetch('https://api.brevo.com/v3/account', {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
    });

    const result = await response.json();
    
    console.log('📊 Brevo Account API Response:', {
      status: response.status,
      statusText: response.statusText,
      result: result
    });

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: 'Brevo API key is valid',
        accountInfo: {
          email: result.email,
          firstName: result.firstName,
          lastName: result.lastName,
          companyName: result.companyName,
          plan: result.plan
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: `Brevo API error (${response.status}): ${result.message || 'Unknown error'}`,
        details: result
      }, { status: 500 });
    }

  } catch (error) {
    console.error('💥 Brevo API test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing Brevo Email Send...');
    
    const body = await request.json();
    const { to } = body;

    if (!to) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email address required' 
      }, { status: 400 });
    }

    if (!process.env.BREVO_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'BREVO_API_KEY not found' 
      }, { status: 500 });
    }

    // Simple test email payload
    const emailPayload = {
      sender: {
        name: 'ThankATech Test',
        email: 'noreply@thankatech.com'
      },
      to: [{ 
        email: to,
        name: 'Test User'
      }],
      subject: 'Brevo API Test - Simple Email',
      htmlContent: `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h1 style="color: #1e40af;">🔧 Brevo API Test</h1>
            <p>This is a simple test email to validate Brevo integration.</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Test Details:</strong></p>
              <p>API Key: ${process.env.BREVO_API_KEY?.substring(0, 25)}...</p>
              <p>Sender: noreply@thankatech.com</p>
              <p>Timestamp: ${new Date().toISOString()}</p>
            </div>
            <p>If you received this email, the Brevo integration is working! 🎉</p>
          </body>
        </html>
      `,
      textContent: 'Brevo API Test - If you received this email, the integration is working!'
    };

    console.log('📤 Sending test email via Brevo API...');

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
    
    console.log('📊 Brevo Email API Response:', {
      status: response.status,
      statusText: response.statusText,
      result: result
    });

    if (response.ok) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: 'Test email sent successfully',
        brevoResponse: result
      });
    } else {
      return NextResponse.json({
        success: false,
        error: `Brevo API error (${response.status}): ${result.message || 'Unknown error'}`,
        details: result,
        httpStatus: response.status
      }, { status: 500 });
    }

  } catch (error) {
    console.error('💥 Brevo email test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error occurred'
    }, { status: 500 });
  }
}