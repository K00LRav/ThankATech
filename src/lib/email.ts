/**
 * Email service using Resend
 * Handles all email notifications for ThankATech
 */

interface EmailData {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

// Email Header and Footer Components
const EmailHeader = `
  <div style="background: linear-gradient(135deg, #1e293b 0%, #1e40af 100%); padding: 32px 24px; text-align: center; border-radius: 16px 16px 0 0;">
    <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 16px;">
      <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">
        🔧
      </div>
      <h1 style="font-size: 32px; font-weight: bold; background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; font-family: Arial, sans-serif;">
        ThankATech
      </h1>
    </div>
    <p style="color: #cbd5e1; font-size: 16px; margin: 0; font-family: Arial, sans-serif;">
      Connecting skilled technicians with appreciative clients
    </p>
  </div>
`;

const EmailFooter = `
  <div style="background: #0f172a; padding: 32px 24px; text-align: center; border-radius: 0 0 16px 16px; margin-top: 32px;">
    <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px;">
      <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 16px;">
        <div style="width: 24px; height: 24px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 14px;">
          🔧
        </div>
        <span style="color: #60a5fa; font-weight: bold; font-size: 18px; font-family: Arial, sans-serif;">ThankATech</span>
      </div>
      
      <p style="color: #94a3b8; font-size: 14px; margin-bottom: 16px; font-family: Arial, sans-serif;">
        Thank you for being part of the ThankATech community!
      </p>
      
      <div style="margin-bottom: 20px;">
        <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://thankatech.com'}" style="color: #60a5fa; text-decoration: none; font-size: 14px; margin: 0 12px; font-family: Arial, sans-serif;">🏠 Home</a>
        <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://thankatech.com'}/dashboard" style="color: #60a5fa; text-decoration: none; font-size: 14px; margin: 0 12px; font-family: Arial, sans-serif;">📊 Dashboard</a>
        <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://thankatech.com'}/contact" style="color: #60a5fa; text-decoration: none; font-size: 14px; margin: 0 12px; font-family: Arial, sans-serif;">📧 Contact</a>
      </div>
      
      <p style="color: #64748b; font-size: 12px; margin: 0; font-family: Arial, sans-serif;">
        © ${new Date().getFullYear()} ThankATech. All rights reserved.<br>
        Need help? Contact us at <a href="mailto:support@thankatech.com" style="color: #34d399; text-decoration: none;">support@thankatech.com</a>
      </p>
    </div>
  </div>
`;

// Email templates
export const EmailTemplates = {
  // Welcome email for new registrations
  welcome: (name: string, userType: 'customer' | 'technician') => ({
    subject: `Welcome to ThankATech, ${name}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); overflow: hidden;">
        ${EmailHeader}
        
        <div style="padding: 40px 32px; background: white;">
          <h2 style="color: #1e293b; margin-bottom: 24px; font-size: 28px; text-align: center;">Welcome to ThankATech!</h2>
          <p style="font-size: 18px; margin-bottom: 24px; color: #475569; text-align: center;">Hi ${name},</p>
          
          ${userType === 'technician' 
            ? `
              <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding: 24px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
                <p style="margin-bottom: 16px; color: #065f46;">Your technician profile is now live! Customers can now find and thank you for your excellent work.</p>
                <p style="margin-bottom: 24px; color: #065f46;">Start building your reputation and earning tips from satisfied customers.</p>
              </div>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">🚀 View Your Dashboard</a>
              </div>
            `
            : `
              <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 24px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #3b82f6;">
                <p style="margin-bottom: 16px; color: #1e40af;">You can now thank technicians and show your appreciation for their great work!</p>
                <p style="margin-bottom: 24px; color: #1e40af;">Discover skilled technicians in your area and support them with thanks and tips.</p>
              </div>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${process.env.NEXT_PUBLIC_BASE_URL}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">🔍 Explore Technicians</a>
              </div>
            `
          }
        </div>
        
        ${EmailFooter}
      </div>
    `
  }),

  // Thank you notification for technicians
  thankYouReceived: (technicianName: string, customerName: string, message?: string) => ({
    subject: `You received a thank you from ${customerName}! 👍`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); overflow: hidden;">
        ${EmailHeader}
        
        <div style="padding: 40px 32px; background: white;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 36px;">
              👍
            </div>
            <h2 style="color: #1e293b; margin-bottom: 16px; font-size: 28px;">You Got a Thank You!</h2>
          </div>
          
          <p style="font-size: 18px; margin-bottom: 16px; color: #475569; text-align: center;">Hi ${technicianName},</p>
          
          <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding: 24px; border-radius: 12px; margin: 24px 0; text-align: center; border-left: 4px solid #10b981;">
            <p style="margin-bottom: 8px; color: #065f46; font-size: 18px;"><strong>${customerName}</strong> just thanked you for your excellent work!</p>
          </div>
          
          ${message ? `
            <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 20px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #64748b;">
              <p style="color: #475569; font-style: italic; margin: 0; font-size: 16px; text-align: center;">"${message}"</p>
            </div>
          ` : ''}
          
          <p style="margin: 24px 0; color: #475569; text-align: center;">Keep up the great work! Every thank you builds your reputation and helps you stand out to potential clients.</p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">📊 View Dashboard</a>
          </div>
        </div>
        
        ${EmailFooter}
      </div>
    `
  }),

  // Tip notification for technicians
  tipReceived: (technicianName: string, customerName: string, amount: number, message?: string) => ({
    subject: `You received a $${amount} tip from ${customerName}! 💰`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); overflow: hidden;">
        ${EmailHeader}
        
        <div style="padding: 40px 32px; background: white;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 36px;">
              💰
            </div>
            <h2 style="color: #1e293b; margin-bottom: 16px; font-size: 28px;">You Received a Tip!</h2>
          </div>
          
          <p style="font-size: 18px; margin-bottom: 16px; color: #475569; text-align: center;">Hi ${technicianName},</p>
          
          <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); padding: 24px; border-radius: 12px; margin: 24px 0; text-align: center; border-left: 4px solid #f59e0b;">
            <p style="margin-bottom: 8px; color: #92400e; font-size: 20px;"><strong>${customerName}</strong> just sent you a <strong style="color: #d97706;">$${amount} tip</strong>! 🎉</p>
          </div>
          
          ${message ? `
            <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 20px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #64748b;">
              <p style="color: #475569; font-style: italic; margin: 0; font-size: 16px; text-align: center;">"${message}"</p>
            </div>
          ` : ''}
          
          <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 20px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; color: #1e40af; text-align: center;">💳 The tip will be processed and added to your earnings. You can request a payout anytime from your dashboard.</p>
          </div>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);">💰 View Earnings</a>
          </div>
        </div>
        
        ${EmailFooter}
      </div>
    `
  }),

