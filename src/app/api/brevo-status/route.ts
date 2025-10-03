/**
 * Brevo SMTP Status Checker API
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const brevoApiKey = process.env.BREVO_API_KEY;
    
    if (!brevoApiKey) {
      return NextResponse.json({
        success: false,
        error: 'BREVO_API_KEY environment variable not configured'
      }, { status: 500 });
    }

    // Check Brevo account info
    const response = await fetch('https://api.brevo.com/v3/account', {
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Brevo API error: ${response.status} ${response.statusText}`);
    }

    const accountData = await response.json();

    // Get SMTP statistics for the last 7 days
    const statsResponse = await fetch('https://api.brevo.com/v3/smtp/statistics?limit=7&offset=0&sort=desc', {
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey
      }
    });

    let statsData = null;
    if (statsResponse.ok) {
      statsData = await statsResponse.json();
    }

    // Get sending quotas and limits
    const senderResponse = await fetch('https://api.brevo.com/v3/senders', {
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey
      }
    });

    let senderData = null;
    if (senderResponse.ok) {
      senderData = await senderResponse.json();
    }

    return NextResponse.json({
      success: true,
      data: {
        account: {
          email: accountData.email,
          firstName: accountData.firstName,
          lastName: accountData.lastName,
          companyName: accountData.companyName,
          plan: accountData.planType,
          credits: accountData.credits
        },
        statistics: statsData,
        senders: senderData
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Brevo status check error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to check Brevo status'
    }, { status: 500 });
  }
}