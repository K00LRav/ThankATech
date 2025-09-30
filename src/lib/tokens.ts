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
  type: 'thank_you' | 'appreciation';
}

export interface DailyThankYouLimit {
  userId: string;
  technicianId: string;
  date: string; // YYYY-MM-DD
  freeThankYous: number;
  maxFreeThankYous: number;
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
    id: 'premium',
    name: 'Premium Pack',
    tokens: 650,
    price: 5000, // $50.00
    bestValue: true,
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