  // Account deletion confirmation
  accountDeleted: (name: string) => ({
    subject: 'Your ThankATech account has been deleted',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); overflow: hidden;">
        ${EmailHeader}
        
        <div style="padding: 40px 32px; background: white;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 36px;">
              🗑️
            </div>
            <h2 style="color: #dc2626; margin-bottom: 16px; font-size: 28px;">Account Deleted</h2>
          </div>
          
          <p style="font-size: 18px; margin-bottom: 24px; color: #475569; text-align: center;">Hi ${name},</p>
          
          <div style="background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%); padding: 24px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #ef4444;">
            <p style="margin-bottom: 16px; color: #991b1b; text-align: center;">Your ThankATech account has been successfully deleted as requested.</p>
            <p style="margin-bottom: 0; color: #991b1b; text-align: center;">All your personal data has been removed from our system.</p>
          </div>
          
          <p style="margin: 24px 0; color: #475569; text-align: center;">We're sorry to see you go! If you ever want to rejoin the ThankATech community, you're always welcome back.</p>
          
          <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); padding: 20px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e; text-align: center; font-size: 14px;">⚠️ If you didn't request this deletion, please contact us immediately at <a href="mailto:support@thankatech.com" style="color: #d97706; text-decoration: none; font-weight: 600;">support@thankatech.com</a>.</p>
          </div>
        </div>
        
