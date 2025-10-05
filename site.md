# ThankATech Platform Documentation v2.0.1

## Platform Overview

ThankATech is a professional appreciation platform that connects clients with technicians through a token-based gratitude system. Our platform enables clients to show appreciation through free thank yous and paid TOA tokens, while providing technicians with meaningful recognition and compensation for their excellent service through our ThankATech Points economy.

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
- **ThankATech Points System**: 
  - Free thank yous: Technicians earn 1 point (clients earn 0)
  - TOA transactions: Clients earn 1 point, technicians earn 2 points
  - Point conversion: 5 points → 1 TOA token (max 20 conversions/day)
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
- **Send TOA Tokens**: Send paid tokens to technicians (clients earn 1 point, technicians earn 2 points + money)
- **Send Thank Yous**: Free appreciation messages (only technicians earn 1 point)
- **Points Conversion**: Convert 5 ThankATech Points to 1 TOA token
- **Browse Technicians**: View available technicians and their profiles

## Technician Dashboard Features

### Earnings Tracking
- **Token Balance**: Current TOA tokens received
- **ThankATech Points**: Points earned from appreciation (1 per thank you, 2 per TOA received)
- **Earnings Overview**: Track tokens and money received from clients ($0.0085 per TOA token)
- **Transaction History**: Complete history of received tokens, points, and thank yous
- **Conversion Tools**: Convert points to TOA tokens for giving back

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
- **Points Management**: View and manage ThankATech Points balances
- **Balance Checking**: View any user's token and points balance
- **Transaction Oversight**: View detailed transaction information with point awards
- **Conversion Analytics**: Track points-to-token conversion patterns

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
  pointsAwarded: number; // Points earned: 0 for client thank yous, 1 for TOA senders, 1-2 for recipients
  message: string;
  timestamp: Timestamp;
  dollarValue?: number; // Actual money: $0.01 per TOA token
  technicianPayout?: number; // 85% payout to technician
  platformFee?: number; // 15% platform fee
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
- **ThankATech Points Economy**: Correct point distribution (free thank yous vs paid TOA)
- **Points Conversion System**: 5 points → 1 TOA token with daily limits
- **Token Transfer**: Send tokens between users with messages and point awards
- **Profile Management**: Upload photos, manage profile information
- **Transaction History**: Complete filterable transaction tracking with points
- **Admin Dashboard**: Token analytics, user management, and points oversight
- **Email Notifications**: Brevo SMTP integration with transaction confirmations
- **Security Rules**: Production-ready Firebase security for database and storage
- **Responsive Design**: Mobile-friendly interface optimized for iPhone

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

*ThankATech Platform Documentation v2.0.1 - Honest Current State*

*This documentation reflects the actual implemented features as of October 2025*

**Platform Status**: Production Ready ✅  
**Current Version**: v2.0.1 with corrected ThankATech Points business logic  
**Repository**: Active development with regular updates  
**Last Update**: Business logic corrections for proper point distribution

---

**What We Actually Have**: A working closed-loop appreciation economy with:
- Correct ThankATech Points distribution (free thank yous vs paid TOA)
- Real Stripe payments and token management
- Points-to-token conversion system (5:1 ratio)
- Production Firebase security rules
- Complete user dashboards and admin analytics
- Email notifications and responsive design

**What We're Building Toward**: The comprehensive features described in our aspirational documentation (saved as `site-aspirational-v2.0.0.md`).