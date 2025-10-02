# ThankATech Platform Documentation

## Overview

ThankATech is a revolutionary appreciation economy platform that connects clients with skilled technicians through a unique token-based gratitude system. The platform operates on a closed-loop economy where appreciation translates to real monetary value through our ThankATech Points and TOA (Tokens of Appreciation) system.

## Business Model

### Core Concept
- **Mission**: Transform professional appreciation into tangible rewards
- **Vision**: Create a sustainable ecosystem where gratitude drives economic value
- **Values**: Transparency, fairness, and genuine appreciation recognition

### Revenue Model
- **TOA Token Value**: $0.01 per token
- **Revenue Split**: 85% to technician ($0.0085), 15% to platform ($0.0015)
- **Conversion Rate**: 5 ThankATech Points = 1 TOA Token
- **Point Award System**: Both sender and recipient earn 1 ThankATech Point per appreciation

## Technical Architecture

### Stack
- **Frontend**: Next.js 14 with TypeScript
- **Backend**: Firebase (Firestore, Auth, Functions)
- **Payments**: Stripe (purchases and payouts)
- **Hosting**: Vercel
- **Styling**: Tailwind CSS with custom components

### Key Components

#### 1. Authentication & User Management
- **File**: `src/lib/firebase.ts`
- **Features**: Firebase Auth with Google Sign-In
- **User Types**: Technician and Client profiles
- **Profile Management**: Role-specific dashboards and data

#### 2. Token Economy System
- **Purchase Flow**: `src/components/TokenPurchaseModal.tsx`
- **Sending System**: `src/components/TokenSendModal.tsx`
- **Core Logic**: `src/lib/token-firebase.ts`
- **Token Packs**: Multiple purchase options with bulk discounts

#### 3. ThankATech Points System
- **Conversion Widget**: `src/components/ConversionWidget.tsx`
- **Point Management**: Integrated with token transactions
- **Daily Limits**: 20 conversions per day maximum
- **Auto Award**: 1 point per appreciation to both parties

#### 4. Payout System
- **Payout Modal**: `src/components/PayoutModal.tsx`
- **Payment Processing**: Stripe Connect integration
- **Fee Structure**: Standard ($0.25) and Express ($1.50) options
- **Security**: Bank account encryption and validation

#### 5. Dashboard System
- **Enhanced Service**: `src/lib/enhanced-dashboard-service.ts`
- **Role-Specific Views**: Separate technician and client experiences
- **Transaction History**: Complete audit trail
- **Real-time Stats**: Earnings, points, and activity tracking

## Database Schema

### Collections

#### Users
```typescript
interface UserProfile {
  id: string;
  name: string;
  email: string;
  userType: 'technician' | 'client';
  points?: number;
  toaBalance?: number;
  totalThankYous?: number;
  // ... additional profile fields
}
```

#### TokenTransactions
```typescript
interface TokenTransaction {
  id: string;
  senderId: string;
  receiverId: string;
  amount: number;
  type: 'purchase' | 'send' | 'conversion';
  timestamp: Timestamp;
  // ... transaction metadata
}
```

#### Technicians
```typescript
interface Technician {
  id: string;
  businessName: string;
  category: string;
  location: string;
  hourlyRate: string;
  specialties: string[];
  // ... business profile fields
}
```

## API Endpoints

### Token Management
- `POST /api/create-token-checkout` - Create Stripe checkout session
- `POST /api/webhook` - Handle Stripe webhooks
- `GET /api/token-balance` - Get user token balance

### Payment System
- `POST /api/create-payout` - Process technician payouts
- `GET /api/payout-history` - Retrieve payout records

### User Management
- `GET /api/technicians` - List all technicians
- `GET /api/user-profile` - Get user profile data
- `POST /api/update-profile` - Update user information

## Key Features

### 1. Rolodex Card System
- **Component**: `src/components/RolodexCard.tsx`
- **Purpose**: Display technician profiles with appreciation actions
- **Features**: Stats display, category badges, direct TOA sending

