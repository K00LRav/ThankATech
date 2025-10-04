# ThankATech Platform Documentation v2.0.0

## Platform Overview

ThankATech is a professional appreciation platform that connects clients with technicians through a token-based gratitude system. Our platform enables clients to show appreciation through TOA tokens and ThankATech Points, while providing technicians with a meaningful way to receive recognition and compensation for their excellent service.

### Mission Statement
Transform professional appreciation into measurable value while fostering authentic relationships between service providers and clients through an innovative token-based recognition system.

### Core Values
- **Transparency**: Clear fee structures and open transaction tracking
- **Simplicity**: Easy-to-use interface for both clients and technicians
- **Fairness**: Equitable revenue distribution (85% to technicians, 15% platform fee)
- **Authenticity**: Genuine appreciation over purely transactional interactions

## Business Model

### Token Economy Structure
- **TOA Token Value**: $0.01 per token
- **Revenue Distribution**: 85% technician earnings, 15% platform fee
- **ThankATech Points**: Free appreciation points that can be converted to tokens
- **Payment Processing**: Stripe integration for secure transactions

### Revenue Streams
1. **Transaction Fees**: 15% of token transactions
2. **Token Sales**: Direct token purchases by clients

## Technical Architecture

### Current Stack
- **Next.js 15.5.3**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Firebase**: Authentication, database, and file storage
- **Stripe**: Payment processing
- **Vercel**: Hosting and deployment

### Security
- **Firebase Authentication**: Secure user authentication with Google OAuth
- **Firestore Security Rules**: Database-level security
- **Stripe Security**: PCI-compliant payment processing
- **Storage Rules**: Secure file upload for profile photos

## Client Dashboard Features

### Token Management
- **Current Balance Display**: Real-time TOA token and ThankATech Points balance
- **Token Purchase**: Direct integration with Stripe for buying tokens
- **Recent Activity**: View last 10 transactions
- **Transaction History**: Complete filterable transaction history with search

### Appreciation Tools
- **Send Tokens**: Send TOA tokens to technicians with messages
- **Send Thank You Points**: Free appreciation with points
- **Browse Technicians**: View available technicians and their profiles

## Technician Dashboard Features

### Earnings Tracking
- **Token Balance**: Current TOA tokens received
- **Earnings Overview**: Track tokens received from clients
- **Transaction History**: Complete history of received tokens and points
- **Thank You Counter**: Track total thank you points received

### Profile Management
- **Profile Photos**: Upload and manage profile pictures
- **Profile Information**: Manage name, bio, and contact information
- **Skills Display**: Showcase technical expertise and specializations

## Admin Dashboard Features

### Platform Analytics
- **User Statistics**: Total clients, technicians, and active users
- **Token Metrics**: 
  - Total tokens in circulation
  - Total tokens purchased vs spent
  - Token purchase revenue
  - Average tokens per user
- **Transaction Tracking**: Monitor all platform transactions
- **Growth Metrics**: New user signups and platform growth

### Token Management Tools
- **Manual Token Management**: Add tokens to specific user accounts
- **Balance Checking**: View any user's token balance
- **Transaction Oversight**: View detailed transaction information

### Administrative Tools
- **Password Reset**: Reset user passwords for support
- **Email Testing**: Test SMTP email delivery
- **System Status**: Monitor basic platform health

## Database Schema

### User Collections
```typescript
// Clients Collection
interface Client {
  id: string;
  name: string;
  email: string;
  authUid: string;
  profileImage?: string;
  createdAt: Timestamp;
  isActive: boolean;
}

// Technicians Collection  
interface Technician {
  id: string;
  name: string;
  email: string;
  authUid: string;
  category: string;
  profileImage?: string;
  bio?: string;
  totalThankYous: number;
  createdAt: Timestamp;
  isActive: boolean;
}

// Admins Collection
interface Admin {
  id: string;
  name: string;
  email: string;
  authUid: string;
  userType: 'admin';
  createdAt: Timestamp;
  isActive: boolean;
}
```

### Token System
```typescript
// Token Balances
interface TokenBalance {
  id: string;
  userId: string;
  tokens: number;
  totalPurchased: number;
  totalSpent: number;
  lastUpdated: Timestamp;
}

// Token Transactions
interface TokenTransaction {
  id: string;
  fromUserId: string;
  toTechnicianId?: string;
  type: 'thank_you' | 'toa' | 'token_purchase';
  tokens: number;
  pointsAwarded: number;
  message: string;
  timestamp: Timestamp;
  dollarValue?: number;
}
```

## Core Platform Components

### User Interface Components
1. **TokenPurchaseModal**: Token purchase interface with Stripe integration
2. **TokenTransactionHistory**: Complete transaction history with filtering
3. **RolodexCard**: Technician profile display with appreciation actions
4. **ProfilePhotoUpload**: Image upload system for user profiles
5. **UniversalHeader**: Navigation with user authentication status

### Authentication System
- **Multi-collection user lookup**: Supports clients, technicians, and admins
- **Role-based access control**: Different dashboard views based on user type
- **Secure profile management**: Protected user data with proper authorization

## API Endpoints

### Payment Processing
- `POST /api/create-token-checkout` - Create Stripe checkout session for token purchases
- `POST /api/webhook` - Handle Stripe webhook events for payment confirmation

### Email System
- `POST /api/send-email` - Send emails via Brevo SMTP
- `GET /api/brevo-status` - Check email service status

### File Management
- Firebase Storage integration for profile photo uploads
- Automatic image optimization and secure URL generation

## Platform Features Status

### ✅ Implemented Features
- **User Authentication**: Google OAuth with Firebase Auth
- **Token Purchase System**: Stripe integration with real payments
- **Token Transfer**: Send tokens between users with messages
- **Profile Management**: Upload photos, manage profile information
- **Transaction History**: Complete filterable transaction tracking
- **Admin Dashboard**: Basic analytics and user management
- **Email Notifications**: Brevo SMTP integration
- **Security Rules**: Firebase security for database and storage
- **Responsive Design**: Mobile-friendly interface

### 📋 Future Roadmap (Not Yet Implemented)
- **Mobile Application**: React Native mobile app
- **Advanced Analytics**: Detailed business intelligence
- **International Support**: Multi-currency and localization
- **API Documentation**: Public API for third-party integration
- **Fraud Detection**: Advanced transaction monitoring
- **Automated Reporting**: Financial and compliance reporting

## Development Environment

### Getting Started
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Deploy Firebase rules
firebase deploy --only storage
```

### Environment Configuration
- **Development**: Local development with Firebase emulators
- **Production**: Vercel deployment with Firebase backend
- **Environment Variables**: Stripe keys, Firebase config, SMTP settings

## Support & Documentation

### Technical Support
- **Documentation**: Comprehensive setup guides and API documentation
- **GitHub Repository**: Open source with issue tracking
- **Development Team**: Active maintenance and feature development

### User Support
- **Platform Help**: In-app guidance and support documentation
- **Email Support**: Direct support via contact forms
- **Community**: Growing user base with feedback integration

---

*ThankATech Platform Documentation v2.0.0 - Honest Current State*

*This documentation reflects the actual implemented features as of January 2024*

**Platform Status**: Production Ready ✅  
**Current Version**: v2.0.0 with token management system  
**Repository**: Active development with regular updates  

---

**What We Actually Have**: A working token-based appreciation platform with real payments, user management, and basic analytics.

**What We're Building Toward**: The comprehensive features described in our aspirational documentation (saved as `site-aspirational-v2.0.0.md`).