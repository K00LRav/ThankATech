import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe.js (client-side)
let stripePromise: Promise<any>;
export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

// Server-side Stripe initialization (only for API routes)
export const getServerStripe = () => {
  if (typeof window !== 'undefined') {
    throw new Error('Server-side Stripe should not be used on the client');
  }
  
  const Stripe = require('stripe');
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-08-27.basil',
  });
};

// Platform fee configuration
export const PLATFORM_CONFIG = {
  feePercentage: parseInt(process.env.PLATFORM_FEE_PERCENTAGE || '5'), // 5%
  feeFixed: parseInt(process.env.PLATFORM_FEE_FIXED || '30'), // $0.30 in cents
};

// Calculate platform fee
export const calculatePlatformFee = (amount: number): number => {
  return Math.round((amount * PLATFORM_CONFIG.feePercentage) / 100) + PLATFORM_CONFIG.feeFixed;
};

// Calculate technician payout (after platform fee)
export const calculateTechnicianPayout = (amount: number): number => {
  return amount - calculatePlatformFee(amount);
};

// Format currency for display
export const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
};

// Convert dollars to cents for Stripe
export const dollarsToCents = (dollars: number): number => {
  return Math.round(dollars * 100);
};

// Convert cents to dollars
export const centsToDollars = (cents: number): number => {
  return cents / 100;
};