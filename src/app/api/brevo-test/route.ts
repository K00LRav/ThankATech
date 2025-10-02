/**
 * Direct Brevo Test - Check if API is working
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    console.log(`🧪 Direct Brevo API Test for: ${email}`);
    console.log(`🔑 API Key: ${process.env.BREVO_API_KEY?.substring(0, 20)}...`);
    console.log(`📧 From Email: ${process.env.EMAIL_FROM}`);
    console.log(`👤 From Name: ${process.env.EMAIL_FROM_NAME}`);

    const emailPayload = {
      sender: {
        name: process.env.EMAIL_FROM_NAME || 'ThankATech',
        email: process.env.EMAIL_FROM || 'noreply@thankatech.com'
      },
      to: [{ 
        email: email,
        name: email.split('@')[0]
      }],
      subject: 'Test Email from ThankATech',
      htmlContent: `
        <h1>Test Email</h1>
        <p>This is a test email from ThankATech to verify Brevo configuration.</p>
        <p>If you receive this, the email service is working!</p>
        <p>Sent at: ${new Date().toISOString()}</p>
      `,
      textContent: 'Test Email - If you receive this, the email service is working!'
    };

    console.log(`📤 Sending to Brevo API...`);
    console.log(`📄 Payload:`, JSON.stringify(emailPayload, null, 2));

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY!,
        'content-type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const result = await response.json();
    
    console.log(`📬 Brevo Response Status: ${response.status}`);
    console.log(`📬 Brevo Response:`, JSON.stringify(result, null, 2));

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${email}`,
        brevoResponse: result,
        debug: {
          status: response.status,
          apiKeyPrefix: process.env.BREVO_API_KEY?.substring(0, 20) + '...',
          fromEmail: process.env.EMAIL_FROM,
          fromName: process.env.EMAIL_FROM_NAME
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `Brevo API error: ${result.message || 'Unknown error'}`,
        error: result,
        debug: {
          status: response.status,
          apiKeyPrefix: process.env.BREVO_API_KEY?.substring(0, 20) + '...',
          fromEmail: process.env.EMAIL_FROM,
          fromName: process.env.EMAIL_FROM_NAME
        }
      }, { status: response.status });
    }

  } catch (error: any) {
    console.error('❌ Direct Brevo test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Test failed', 
        error: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
}