        ${EmailFooter}
      </div>
    `
  }),

  // Password reset
  passwordReset: (name: string, resetLink: string) => ({
    subject: 'Reset your ThankATech password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); overflow: hidden;">
        ${EmailHeader}
        
        <div style="padding: 40px 32px; background: white;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 36px;">
              🔒
            </div>
            <h2 style="color: #1e293b; margin-bottom: 16px; font-size: 28px;">Reset Your Password</h2>
          </div>
          
          <p style="font-size: 18px; margin-bottom: 24px; color: #475569; text-align: center;">Hi ${name},</p>
          
          <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 24px; border-radius: 12px; margin: 24px 0; text-align: center; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; color: #1e40af;">We received a request to reset your ThankATech password.</p>
          </div>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);">🔑 Reset Password</a>
          </div>
          
          <div style="background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%); padding: 20px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #ef4444;">
            <p style="margin-bottom: 12px; color: #991b1b; text-align: center; font-size: 14px;">⏰ This link will expire in 1 hour for security reasons.</p>
            <p style="margin: 0; color: #991b1b; text-align: center; font-size: 14px;">If you didn't request this password reset, you can safely ignore this email.</p>
          </div>
        </div>
        
        ${EmailFooter}
      </div>
    `
  }),

  // Contact form submission (internal notification)
  contactFormSubmission: (name: string, email: string, subject: string, message: string, userType: string) => ({
    subject: `New Contact Form Submission: ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); overflow: hidden;">
        ${EmailHeader}
        
        <div style="padding: 40px 32px; background: white;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 36px;">
              📧
            </div>
            <h2 style="color: #1e293b; margin-bottom: 16px; font-size: 28px;">New Contact Form Submission</h2>
          </div>
          
          <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 24px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #3b82f6;">
            <div style="display: grid; gap: 12px;">
              <p style="margin: 0; color: #1e40af;"><strong>👤 Name:</strong> ${name}</p>
              <p style="margin: 0; color: #1e40af;"><strong>📧 Email:</strong> <a href="mailto:${email}" style="color: #1d4ed8; text-decoration: none;">${email}</a></p>
              <p style="margin: 0; color: #1e40af;"><strong>🏷️ User Type:</strong> ${userType}</p>
              <p style="margin: 0; color: #1e40af;"><strong>📋 Subject:</strong> ${subject}</p>
            </div>
          </div>
          
          <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 24px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #64748b;">
            <p style="margin: 0 0 12px 0; color: #1e293b; font-weight: 600;">💬 Message:</p>
            <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <p style="white-space: pre-wrap; margin: 0; color: #475569; line-height: 1.6;">${message}</p>
            </div>
          </div>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="mailto:${email}?subject=Re: ${subject}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">📬 Reply to ${name}</a>
          </div>
        </div>
        
        ${EmailFooter}
      </div>
    `
  })
};

