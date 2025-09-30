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

// Email templates
export const EmailTemplates = {
  // Welcome email for new registrations
  welcome: (name: string, userType: 'customer' | 'technician') => ({
    subject: `Welcome to ThankATech, ${name}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1e293b 0%, #1e40af 100%); color: white; border-radius: 12px;">
        <div style="padding: 40px 32px; text-align: center;">
          <h1 style="color: #60a5fa; margin-bottom: 24px;">🔧 Welcome to ThankATech!</h1>
          <p style="font-size: 18px; margin-bottom: 24px;">Hi ${name},</p>
          
          ${userType === 'technician' 
            ? `
              <p style="margin-bottom: 16px;">Your technician profile is now live! Customers can now find and thank you for your excellent work.</p>
              <p style="margin-bottom: 24px;">Start building your reputation and earning tips from satisfied customers.</p>
              <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Your Dashboard</a>
            `
            : `
              <p style="margin-bottom: 16px;">You can now thank technicians and show your appreciation for their great work!</p>
              <p style="margin-bottom: 24px;">Discover skilled technicians in your area and support them with thanks and tips.</p>
              <a href="${process.env.NEXT_PUBLIC_BASE_URL}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Explore Technicians</a>
            `
          }
          
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1);">
            <p style="font-size: 14px; opacity: 0.8;">Questions? Reply to this email or visit our <a href="${process.env.NEXT_PUBLIC_BASE_URL}/contact" style="color: #34d399; text-decoration: none;">contact page</a>.</p>
          </div>
        </div>
      </div>
    `
  }),

  // Thank you notification for technicians
  thankYouReceived: (technicianName: string, customerName: string, message?: string) => ({
    subject: `You received a thank you from ${customerName}! 👍`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1e293b 0%, #059669 100%); color: white; border-radius: 12px;">
        <div style="padding: 40px 32px; text-align: center;">
          <h1 style="color: #34d399; margin-bottom: 24px;">👍 You Got a Thank You!</h1>
          <p style="font-size: 18px; margin-bottom: 16px;">Hi ${technicianName},</p>
          <p style="margin-bottom: 24px;"><strong>${customerName}</strong> just thanked you for your excellent work!</p>
          
          ${message ? `
            <div style="background: rgba(255,255,255,0.1); padding: 16px; border-radius: 8px; margin: 24px 0;">
              <p style="font-style: italic; margin: 0;">"${message}"</p>
            </div>
          ` : ''}
          
          <p style="margin-bottom: 24px;">Keep up the great work! Every thank you builds your reputation.</p>
          
          <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Dashboard</a>
        </div>
      </div>
    `
  }),

  // Tip notification for technicians
  tipReceived: (technicianName: string, customerName: string, amount: number, message?: string) => ({
    subject: `You received a $${amount} tip from ${customerName}! 💰`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1e293b 0%, #f59e0b 100%); color: white; border-radius: 12px;">
        <div style="padding: 40px 32px; text-align: center;">
          <h1 style="color: #fbbf24; margin-bottom: 24px;">💰 You Received a Tip!</h1>
          <p style="font-size: 18px; margin-bottom: 16px;">Hi ${technicianName},</p>
          <p style="margin-bottom: 24px;"><strong>${customerName}</strong> just sent you a <strong>$${amount} tip</strong>!</p>
          
          ${message ? `
            <div style="background: rgba(255,255,255,0.1); padding: 16px; border-radius: 8px; margin: 24px 0;">
              <p style="font-style: italic; margin: 0;">"${message}"</p>
            </div>
          ` : ''}
          
          <p style="margin-bottom: 24px;">The tip will be processed and added to your earnings. You can request a payout anytime from your dashboard.</p>
          
          <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Earnings</a>
        </div>
      </div>
    `
  }),

  // Account deletion confirmation
  accountDeleted: (name: string) => ({
    subject: 'Your ThankATech account has been deleted',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #374151; color: white; border-radius: 12px;">
        <div style="padding: 40px 32px; text-align: center;">
          <h1 style="color: #ef4444; margin-bottom: 24px;">Account Deleted</h1>
          <p style="font-size: 18px; margin-bottom: 16px;">Hi ${name},</p>
          <p style="margin-bottom: 24px;">Your ThankATech account has been successfully deleted as requested.</p>
          <p style="margin-bottom: 16px;">All your personal data has been removed from our system.</p>
          <p style="margin-bottom: 24px;">We're sorry to see you go! If you ever want to rejoin the ThankATech community, you're always welcome back.</p>
          
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1);">
            <p style="font-size: 14px; opacity: 0.8;">If you didn't request this deletion, please contact us immediately at <a href="mailto:support@thankatech.com" style="color: #34d399; text-decoration: none;">support@thankatech.com</a>.</p>
          </div>
        </div>
      </div>
    `
  }),

  // Password reset
  passwordReset: (name: string, resetLink: string) => ({
    subject: 'Reset your ThankATech password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1e293b 0%, #1e40af 100%); color: white; border-radius: 12px;">
        <div style="padding: 40px 32px; text-align: center;">
          <h1 style="color: #60a5fa; margin-bottom: 24px;">🔒 Reset Your Password</h1>
          <p style="font-size: 18px; margin-bottom: 16px;">Hi ${name},</p>
          <p style="margin-bottom: 24px;">We received a request to reset your ThankATech password.</p>
          
          <a href="${resetLink}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 24px 0;">Reset Password</a>
          
          <p style="margin-bottom: 16px; font-size: 14px;">This link will expire in 1 hour for security reasons.</p>
          <p style="margin-bottom: 24px; font-size: 14px;">If you didn't request this password reset, you can safely ignore this email.</p>
          
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1);">
            <p style="font-size: 14px; opacity: 0.8;">Need help? Contact us at <a href="mailto:support@thankatech.com" style="color: #34d399; text-decoration: none;">support@thankatech.com</a>.</p>
          </div>
        </div>
      </div>
    `
  }),

  // Contact form submission (internal notification)
  contactFormSubmission: (name: string, email: string, subject: string, message: string, userType: string) => ({
    subject: `New Contact Form Submission: ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #374151; color: white; padding: 32px; border-radius: 12px;">
        <h1 style="color: #60a5fa; margin-bottom: 24px;">New Contact Form Submission</h1>
        
        <div style="background: rgba(255,255,255,0.05); padding: 24px; border-radius: 8px; margin-bottom: 24px;">
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>User Type:</strong> ${userType}</p>
          <p><strong>Subject:</strong> ${subject}</p>
        </div>
        
        <div style="background: rgba(255,255,255,0.05); padding: 24px; border-radius: 8px;">
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap; margin-top: 12px;">${message}</p>
        </div>
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
          apiKeyPrefix: process.env.BREVO_API_KEY?.substring(0, 20) + '...',
          to: emailData.to,
          from: emailData.from || 'noreply@thankatech.com'
        });

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
          // Add text content fallback
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
      console.error('Failed to send email:', error);
      return false;
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