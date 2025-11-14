'use client';

import React, { useState } from 'react';
import { formatCurrency, validatePayoutAmount, PAYOUT_METHODS, centsToDollars } from '@/lib/stripe';
import { logger } from '@/lib/logger';

interface PayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
  technicianId: string;
  onPayoutSuccess: (amount: number) => void;
}

export default function PayoutModal({
  isOpen,
  onClose,
  availableBalance,
  technicianId,
  onPayoutSuccess
}: PayoutModalProps) {
  const [amount, setAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'standard' | 'express'>('standard');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bankAccount, setBankAccount] = useState({
    accountNumber: '',
    routingNumber: '',
    accountType: 'checking' as 'checking' | 'savings'
  });

  if (!isOpen) return null;

  const amountInCents = Math.round(parseFloat(amount) * 100);
  const selectedMethod = PAYOUT_METHODS[payoutMethod];
  const netAmount = amountInCents - selectedMethod.fee;
  const availableBalanceCents = Math.round(availableBalance * 100);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setError(null);
    }
  };

  const handleMaxAmount = () => {
    const maxPayout = availableBalance - centsToDollars(selectedMethod.fee);
    setAmount(Math.max(0, maxPayout).toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    // Validate payout amount
    const validation = validatePayoutAmount(amountInCents);
    if (!validation.valid) {
      setError(validation.error || 'Invalid amount');
      return;
    }

    // Check if amount exceeds available balance
    if (amountInCents > availableBalanceCents) {
      setError('Amount exceeds available balance');
      return;
    }

    // Check if net amount after fees is positive
    if (netAmount <= 0) {
      setError('Amount too small after processing fees');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Get Firebase ID token for authentication
      const { auth } = await import('@/lib/firebase');
      const user = auth.currentUser;
      
      if (!user) {
        setError('You must be signed in to request a payout');
        setIsProcessing(false);
        return;
      }

      const idToken = await user.getIdToken();
      logger.info('🔐 Got Firebase ID token for payout request');

      const response = await fetch('/api/create-payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          amount: amountInCents,
          technicianId,
          method: payoutMethod,
          bankAccount
        }),
      });

      const result = await response.json();

      if (result.success) {
        onPayoutSuccess(amountInCents);
        onClose();
        // Reset form
        setAmount('');
        setBankAccount({
          accountNumber: '',
          routingNumber: '',
          accountType: 'checking'
        });
      } else {
        setError(result.error || 'Payout failed');
      }
    } catch (error) {
      logger.error('Payout error:', error);
      setError('Failed to process payout');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl border border-white/10 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Withdraw Earnings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Available Balance */}
          <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
            <div className="text-center">
              <p className="text-blue-200 text-sm">Available Balance</p>
              <p className="text-2xl font-bold text-blue-400">{formatCurrency(availableBalanceCents)}</p>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">
              Withdrawal Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
              <input
                type="text"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0.00"
                className="w-full pl-8 pr-20 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
              />
              <button
                type="button"
                onClick={handleMaxAmount}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                Max
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Minimum withdrawal: $1.00
            </p>
          </div>

          {/* Payout Method */}
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-3">
              Payout Method
            </label>
            <div className="space-y-3">
              {Object.entries(PAYOUT_METHODS).map(([key, method]) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="payoutMethod"
                    value={key}
                    checked={payoutMethod === key}
                    onChange={(e) => setPayoutMethod(e.target.value as 'standard' | 'express')}
                    className="w-4 h-4 text-blue-600 bg-white/10 border-blue-500/30 focus:ring-blue-500 focus:ring-2"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">{method.name}</span>
                      <span className="text-blue-400">
                        {method.fee > 0 ? formatCurrency(method.fee) : 'Free'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{method.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Bank Account Details */}
          <div>
            <h3 className="text-sm font-medium text-blue-200 mb-3">Bank Account Details</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Account Type</label>
                <select
                  value={bankAccount.accountType}
                  onChange={(e) => setBankAccount(prev => ({ 
                    ...prev, 
                    accountType: e.target.value as 'checking' | 'savings' 
                  }))}
                  className="w-full px-3 py-2 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm"
                >
                  <option className="bg-slate-800 text-white" value="checking">Checking</option>
                  <option className="bg-slate-800 text-white" value="savings">Savings</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Routing Number</label>
                <input
                  type="text"
                  value={bankAccount.routingNumber}
                  onChange={(e) => setBankAccount(prev => ({ 
                    ...prev, 
                    routingNumber: e.target.value.replace(/\D/g, '').slice(0, 9)
                  }))}
                  placeholder="123456789"
                  maxLength={9}
                  className="w-full px-3 py-2 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Account Number</label>
                <input
                  type="text"
                  value={bankAccount.accountNumber}
                  onChange={(e) => setBankAccount(prev => ({ 
                    ...prev, 
                    accountNumber: e.target.value.replace(/\D/g, '').slice(0, 17)
                  }))}
                  placeholder="Account number"
                  maxLength={17}
                  className="w-full px-3 py-2 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>

          {/* Fee Breakdown */}
          {amount && parseFloat(amount) > 0 && (
            <div className="bg-white/5 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between text-blue-200">
                <span>Withdrawal Amount:</span>
                <span>{formatCurrency(amountInCents)}</span>
              </div>
              {selectedMethod.fee > 0 && (
                <div className="flex justify-between text-blue-300">
                  <span>Processing Fee:</span>
                  <span>-{formatCurrency(selectedMethod.fee)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-green-300 border-t border-white/20 pt-2">
                <span>Net Amount:</span>
                <span>{formatCurrency(netAmount)}</span>
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">
                Arrives in {selectedMethod.processingTime}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-white/20 rounded-xl text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all duration-200 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing || !amount || parseFloat(amount) <= 0}
              className="flex-1 px-6 py-3 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg bg-gradient-to-r from-green-600 to-green-800 hover:from-green-500 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </div>
              ) : (
                'Withdraw Funds'
              )}
            </button>
          </div>

          {/* Security Notice */}
          <div className="text-xs text-gray-400 text-center border-t border-white/10 pt-4">
            <p>🔒 Your bank account information is encrypted and secure.</p>
            <p>Withdrawals are processed through Stripe&apos;s secure payment system.</p>
          </div>
        </form>
      </div>
    </div>
  );
}