### 2. Registration System
- **Component**: `src/components/Registration.tsx`
- **Purpose**: Onboard new users with role selection
- **Features**: Business profile setup, category selection

### 3. Profile Pages
- **Technician Profiles**: `src/app/[username]/page.tsx`
- **Features**: Public profiles, achievement badges, service showcase
- **Statistics**: Total appreciations, earnings, conversion rates

### 4. Admin Dashboard
- **Path**: `src/app/admin/`
- **Features**: User management, transaction monitoring, system analytics
- **Security**: Role-based access control

## Business Logic

### Token Flow
1. **Purchase**: Client buys TOA tokens via Stripe
2. **Send**: Client sends TOA to technician with appreciation message
3. **Reward**: Both parties receive 1 ThankATech Point
4. **Convert**: Users convert 5 points to 1 TOA token
5. **Payout**: Technicians cash out TOA tokens (85% value)

### Point System
- **Earning**: 1 point per appreciation (both sender/receiver)
- **Conversion**: 5 points = 1 TOA token
- **Limits**: 20 conversions per day maximum
- **Value**: Each point worth $0.002 (5 points = $0.01)

### Revenue Streams
- **Platform Fee**: 15% of all TOA token transactions
- **Processing Fees**: Standard payment processing costs
- **Premium Features**: Future subscription services

## Security & Compliance

### Data Protection
- **Encryption**: All sensitive data encrypted at rest
- **Authentication**: Firebase Auth with secure token management
- **Payment Security**: PCI DSS compliant via Stripe

### Privacy
- **User Control**: Profile visibility settings
- **Data Minimization**: Only collect necessary information
- **Transparency**: Clear privacy policy and terms

## Development Workflow

### Local Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run type-check   # TypeScript validation
```

### Deployment
- **Platform**: Vercel with automatic deployments
- **Environment**: Production, staging, development
- **CI/CD**: GitHub Actions for testing and deployment

### Testing
- **Unit Tests**: Jest and Testing Library
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Playwright for critical user flows

## Configuration Files

### Next.js Configuration
- **File**: `next.config.js`
- **Features**: Image optimization, security headers, redirects

### Firebase Configuration
- **File**: `firebase.json`
- **Services**: Firestore, Functions, Hosting rules

### TypeScript Configuration
- **File**: `tsconfig.json`
- **Settings**: Strict mode, path aliases, modern target

## Future Enhancements

### Planned Features
1. **Mobile App**: React Native implementation
2. **Video Testimonials**: Rich media appreciation
3. **Scheduling Integration**: Direct booking system
4. **Analytics Dashboard**: Advanced reporting tools
5. **Referral System**: Viral growth mechanics

### Technical Improvements
1. **Performance**: Enhanced caching and optimization
2. **Accessibility**: WCAG 2.1 AA compliance
3. **Internationalization**: Multi-language support
4. **Real-time Features**: WebSocket integration

## Monitoring & Analytics

### Key Metrics
- **User Engagement**: Daily/monthly active users
- **Transaction Volume**: TOA tokens sent/received
- **Conversion Rates**: Points to tokens, signups to active users
- **Revenue Tracking**: Platform fees and growth

### Tools
- **Analytics**: Google Analytics 4
- **Error Tracking**: Sentry for error monitoring
- **Performance**: Vercel analytics and Core Web Vitals
- **User Feedback**: Integrated feedback system

## Support & Documentation

### User Support
- **Help Center**: Comprehensive FAQ and guides
- **Contact System**: `src/app/contact/` for user inquiries
- **Status Page**: System health and maintenance updates

### Developer Resources
- **API Documentation**: Detailed endpoint specifications
- **Component Library**: Reusable UI components
- **Style Guide**: Design system and brand guidelines

---

## Contact Information

**Platform**: ThankATech
**Repository**: [ThankATech GitHub](https://github.com/K00LRav/ThankATech)
**Documentation**: This file (`site.md`)
**Last Updated**: October 2, 2025

---

*This documentation provides a comprehensive overview of the ThankATech platform. For specific implementation details, refer to the individual component files and API documentation.*