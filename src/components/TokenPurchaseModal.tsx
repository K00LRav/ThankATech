'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TOKEN_PACKS, formatPrice, formatTokens } from '@/lib/tokens';
import { getUserTokenBalance, addTokensToBalance } from '@/lib/token-firebase';

interface TokenPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onPurchaseSuccess: (tokens: number) => void;
}

export default function TokenPurchaseModal({ 
  isOpen, 
  onClose, 
  userId, 
  onPurchaseSuccess 
}: TokenPurchaseModalProps) {
  const [selectedPack, setSelectedPack] = useState(TOKEN_PACKS[1]); // Default to popular pack
  const [isProcessing, setPurchasing] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(0);
  
  const loadTokenBalance = useCallback(async () => {
    try {
      const balance = await getUserTokenBalance(userId);
      setCurrentBalance(balance.tokens);
    } catch (error) {
      console.error('Error loading token balance:', error);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen && userId) {
      loadTokenBalance();
    }
  }, [isOpen, userId, loadTokenBalance]);

  const handlePurchase = async () => {
    setPurchasing(true);
    
    try {
      // Create Stripe checkout session
      const response = await fetch('/api/create-token-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packId: selectedPack.id,
          userId: userId,
          tokens: selectedPack.tokens,
          price: selectedPack.price
        }),
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Purchase failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Purchase ThankATech Tokens</h2>
              <p className="text-blue-100 mt-1">Send appreciation to your favorite technicians</p>
            </div>
            <button 
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
          
          {/* Current Balance */}
          <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-lg p-3">
            <div className="text-sm text-blue-100">Current Balance</div>
            <div className="text-xl font-bold text-white">{formatTokens(currentBalance)}</div>
          </div>
        </div>

        {/* Token Packs */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {TOKEN_PACKS.map((pack) => (
              <div
                key={pack.id}
                onClick={() => setSelectedPack(pack)}
                className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                  selectedPack.id === pack.id
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
              >
                {/* Popular/Best Value Badges */}
                {pack.popular && (
                  <div className="absolute -top-2 left-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    POPULAR
                  </div>
                )}
                {pack.bestValue && (
                  <div className="absolute -top-2 left-4 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    BEST VALUE
                  </div>
                )}
                
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-800">{pack.name}</div>
                  <div className="text-3xl font-bold text-blue-600 my-2">
                    {formatTokens(pack.tokens)}
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatPrice(pack.price)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {formatPrice(Math.round(pack.pricePerToken))} per token
                  </div>
                  
                  {pack.bestValue && (
                    <div className="text-sm text-purple-600 font-medium mt-2">
                      Save 23% vs Starter Pack
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* How It Works */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h3 className="font-bold text-gray-800 mb-3">🎯 How ThankATech Tokens Work</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <span className="text-green-500">✅</span>
                <span><strong>3 Free Thank Yous Daily</strong> - Send appreciation without tokens</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500">🎁</span>
                <span><strong>Send 5-50 Tokens</strong> - Show extra appreciation with custom amounts</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-500">💬</span>
                <span><strong>Random Messages</strong> - We&apos;ll include a thoughtful thank you message</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-yellow-500">📧</span>
                <span><strong>Instant Notifications</strong> - Technicians get notified immediately</span>
              </div>
            </div>
          </div>

          {/* Purchase Button */}
          <button
            onClick={handlePurchase}
            disabled={isProcessing}
            className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 ${
              isProcessing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white shadow-lg hover:shadow-xl'
            }`}
          >
            {isProcessing ? (
              <>
                <span className="inline-block animate-spin mr-2">⏳</span>
                Processing...
              </>
            ) : (
              <>
                🛒 Purchase {formatTokens(selectedPack.tokens)} for {formatPrice(selectedPack.price)}
              </>
            )}
          </button>

          {/* Security Notice */}
          <div className="text-center text-xs text-gray-500 mt-4">
            🔒 Secure payment powered by Stripe • Your tokens never expire
          </div>
        </div>
      </div>
    </div>
  );
}