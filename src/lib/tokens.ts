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
  tokens: number;
  message: string;
  isRandomMessage: boolean;
  timestamp: Date;
  type: 'thank_you' | 'appreciation' | 'toa';
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

// Token pack configurations
export const TOKEN_PACKS: TokenPack[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    tokens: 50,
    price: 500, // $5.00
    pricePerToken: 10 // 10¢ per token
  },
  {
    id: 'popular',
    name: 'Popular Pack',
    tokens: 100,
    price: 1000, // $10.00
    popular: true,
    pricePerToken: 10 // 10¢ per token
  },
  {
    id: 'value',
    name: 'Value Pack',
    tokens: 300,
    price: 2500, // $25.00
    pricePerToken: 8.33 // 8.33¢ per token
  },
  {
    id: 'bulk',
    name: 'Bulk Pack',
    tokens: 1000,
    price: 1000, // $10.00
    bestValue: true,
    pricePerToken: 1 // 1¢ per token - Amazing value!
  },
  {
    id: 'premium',
    name: 'Premium Pack',
    tokens: 650,
    price: 5000, // $50.00
    pricePerToken: 7.69 // 7.69¢ per token
  }
];

// Token system for meaningful appreciation

// Token sending limits
export const TOKEN_LIMITS = {
  MIN_TOKENS: 5,
  MAX_TOKENS: 50,
  FREE_DAILY_LIMIT: 3
};

// ThankATech Points system limits
export const POINTS_LIMITS = {
  DAILY_THANK_YOU_LIMIT: 1, // 1 thank you per technician per day (NEW LIMIT)
  POINTS_PER_THANK_YOU: 1, // 1 ThankATech Point per thank you click
  POINTS_PER_TOKEN: 2 // 2 ThankATech Points per TOA received
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