// Email service functions
export class EmailService {
  private static async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      // Check if we're in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 Email would be sent in production:');
        console.log(`To: ${emailData.to}`);
        console.log(`Subject: ${emailData.subject}`);
        console.log('HTML content would be rendered here.');
        return true;
      }

      // Brevo Transactional Email API (Correct for sending emails)
      if (process.env.BREVO_API_KEY) {
        console.log('📧 Sending email via Brevo Transactional API...');
        console.log('🔍 Debug info:', {
          hasApiKey: !!process.env.BREVO_API_KEY,
          apiKeyPrefix: process.env.BREVO_API_KEY?.substring(0, 25) + '...',
          to: emailData.to,
          from: emailData.from || process.env.EMAIL_FROM || 'noreply@thankatech.com',
          fromName: process.env.EMAIL_FROM_NAME || 'ThankATech'
        });

        // Use the exact same payload structure that works in test endpoint
        const emailPayload = {
          sender: {
            name: process.env.EMAIL_FROM_NAME || 'ThankATech',
            email: emailData.from || process.env.EMAIL_FROM || 'noreply@thankatech.com'
          },
          to: [{ 
            email: emailData.to,
            name: emailData.to.split('@')[0] // Use email prefix as name
          }],
          subject: emailData.subject,
          htmlContent: emailData.html,
          textContent: emailData.html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
        };

        console.log('📤 Sending payload to Brevo API...');

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
        
        console.log(`📊 Brevo API Response:`, {
          status: response.status,
          statusText: response.statusText,
          result: result
        });
        
        if (response.ok) {
          console.log('✅ Email sent successfully via Brevo API');
          console.log(`📨 Message ID: ${result.messageId}`);
          return true;
        } else {
          console.error('❌ Brevo API Error:', {
            status: response.status,
            error: result,
            apiKeyUsed: process.env.BREVO_API_KEY?.substring(0, 20) + '...'
          });
          
          // Provide specific error messages
          if (response.status === 401) {
            throw new Error('Brevo API authentication failed. Check your API key.');
          } else if (response.status === 400) {
            throw new Error(`Brevo API bad request: ${result.message || 'Invalid request data'}`);
          } else {
            throw new Error(`Brevo API error (${response.status}): ${result.message || 'Unknown error'}`);
          }
        }
      }

      // Fallback: Example with Resend:
      if (process.env.RESEND_API_KEY) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: emailData.from || 'ThankATech <noreply@thankatech.com>',
            to: [emailData.to],
            subject: emailData.subject,
            html: emailData.html,
          }),
        });

        return response.ok;
      }

      // Fallback: Example with SendGrid:
      if (process.env.SENDGRID_API_KEY) {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{
              to: [{ email: emailData.to }],
              subject: emailData.subject
            }],
            from: { email: emailData.from || 'noreply@thankatech.com', name: 'ThankATech' },
            content: [{
              type: 'text/html',
              value: emailData.html
            }]
          }),
        });

        return response.ok;
      }

      console.warn('No email service configured. Set BREVO_API_KEY, RESEND_API_KEY, or SENDGRID_API_KEY environment variable.');
      return false;

    } catch (error) {
      console.error('❌ Failed to send email:', error);
      console.error('🔍 Environment check:', {
        NODE_ENV: process.env.NODE_ENV,
        hasBrevoKey: !!process.env.BREVO_API_KEY,
        hasEmailFrom: !!process.env.EMAIL_FROM,
        hasEmailFromName: !!process.env.EMAIL_FROM_NAME
      });
      throw error; // Re-throw to get better error messages in API responses
    }
  }

  // Public methods for sending different types of emails
  static async sendWelcomeEmail(to: string, name: string, userType: 'customer' | 'technician'): Promise<boolean> {
    const template = EmailTemplates.welcome(name, userType);
    return this.sendEmail({ to, ...template });
  }

  static async sendThankYouNotification(to: string, technicianName: string, customerName: string, message?: string): Promise<boolean> {
    const template = EmailTemplates.thankYouReceived(technicianName, customerName, message);
    return this.sendEmail({ to, ...template });
  }

  static async sendTipNotification(to: string, technicianName: string, customerName: string, amount: number, message?: string): Promise<boolean> {
    const template = EmailTemplates.tipReceived(technicianName, customerName, amount, message);
    return this.sendEmail({ to, ...template });
  }

  static async sendAccountDeletionConfirmation(to: string, name: string): Promise<boolean> {
    const template = EmailTemplates.accountDeleted(name);
    return this.sendEmail({ to, ...template });
  }

  static async sendPasswordResetEmail(to: string, name: string, resetLink: string): Promise<boolean> {
    const template = EmailTemplates.passwordReset(name, resetLink);
    return this.sendEmail({ to, ...template });
  }

  static async sendContactFormNotification(formData: { name: string, email: string, subject: string, message: string, userType: string }): Promise<boolean> {
    const template = EmailTemplates.contactFormSubmission(formData.name, formData.email, formData.subject, formData.message, formData.userType);
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@thankatech.com';
    return this.sendEmail({ to: adminEmail, ...template });
  }
}

export default EmailService;