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
  const [selectedPack, setSelectedPack] = useState(TOKEN_PACKS[2]); // Default to "Best Value" pack (psychological anchor)
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
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 iphone-safe-top iphone-safe-bottom">
      <div className="iphone-modal bg-white/15 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 max-w-sm w-full max-h-[90vh] overflow-y-auto sm:max-w-5xl sm:max-h-[85vh]">
        {/* Header - iPhone 12 Pro Max Optimized */}
        <div className="bg-gradient-to-r from-green-500/90 to-blue-600/90 backdrop-blur-md text-white p-4 sm:p-6 rounded-t-2xl border-b border-white/20">
          <div className="flex justify-between items-center">
            <div className="flex-1 mr-3">
              <h2 className="text-xl sm:text-2xl font-bold leading-tight">Purchase TOA Tokens</h2>
              <p className="text-green-100 mt-1 text-sm sm:text-base leading-tight">Power the closed-loop appreciation economy & earn ThankATech Points</p>
            </div>
            <button 
              onClick={onClose}
              className="mobile-btn text-white hover:text-gray-200 text-xl sm:text-2xl font-bold p-2 flex-shrink-0"
            >
              ×
            </button>
          </div>
          
          {/* Current Balance - Mobile Optimized */}
          <div className="mt-3 sm:mt-4 bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3">
            <div className="text-xs sm:text-sm text-green-100">Current TOA Balance</div>
            <div className="text-lg sm:text-xl font-bold text-white">{formatTokens(currentBalance)}</div>
          </div>
        </div>

        {/* Token Packs - iPhone 12 Pro Max Optimized */}
        <div className="p-4 sm:p-6 bg-white/5 backdrop-blur-sm">
          <div className="iphone-grid-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 mb-6">
            {TOKEN_PACKS.map((pack) => (
              <div
                key={pack.id}
                onClick={() => setSelectedPack(pack)}
                className={`iphone-touch-target relative border-2 rounded-2xl p-4 cursor-pointer transition-all duration-200 backdrop-blur-md active:scale-95 ${
                  selectedPack.id === pack.id
                    ? 'border-green-400/60 bg-gradient-to-br from-green-100/30 to-blue-100/30 shadow-lg scale-105 border-opacity-80'
                    : 'border-white/30 bg-white/10 hover:border-green-300/50 hover:bg-white/20 hover:shadow-md'
                }`}
              >
                {/* Popular/Best Value Badges */}
                {pack.popular && (
                  <div className="absolute -top-2 left-4 bg-gradient-to-r from-orange-500/90 to-red-500/90 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full shadow-md border border-white/20">
                    🔥 POPULAR
                  </div>
                )}
                {pack.bestValue && (
                  <div className="absolute -top-2 left-4 bg-gradient-to-r from-purple-500/90 to-pink-500/90 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full shadow-md border border-white/20">
                    💎 BEST VALUE
                  </div>
                )}
                
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{pack.name}</div>
                  <div className="text-3xl font-bold text-blue-700 my-2">
                    {formatTokens(pack.tokens)}
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatPrice(pack.price)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {formatPrice(Math.round(pack.pricePerToken))} per TOA
                  </div>
                  
                  {pack.popular && (
                    <div className="text-sm text-blue-600 font-medium mt-2">
                      Save 50% per token!
                    </div>
                  )}
                  {pack.bestValue && (
                    <div className="text-sm text-blue-700 font-medium mt-2">
                      Save 50% vs Starter Pack
                    </div>
                  )}
                  {pack.id === 'bulk' && (
                    <div className="text-sm text-blue-600 font-medium mt-2">
                      Save 60% vs Starter Pack
                    </div>
                  )}
                  {pack.id === 'premium' && (
                    <div className="text-sm text-blue-700 font-medium mt-2">
                      Save 66% vs Starter Pack
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* How ThankATech Points & TOA Work */}
          <div className="bg-gradient-to-r from-blue-100/20 to-green-100/20 backdrop-blur-md rounded-xl p-4 mb-6 border border-white/30">
            <h3 className="font-bold text-gray-900 mb-3 text-center">💫 ThankATech Closed-Loop Economy</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-gray-800">
              <div className="flex flex-col items-center text-center p-2">
                <span className="text-blue-500 text-xl mb-1">✨</span>
                <span><strong>Earn Points</strong><br/>Both get 1 point per thank you</span>
              </div>
              <div className="flex flex-col items-center text-center p-2">
                <span className="text-green-500 text-xl mb-1">🔄</span>
                <span><strong>Convert Points</strong><br/>5 Points = 1 TOA token</span>
              </div>
              <div className="flex flex-col items-center text-center p-2">
                <span className="text-orange-500 text-xl mb-1">🧡</span>
                <span><strong>Send TOA</strong><br/>5-50 tokens = real money</span>
              </div>
              <div className="flex flex-col items-center text-center p-2">
                <span className="text-purple-500 text-xl mb-1">💰</span>
                <span><strong>Get Paid</strong><br/>85% to tech, 15% platform</span>
              </div>
            </div>
          </div>

          {/* Purchase Button & Security - iPhone 12 Pro Max Optimized */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/20">
            <button
              onClick={handlePurchase}
              disabled={isProcessing}
              className={`iphone-btn-primary w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-200 backdrop-blur-md border border-white/30 active:scale-95 ${
                isProcessing
                  ? 'bg-gray-300/50 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600/90 to-blue-800/90 hover:from-blue-700/90 hover:to-blue-900/90 text-white shadow-lg hover:shadow-xl'
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
            <div className="text-xs text-gray-700 mt-3 flex items-center justify-center gap-4">
              <span>🔒 Secure Stripe Payment</span>
              <span>•</span>
              <span>💎 TOA Never Expire</span>
              <span>•</span>
              <span>⚡ Instant Delivery</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}