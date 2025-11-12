/**
 * ThankATech Token System
 * Handles token purchases, balances, and transactions
 */

export interface TokenPack {
  id: string;
  name: string;
  tokens: number;
  price: number; // in cents
  popular?: boolean;
  bestValue?: boolean;
  pricePerToken: number; // in cents
}

export interface UserTokenBalance {
  userId: string;
  tokens: number;
  totalPurchased: number;
  totalSpent: number;
  lastUpdated: Date;
}

export interface TokenTransaction {
  id: string;
  fromUserId: string;
  toTechnicianId: string;
  fromName?: string; // Name of the person sending
  toName?: string; // Name of the recipient  
  technicianName?: string; // Technician name (for compatibility)
  tokens: number;
  message: string;
  isRandomMessage: boolean;
  timestamp: Date;
  type: 'thank_you' | 'thankyou' | 'appreciation' | 'toa' | 'toa_token' | 'token_purchase';
  // TOA Business Model fields
  dollarValue?: number; // Total dollar value (tokens * customerPaysPerTOA)
  technicianPayout?: number; // 85% payout to technician
  platformFee?: number; // 15% platform fee
  pointsAwarded?: number; // ThankATech Points awarded
}

export interface DailyThankYouLimit {
  userId: string;
  technicianId: string;
  date: string; // YYYY-MM-DD
  freeThankYous: number;
  maxFreeThankYous: number;
}

export interface DailyPointsLimit {
  userId: string;
  date: string; // YYYY-MM-DD
  pointsGiven: number;
  maxDailyPoints: number;
}

export interface DailyPerTechnicianLimit {
  userId: string;
  date: string; // YYYY-MM-DD
  thankedTechnicians: string[]; // Array of technician IDs thanked today
  maxDailyThanks: number;
}

export interface PointsConversion {
  id: string;
  userId: string;
  pointsConverted: number;
  tokensGenerated: number;
  conversionDate: string;
  conversionRate: number;
  createdAt: Date;
}

// Token pack configurations with psychological pricing
// Base rate: 1000 tokens = $9.99 (psychological pricing)
// Premium pack capped at $49.99 maximum
export const TOKEN_PACKS: TokenPack[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    tokens: 100,
    price: 199, // $1.99 (psychological pricing - under $2)
    pricePerToken: 1.99 // 1.99¢ per token
  },
  {
    id: 'popular',
    name: 'Most Popular', 
    tokens: 500,
    price: 499, // $4.99 (classic psychological price point)
    popular: true,
    pricePerToken: 0.998 // ~1¢ per token
  },
  {
    id: 'value',
    name: 'Best Value',
    tokens: 1000,
    price: 999, // $9.99 (maintains your target, psychological pricing)
    bestValue: true,
    pricePerToken: 0.999 // ~1¢ per token
  },
  {
    id: 'bulk',
    name: 'Power User',
    tokens: 2500,
    price: 1999, // $19.99 (under $20 psychological barrier)
    pricePerToken: 0.8 // 0.8¢ per token
  },
  {
    id: 'premium',
    name: 'Ultimate Pack',
    tokens: 7500,
    price: 4999, // $49.99 (under $50 psychological barrier)
    pricePerToken: 0.67 // 0.67¢ per token - Maximum savings!
  }
];

// Token system for meaningful appreciation

// Token sending limits
// 1 TOA = $0.01, so: MIN = $1, MAX = $100
export const TOKEN_LIMITS = {
  MIN_TOKENS: 100,  // Minimum $1.00 tip
  MAX_TOKENS: 10000, // Maximum $100.00 tip
  FREE_DAILY_LIMIT: 3
};

// ThankATech Points system limits
export const POINTS_LIMITS = {
  DAILY_THANK_YOU_LIMIT: 1, // 1 thank you per technician per day (NEW LIMIT)
  POINTS_PER_THANK_YOU: 1, // 1 ThankATech Point per thank you click
  POINTS_PER_TOA_TRANSACTION: 2 // 2 ThankATech Points per TOA transaction (not per token)
};

// Closed-loop conversion system
export const CONVERSION_SYSTEM = {
  pointsToTOARate: 5, // 5 ThankATech Points = 1 TOA token
  minimumConversion: 5, // Must have at least 5 points to convert
  maxDailyConversions: 20, // Prevent abuse while encouraging engagement
  conversionReward: 0.10, // $0.10 value per converted TOA (from platform fee pool)
} as const;

// Platform revenue model
export const PAYOUT_MODEL = {
  customerPaysPerTOA: 0.01,     // $0.01 per TOA token
  technicianGetsPerTOA: 0.0085, // 85% goes to technician ($0.0085)
  platformFeePerTOA: 0.0015,    // 15% platform fee ($0.0015)
  conversionPoolPerTOA: 0.001,  // Part of platform fee funds conversions
} as const;

// Utility functions
export const formatTokens = (tokens: number): string => {
  return `${tokens} token${tokens !== 1 ? 's' : ''}`;
};

export const formatPrice = (cents: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100);
};

// Removed random message system - now using fixed meaningful messages

export const calculateTokenValue = (tokens: number): number => {
  // Base value: 10¢ per token
  return Math.round(tokens * 10); // in cents
};
