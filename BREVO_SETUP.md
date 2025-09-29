# 🔧 Brevo SMTP Configuration for ThankATech

## SMTP Settings
```
SMTP Server: smtp-relay.brevo.com
Port: 587
Login: 982ce2001@smtp-brevo.com
Authentication: Required
Security: STARTTLS
```

## Environment Variables Setup

Add these to your `.env.local` file:

```env
# Brevo Email Service
BREVO_API_KEY=your_brevo_api_key_here
BREVO_SMTP_LOGIN=982ce2001@smtp-brevo.com
BREVO_SMTP_SERVER=smtp-relay.brevo.com
BREVO_SMTP_PORT=587

# Admin Configuration
ADMIN_EMAIL=k00lrav@gmail.com
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# From Email Address
EMAIL_FROM=noreply@thankatech.com
EMAIL_FROM_NAME=ThankATech
```

## Brevo API Integration

The email service now supports Brevo as the primary email provider with fallbacks to Resend and SendGrid.

### API Endpoint
```
POST https://api.brevo.com/v3/smtp/email
```

### Headers Required
```
accept: application/json
api-key: YOUR_BREVO_API_KEY
content-type: application/json
```

## Testing Email Setup

1. **Through Admin Panel**: Visit `/admin` → **Email Testing** tab
2. **SMTP Health Check**: Tests connection to Brevo servers
3. **Test Email Delivery**: Sends a test email to verify configuration
4. **Bulk Notification Preview**: Test multiple email templates

## Email Template Management

All 6 email templates are fully integrated:
- Welcome emails (customers & technicians)
- Thank you notifications
- Tip notifications  
- Account deletion confirmations
- Password reset emails
- Contact form submissions

## Production Deployment

Make sure to set the `BREVO_API_KEY` environment variable in your Vercel dashboard:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `BREVO_API_KEY` with your actual Brevo API key
3. Redeploy the application

## Email Deliverability

Brevo provides excellent deliverability with:
- Built-in spam protection
- Domain authentication support
- Bounce and complaint handling
- Email analytics and tracking
- High delivery rates

## Support

- **Brevo Documentation**: https://developers.brevo.com/
- **SMTP Guide**: https://help.brevo.com/hc/en-us/articles/209467065
- **API Reference**: https://developers.brevo.com/reference/sendtransacemail