'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
        if (url) {
          window.location.href = url;
        } else {
          throw new Error('No checkout URL received');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Purchase error:', error);
      const message = error instanceof Error ? error.message : 'Purchase failed. Please try again.';
      alert(`Purchase failed: ${message}`);
    } finally {
      setPurchasing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 iphone-safe-top iphone-safe-bottom">
      <div className="iphone-modal bg-white/15 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 max-w-sm w-full max-h-[90vh] overflow-y-auto sm:max-w-4xl lg:max-w-5xl xl:max-w-6xl sm:max-h-[85vh]">
        {/* Header - iPhone 12 Pro Max Optimized with Signature Amber Theme */}
        <div className="bg-gradient-to-r from-amber-500/90 to-yellow-600/90 backdrop-blur-md text-white p-4 sm:p-6 rounded-t-2xl border-b border-amber-300/30">
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

        {/* Token Packs - 5-column desktop, 2x2+1 mobile */}
        <div className="p-2 sm:p-6 bg-white/5 backdrop-blur-sm">
          {/* Desktop: 5-column grid | Mobile: 2x2 grid for first 4 */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-1.5 sm:gap-3 lg:gap-4 mb-2 sm:mb-4 lg:mb-0">
            {TOKEN_PACKS.slice(0, 4).map((pack) => (
              <div
                key={pack.id}
                onClick={() => setSelectedPack(pack)}
                className={`iphone-touch-target relative border-2 rounded-lg sm:rounded-2xl p-1.5 sm:p-3 lg:p-4 cursor-pointer transition-all duration-200 backdrop-blur-md active:scale-95 ${
                  selectedPack.id === pack.id
                    ? 'border-amber-400/60 bg-gradient-to-br from-amber-100/30 to-yellow-100/30 shadow-lg shadow-amber-400/25 scale-105 border-opacity-80'
                    : 'border-white/30 bg-white/10 hover:border-amber-300/50 hover:bg-white/20 hover:shadow-md'
                }`}
              >
                {/* Popular/Best Value Badges - Ultra Mobile Optimized */}
                {pack.popular && (
                  <div className="absolute -top-1 sm:-top-2 left-1 sm:left-4 bg-gradient-to-r from-orange-500/90 to-red-500/90 backdrop-blur-md text-white text-xs font-bold px-1.5 py-0.5 sm:px-3 sm:py-1 rounded-full shadow-md border border-white/20">
                    🔥 <span className="hidden sm:inline">POPULAR</span>
                  </div>
                )}
                {pack.bestValue && (
                  <div className="absolute -top-1 sm:-top-2 left-1 sm:left-4 bg-gradient-to-r from-purple-500/90 to-pink-500/90 backdrop-blur-md text-white text-xs font-bold px-1.5 py-0.5 sm:px-3 sm:py-1 rounded-full shadow-md border border-white/20">
                    💎 <span className="hidden sm:inline">BEST VALUE</span>
                  </div>
                )}
                
                <div className="text-center">
                  <div className="text-xs sm:text-base lg:text-lg font-bold text-gray-900 leading-tight">{pack.name}</div>
                  <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-blue-700 my-0.5 sm:my-2">
                    {formatTokens(pack.tokens)}
                  </div>
                  <div className="text-base sm:text-xl lg:text-2xl font-bold text-gray-900">
                    {formatPrice(pack.price)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 leading-tight">
                    {formatPrice(Math.round(pack.pricePerToken))} per TOA
                  </div>
                  
                  {pack.popular && (
                    <div className="text-xs sm:text-sm text-blue-600 font-medium mt-0.5 sm:mt-2 leading-tight">
                      <span className="sm:hidden">Save 50%!</span>
                      <span className="hidden sm:inline">Save 50% per token!</span>
                    </div>
                  )}
                  {pack.bestValue && (
                    <div className="text-xs sm:text-sm text-blue-700 font-medium mt-0.5 sm:mt-2 leading-tight">
                      <span className="sm:hidden">Save 50%!</span>
                      <span className="hidden sm:inline">Save 50% vs Starter Pack</span>
                    </div>
                  )}
                  {pack.id === 'bulk' && (
                    <div className="text-xs sm:text-sm text-blue-600 font-medium mt-0.5 sm:mt-2 leading-tight">
                      <span className="sm:hidden">Save 60%!</span>
                      <span className="hidden sm:inline">Save 60% vs Starter Pack</span>
                    </div>
                  )}
                  {pack.id === 'premium' && (
                    <div className="text-xs sm:text-sm text-blue-700 font-medium mt-0.5 sm:mt-2 leading-tight">
                      <span className="sm:hidden">Save 66%!</span>
                      <span className="hidden sm:inline">Save 66% vs Starter Pack</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* 5th pack - Hidden on mobile (will show below), visible on desktop */}
            {TOKEN_PACKS.slice(4).map((pack) => (
              <div
                key={pack.id}
                onClick={() => setSelectedPack(pack)}
                className={`hidden lg:block iphone-touch-target relative border-2 rounded-lg sm:rounded-2xl p-1.5 sm:p-3 lg:p-4 cursor-pointer transition-all duration-200 backdrop-blur-md active:scale-95 ${
                  selectedPack.id === pack.id
                    ? 'border-amber-400/60 bg-gradient-to-br from-amber-100/30 to-yellow-100/30 shadow-lg shadow-amber-400/25 scale-105 border-opacity-80'
                    : 'border-white/30 bg-white/10 hover:border-amber-300/50 hover:bg-white/20 hover:shadow-md'
                }`}
              >
                {/* Popular/Best Value Badges - Ultra Mobile Optimized */}
                {pack.popular && (
                  <div className="absolute -top-1 sm:-top-2 left-1 sm:left-4 bg-gradient-to-r from-orange-500/90 to-red-500/90 backdrop-blur-md text-white text-xs font-bold px-1.5 py-0.5 sm:px-3 sm:py-1 rounded-full shadow-md border border-white/20">
                    🔥 <span className="hidden sm:inline">POPULAR</span>
                  </div>
                )}
                {pack.bestValue && (
                  <div className="absolute -top-1 sm:-top-2 left-1 sm:left-4 bg-gradient-to-r from-purple-500/90 to-pink-500/90 backdrop-blur-md text-white text-xs font-bold px-1.5 py-0.5 sm:px-3 sm:py-1 rounded-full shadow-md border border-white/20">
                    💎 <span className="hidden sm:inline">BEST VALUE</span>
                  </div>
                )}
                
                <div className="text-center">
                  <div className="text-xs sm:text-base lg:text-lg font-bold text-gray-900 leading-tight">{pack.name}</div>
                  <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-blue-700 my-0.5 sm:my-2">
                    {formatTokens(pack.tokens)}
                  </div>
                  <div className="text-base sm:text-xl lg:text-2xl font-bold text-gray-900">
                    {formatPrice(pack.price)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 leading-tight">
                    {formatPrice(Math.round(pack.pricePerToken))} per TOA
                  </div>
                  
                  {pack.popular && (
                    <div className="text-xs sm:text-sm text-blue-600 font-medium mt-0.5 sm:mt-2 leading-tight">
                      <span className="sm:hidden">Save 50%!</span>
                      <span className="hidden sm:inline">Save 50% per token!</span>
                    </div>
                  )}
                  {pack.bestValue && (
                    <div className="text-xs sm:text-sm text-blue-700 font-medium mt-0.5 sm:mt-2 leading-tight">
                      <span className="sm:hidden">Save 50%!</span>
                      <span className="hidden sm:inline">Save 50% vs Starter Pack</span>
                    </div>
                  )}
                  {pack.id === 'bulk' && (
                    <div className="text-xs sm:text-sm text-blue-600 font-medium mt-0.5 sm:mt-2 leading-tight">
                      <span className="sm:hidden">Save 60%!</span>
                      <span className="hidden sm:inline">Save 60% vs Starter Pack</span>
                    </div>
                  )}
                  {pack.id === 'premium' && (
                    <div className="text-xs sm:text-sm text-blue-700 font-medium mt-0.5 sm:mt-2 leading-tight">
                      <span className="sm:hidden">Save 66%!</span>
                      <span className="hidden sm:inline">Save 66% vs Starter Pack</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* 5th Pack - Centered at bottom on mobile only */}
          <div className="flex justify-center mb-3 sm:mb-6 lg:hidden">
            {TOKEN_PACKS.slice(4).map((pack) => (
              <div
                key={pack.id}
                onClick={() => setSelectedPack(pack)}
                className={`iphone-touch-target relative border-2 rounded-lg sm:rounded-2xl p-1.5 sm:p-3 lg:p-4 cursor-pointer transition-all duration-200 backdrop-blur-md active:scale-95 w-[48%] sm:w-64 ${
                  selectedPack.id === pack.id
                    ? 'border-amber-400/60 bg-gradient-to-br from-amber-100/30 to-yellow-100/30 shadow-lg shadow-amber-400/25 scale-105 border-opacity-80'
                    : 'border-white/30 bg-white/10 hover:border-amber-300/50 hover:bg-white/20 hover:shadow-md'
                }`}
              >
                {/* Popular/Best Value Badges - Ultra Mobile Optimized */}
                {pack.popular && (
                  <div className="absolute -top-1 sm:-top-2 left-1 sm:left-4 bg-gradient-to-r from-orange-500/90 to-red-500/90 backdrop-blur-md text-white text-xs font-bold px-1.5 py-0.5 sm:px-3 sm:py-1 rounded-full shadow-md border border-white/20">
                    🔥 <span className="hidden sm:inline">POPULAR</span>
                  </div>
                )}
                {pack.bestValue && (
                  <div className="absolute -top-1 sm:-top-2 left-1 sm:left-4 bg-gradient-to-r from-purple-500/90 to-pink-500/90 backdrop-blur-md text-white text-xs font-bold px-1.5 py-0.5 sm:px-3 sm:py-1 rounded-full shadow-md border border-white/20">
                    💎 <span className="hidden sm:inline">BEST VALUE</span>
                  </div>
                )}
                
                <div className="text-center">
                  <div className="text-xs sm:text-base lg:text-lg font-bold text-gray-900 leading-tight">{pack.name}</div>
                  <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-blue-700 my-0.5 sm:my-2">
                    {formatTokens(pack.tokens)}
                  </div>
                  <div className="text-base sm:text-xl lg:text-2xl font-bold text-gray-900">
                    {formatPrice(pack.price)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 leading-tight">
                    {formatPrice(Math.round(pack.pricePerToken))} per TOA
                  </div>
                  
                  {pack.popular && (
                    <div className="text-xs sm:text-sm text-blue-600 font-medium mt-0.5 sm:mt-2 leading-tight">
                      <span className="sm:hidden">Save 50%!</span>
                      <span className="hidden sm:inline">Save 50% per token!</span>
                    </div>
                  )}
                  {pack.bestValue && (
                    <div className="text-xs sm:text-sm text-blue-700 font-medium mt-0.5 sm:mt-2 leading-tight">
                      <span className="sm:hidden">Save 50%!</span>
                      <span className="hidden sm:inline">Save 50% vs Starter Pack</span>
                    </div>
                  )}
                  {pack.id === 'bulk' && (
                    <div className="text-xs sm:text-sm text-blue-600 font-medium mt-0.5 sm:mt-2 leading-tight">
                      <span className="sm:hidden">Save 60%!</span>
                      <span className="hidden sm:inline">Save 60% vs Starter Pack</span>
                    </div>
                  )}
                  {pack.id === 'premium' && (
                    <div className="text-xs sm:text-sm text-blue-700 font-medium mt-0.5 sm:mt-2 leading-tight">
                      <span className="sm:hidden">Save 66%!</span>
                      <span className="hidden sm:inline">Save 66% vs Starter Pack</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Simple info with link to learn more */}
          <div className="text-center mb-3 sm:mb-4">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">
              💫 Fuel the closed-loop appreciation economy
            </p>
            <Link 
              href="/about" 
              className="text-xs text-blue-600 hover:text-blue-800 underline transition-colors"
            >
              Learn how it works
            </Link>
          </div>

          {/* Purchase Button & Security - iPhone 12 Pro Max Optimized */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/20">
            <button
              onClick={handlePurchase}
              disabled={isProcessing}
              className={`iphone-btn-primary w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-200 backdrop-blur-md border border-emerald-300/30 active:scale-95 ${
                isProcessing
                  ? 'bg-gray-300/50 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-600/90 to-emerald-800/90 hover:from-emerald-700/90 hover:to-emerald-900/90 text-white shadow-lg hover:shadow-xl hover:shadow-emerald-500/25'
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