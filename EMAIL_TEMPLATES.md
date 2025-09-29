# 📧 ThankATech Email Templates Documentation

## 🔧 SMTP Configuration (Brevo)

**SMTP Server**: `smtp-relay.brevo.com`  
**Port**: `587`  
**Login**: `982ce2001@smtp-brevo.com`  
**Environment Variable**: `BREVO_API_KEY` (set this in your .env.local)

---

## 📋 Available Email Templates

The following 6 email templates are integrated into your ThankATech admin panel and can be edited through the **Email Management Suite**:

### 1. 🎉 **Welcome Email Template**

**Purpose**: Sent to new users (customers and technicians) upon registration  
**Template ID**: `welcome`  
**Variables**: `name`, `userType`

**Subject**: `Welcome to ThankATech, {name}!`

**Content Preview**:
```html
Welcome to ThankATech!

Hi {name},

[FOR TECHNICIANS:]
Your technician profile is now live! Customers can now find and thank you for your excellent work.
Start building your reputation and earning tips from satisfied customers.
[View Your Dashboard Button]

[FOR CUSTOMERS:]
You can now thank technicians and show your appreciation for their great work!
Discover skilled technicians in your area and support them with thanks and tips.
[Explore Technicians Button]

Questions? Reply to this email or visit our contact page.
```

---

### 2. 👍 **Thank You Notification Template**

**Purpose**: Sent to technicians when they receive a thank you from customers  
**Template ID**: `thankYouReceived`  
**Variables**: `technicianName`, `customerName`, `message` (optional)

**Subject**: `You received a thank you from {customerName}! 👍`

**Content Preview**:
```html
👍 You Got a Thank You!

Hi {technicianName},

{customerName} just thanked you for your excellent work!

[IF MESSAGE EXISTS:]
"{message}"

Keep up the great work! Every thank you builds your reputation.

[View Dashboard Button]
```

---

### 3. 💰 **Tip Notification Template**

**Purpose**: Sent to technicians when they receive a monetary tip  
**Template ID**: `tipReceived`  
**Variables**: `technicianName`, `customerName`, `amount`, `message` (optional)

**Subject**: `You received a ${amount} tip from {customerName}! 💰`

**Content Preview**:
```html
💰 You Received a Tip!

Hi {technicianName},

{customerName} just sent you a ${amount} tip!

[IF MESSAGE EXISTS:]
"{message}"

The tip will be processed and added to your earnings. You can request a payout anytime from your dashboard.

[View Earnings Button]
```

---

### 4. ❌ **Account Deletion Confirmation Template**

**Purpose**: Sent when a user's account is successfully deleted  
**Template ID**: `accountDeleted`  
**Variables**: `name`

**Subject**: `Your ThankATech account has been deleted`

**Content Preview**:
```html
Account Deleted

Hi {name},

Your ThankATech account has been successfully deleted as requested.

All your personal data has been removed from our system.

We're sorry to see you go! If you ever want to rejoin the ThankATech community, you're always welcome back.

If you didn't request this deletion, please contact us immediately at support@thankatech.com.
```

---

### 5. 🔒 **Password Reset Template**

**Purpose**: Sent when users request a password reset  
**Template ID**: `passwordReset`  
**Variables**: `name`, `resetLink`

**Subject**: `Reset your ThankATech password`

**Content Preview**:
```html
🔒 Reset Your Password

Hi {name},

We received a request to reset your ThankATech password.

[Reset Password Button - links to {resetLink}]

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, you can safely ignore this email.

Need help? Contact us at support@thankatech.com.
```

---

### 6. 📩 **Contact Form Submission Template**

**Purpose**: Internal notification sent to admin when contact form is submitted  
**Template ID**: `contactFormSubmission`  
**Variables**: `name`, `email`, `subject`, `message`, `userType`

**Subject**: `New Contact Form Submission: {subject}`

**Content Preview**:
```html
New Contact Form Submission

Name: {name}
Email: {email}
User Type: {userType}
Subject: {subject}

Message:
{message}
```

---

## 🎨 Admin Panel Email Management

Your admin panel (`/admin` → **Email Testing** tab) includes:

### **Email Testing Suite**
- ✅ SMTP Health Check
- ✅ Test Email Delivery
- ✅ Bulk Notification Preview
- ✅ Email Service Status Monitor

### **Template Management System**
- ✅ HTML Template Editor with Syntax Highlighting
- ✅ Variable Documentation (`{name}`, `{email}`, `{amount}`, etc.)
- ✅ Template Preview with Sample Data
- ✅ Save & Update Templates
- ✅ Template Categories (Welcome, Notifications, System, etc.)

### **Email Analytics**
- ✅ Delivery Success Rates
- ✅ Email Open Tracking (when implemented)
- ✅ Template Usage Statistics
- ✅ Error Logging and Monitoring

---

## 🔧 Implementation Notes

### **Environment Variables Required**:
```env
BREVO_API_KEY=your_brevo_api_key_here
ADMIN_EMAIL=k00lrav@gmail.com
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

### **Template Customization**:
- All templates use responsive HTML with inline CSS
- Professional gradient backgrounds matching ThankATech branding
- Mobile-friendly design with proper email client support
- Variable substitution system for dynamic content

### **Usage in Code**:
```typescript
import { EmailService } from '@/lib/email';

// Send welcome email
await EmailService.sendWelcomeEmail('user@example.com', 'John Doe', 'technician');

// Send tip notification
await EmailService.sendTipNotification('tech@example.com', 'Tech Name', 'Customer Name', 25.00, 'Great work!');
```

---

## 📊 Template Statistics

- **Total Templates**: 6 professional email templates
- **Template Categories**: Welcome, Notifications, Security, System
- **Variables Supported**: 15+ dynamic variables
- **Responsive Design**: Mobile and desktop optimized
- **Brand Consistency**: ThankATech color scheme and styling

---

*All templates are editable through the admin panel's Email Management Suite and support real-time preview and testing.*