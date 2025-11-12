/**
 * Email service using Resend
 * Handles all email notifications for ThankATech
 */

import { logger } from './logger';

interface EmailData {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

// Clean Email Header - Simplified Design
const EmailHeader = `
  <div style="background: #1e40af; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <div style="margin-bottom: 12px;">
      <span style="font-size: 24px;">🔧</span>
      <h1 style="font-size: 28px; font-weight: bold; color: white; margin: 8px 0 0 0; font-family: Arial, sans-serif;">
        ThankATech
      </h1>
    </div>
    <p style="color: #dbeafe; font-size: 14px; margin: 0; font-family: Arial, sans-serif;">
      Connecting skilled technicians with appreciative clients
    </p>
  </div>
`;

// Clean Email Footer - Simplified Design
const EmailFooter = `
  <div style="background: #f8fafc; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; margin-top: 20px; border-top: 1px solid #e2e8f0;">
    <p style="color: #64748b; font-size: 12px; margin: 0 0 12px 0; font-family: Arial, sans-serif;">
      🔧 <strong>ThankATech</strong> - Thank you for being part of our community!
    </p>
    
    <div style="margin: 12px 0;">
      <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://thankatech.com'}" style="color: #1e40af; text-decoration: none; font-size: 12px; margin: 0 8px;">Home</a> |
      <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://thankatech.com'}/dashboard" style="color: #1e40af; text-decoration: none; font-size: 12px; margin: 0 8px;">Dashboard</a> |
      <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://thankatech.com'}/contact" style="color: #1e40af; text-decoration: none; font-size: 12px; margin: 0 8px;">Contact</a>
    </div>
    
    <p style="color: #64748b; font-size: 11px; margin: 0; font-family: Arial, sans-serif;">
      © ${new Date().getFullYear()} ThankATech. All rights reserved. | <a href="mailto:support@thankatech.com" style="color: #1e40af;">support@thankatech.com</a>
    </p>
  </div>
`;

// Email templates
export const EmailTemplates = {
  // Welcome email for new registrations - Clean design
  welcome: (name: string, userType: 'customer' | 'technician') => ({
    subject: `Welcome to ThankATech, ${name}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;">
        ${EmailHeader}
        
        <div style="padding: 24px; background: white;">
          <h2 style="color: #1e293b; margin-bottom: 16px; font-size: 24px; text-align: center;">Welcome to ThankATech!</h2>
          <p style="font-size: 16px; margin-bottom: 20px; color: #475569; text-align: center;">Hi ${name},</p>
          
          ${userType === 'technician' 
            ? `
              <div style="background: #f0fdf4; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 3px solid #10b981;">
                <p style="margin: 0 0 12px 0; color: #166534; font-size: 14px;">Your technician profile is now live! Customers can now find and thank you for your excellent work.</p>
                <p style="margin: 0; color: #166534; font-size: 14px;">Start building your reputation and earning tips from satisfied customers.</p>
              </div>
              <div style="text-align: center; margin: 20px 0;">
                <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">🚀 View Your Dashboard</a>
              </div>
            `
            : `
              <div style="background: #eff6ff; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 3px solid #3b82f6;">
                <p style="margin: 0 0 12px 0; color: #1e40af; font-size: 14px;">You can now thank technicians and show your appreciation for their great work!</p>
                <p style="margin: 0; color: #1e40af; font-size: 14px;">Discover skilled technicians in your area and support them with thanks and tips.</p>
              </div>
              <div style="text-align: center; margin: 20px 0;">
                <a href="${process.env.NEXT_PUBLIC_BASE_URL}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">🔍 Explore Technicians</a>
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

  // ThankATech Points received notification
  pointsReceived: (technicianName: string, customerName: string, points: number, message?: string) => ({
    subject: `You received ${points} ThankATech Points from ${customerName}! ⭐`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;">
        ${EmailHeader}
        
        <div style="padding: 24px; background: white;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="width: 60px; height: 60px; background: #f59e0b; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; font-size: 24px;">
              ⭐
            </div>
            <h2 style="color: #1e293b; margin: 0; font-size: 22px;">Points Received!</h2>
          </div>
          
          <p style="font-size: 16px; margin-bottom: 16px; color: #475569; text-align: center;">Hi ${technicianName},</p>
          
          <div style="background: #fffbeb; padding: 16px; border-radius: 6px; margin: 16px 0; text-align: center; border-left: 3px solid #f59e0b;">
            <p style="margin: 0; color: #92400e; font-size: 16px;"><strong>${customerName}</strong> awarded you <strong style="color: #d97706;">${points} ThankATech Points</strong>! 🎉</p>
          </div>
          
          ${message ? `
            <div style="background: #f8fafc; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 3px solid #64748b;">
              <p style="color: #475569; font-style: italic; margin: 0; font-size: 14px; text-align: center;">"${message}"</p>
            </div>
          ` : ''}
          
          <div style="background: #eff6ff; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 3px solid #3b82f6;">
            <p style="margin: 0; color: #1e40af; text-align: center; font-size: 14px;">🔄 Points are part of our closed-loop system and build your reputation score!</p>
          </div>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">⭐ View Points Balance</a>
          </div>
        </div>
        
        ${EmailFooter}
      </div>
    `
  }),

  // Token of Appreciation (TOA) sent notification for customers
  toaSent: (customerName: string, technicianName: string, tokenAmount: number, message?: string) => ({
    subject: `Your Token of Appreciation was sent to ${technicianName}! 🎁`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;">
        ${EmailHeader}
        
        <div style="padding: 24px; background: white;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="width: 60px; height: 60px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; font-size: 24px;">
              🎁
            </div>
            <h2 style="color: #1e293b; margin: 0; font-size: 22px;">Token Sent Successfully!</h2>
          </div>
          
          <p style="font-size: 16px; margin-bottom: 16px; color: #475569; text-align: center;">Hi ${customerName},</p>
          
          <div style="background: #f0fdf4; padding: 16px; border-radius: 6px; margin: 16px 0; text-align: center; border-left: 3px solid #10b981;">
            <p style="margin: 0; color: #166534; font-size: 16px;">Your <strong>${tokenAmount} Token${tokenAmount > 1 ? 's' : ''} of Appreciation</strong> was successfully sent to <strong>${technicianName}</strong>! 🚀</p>
          </div>
          
          ${message ? `
            <div style="background: #f8fafc; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 3px solid #64748b;">
              <p style="color: #475569; margin: 0; font-size: 14px; text-align: center;"><strong>Your message:</strong> "${message}"</p>
            </div>
          ` : ''}
          
          <div style="background: #eff6ff; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 3px solid #3b82f6;">
            <p style="margin: 0; color: #1e40af; text-align: center; font-size: 14px;">💫 Your appreciation helps build our community and supports quality technicians!</p>
          </div>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">🎁 View Your Activity</a>
          </div>
        </div>
        
        ${EmailFooter}
      </div>
    `
  }),

  // Token of Appreciation (TOA) received notification for technicians
  toaReceived: (technicianName: string, customerName: string, tokenAmount: number, message?: string) => ({
    subject: `You received ${tokenAmount} Token${tokenAmount > 1 ? 's' : ''} of Appreciation from ${customerName}! 🎁`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;">
        ${EmailHeader}
        
        <div style="padding: 24px; background: white;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="width: 60px; height: 60px; background: #8b5cf6; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; font-size: 24px;">
              🎁
            </div>
            <h2 style="color: #1e293b; margin: 0; font-size: 22px;">Token of Appreciation Received!</h2>
          </div>
          
          <p style="font-size: 16px; margin-bottom: 16px; color: #475569; text-align: center;">Hi ${technicianName},</p>
          
          <div style="background: #faf5ff; padding: 16px; border-radius: 6px; margin: 16px 0; text-align: center; border-left: 3px solid #8b5cf6;">
            <p style="margin: 0; color: #6b21a8; font-size: 16px;"><strong>${customerName}</strong> sent you <strong style="color: #7c3aed;">${tokenAmount} Token${tokenAmount > 1 ? 's' : ''} of Appreciation</strong>! 🌟</p>
          </div>
          
          ${message ? `
            <div style="background: #f8fafc; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 3px solid #64748b;">
              <p style="color: #475569; font-style: italic; margin: 0; font-size: 14px; text-align: center;">"${message}"</p>
            </div>
          ` : ''}
          
          <div style="background: #eff6ff; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 3px solid #3b82f6;">
            <p style="margin: 0; color: #1e40af; text-align: center; font-size: 14px;">🔄 These tokens contribute to your reputation and can be redeemed within the ThankATech ecosystem!</p>
          </div>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">🎁 View Token Balance</a>
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

  // Password reset - Clean design
  passwordReset: (name: string, resetLink: string) => ({
    subject: 'Reset your ThankATech password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;">
        ${EmailHeader}
        
        <div style="padding: 24px; background: white;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="width: 60px; height: 60px; background: #dc2626; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; font-size: 24px;">
              🔒
            </div>
            <h2 style="color: #1e293b; margin: 0; font-size: 22px;">Reset Your Password</h2>
          </div>
          
          <p style="font-size: 16px; margin-bottom: 16px; color: #475569; text-align: center;">Hi ${name},</p>
          
          <div style="background: #eff6ff; padding: 16px; border-radius: 6px; margin: 16px 0; text-align: center; border-left: 3px solid #3b82f6;">
            <p style="margin: 0; color: #1e40af; font-size: 14px;">We received a request to reset your ThankATech password.</p>
          </div>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${resetLink}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">🔑 Reset Password</a>
          </div>
          
          <div style="background: #fef2f2; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 3px solid #ef4444;">
            <p style="margin: 0 0 8px 0; color: #991b1b; text-align: center; font-size: 13px;">⏰ This link expires in 1 hour for security.</p>
            <p style="margin: 0; color: #991b1b; text-align: center; font-size: 13px;">If you didn't request this, ignore this email.</p>
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
      // Check if we're in development mode - TEMPORARILY DISABLED FOR EMAIL TESTING
      if (false && process.env.NODE_ENV === 'development') {
        // Email would be sent in production (debug mode)
        return true;
      }

      // Brevo Transactional Email API (Correct for sending emails)
      if (process.env.BREVO_API_KEY) {
        // Sending email via Brevo Transactional API

        // Brevo API v3 format - with reply-to for better deliverability
        const emailPayload = {
          sender: {
            name: process.env.EMAIL_FROM_NAME || 'ThankATech',
            email: emailData.from || process.env.EMAIL_FROM || 'noreply@thankatech.com'
          },
          to: [{ 
            email: emailData.to,
            name: emailData.to.split('@')[0]
          }],
          replyTo: {
            email: 'support@thankatech.com',
            name: 'ThankATech Support'
          },
          subject: emailData.subject,
          htmlContent: emailData.html
        };

        logger.info('🚀 Sending email via Brevo API');
        logger.info('📧 Full Payload:', JSON.stringify(emailPayload, null, 2));
        logger.info('🔑 Using API Key:', process.env.BREVO_API_KEY?.substring(0, 20) + '...');

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': process.env.BREVO_API_KEY,
            'Content-Type': 'application/json', // Match C# example exactly
          },
          body: JSON.stringify(emailPayload),
        });

        const result = await response.json();
        
        logger.info('📊 Brevo API Response:', {
          status: response.status,
          ok: response.ok,
          result: result
        });
        
        if (response.ok) {
          logger.info('✅ Email sent successfully via Brevo API');
          logger.info('📨 Message ID:', result.messageId);
          return true;
        } else {
          logger.error('❌ Brevo API Error:', {
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

      logger.warn('No email service configured. Set BREVO_API_KEY, RESEND_API_KEY, or SENDGRID_API_KEY environment variable.');
      return false;

    } catch (error: any) {
      logger.error('❌ Failed to send email:', error);
      logger.error('🔍 Environment check:', {
        NODE_ENV: process.env.NODE_ENV,
        hasBrevoKey: !!process.env.BREVO_API_KEY,
        hasEmailFrom: !!process.env.EMAIL_FROM,
        hasEmailFromName: !!process.env.EMAIL_FROM_NAME
      });
      logger.error('📧 Email data:', {
        to: emailData.to,
        subject: emailData.subject,
        from: emailData.from
      });
      // Return false instead of throwing to prevent 500 errors
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

  static async sendPointsNotification(to: string, technicianName: string, customerName: string, points: number, message?: string): Promise<boolean> {
    const template = EmailTemplates.pointsReceived(technicianName, customerName, points, message);
    return this.sendEmail({ to, ...template });
  }

  static async sendToaSentNotification(to: string, customerName: string, technicianName: string, tokenAmount: number, message?: string): Promise<boolean> {
    const template = EmailTemplates.toaSent(customerName, technicianName, tokenAmount, message);
    return this.sendEmail({ to, ...template });
  }

  static async sendToaReceivedNotification(to: string, technicianName: string, customerName: string, tokenAmount: number, message?: string): Promise<boolean> {
    const template = EmailTemplates.toaReceived(technicianName, customerName, tokenAmount, message);
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

  // Public method for sending raw HTML emails (for testing)
  static async sendRawEmail(to: string, subject: string, html: string): Promise<boolean> {
    return this.sendEmail({ to, subject, html });
  }
}

export default EmailService;
