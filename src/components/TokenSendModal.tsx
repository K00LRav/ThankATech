'use client';

import React, { useState, useEffect } from 'react';
import { sendTokens, getUserTokenBalance } from '@/lib/token-firebase';
import { formatTokens } from '@/lib/tokens';

interface TokenSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  technicianId: string;
  technicianName: string;
  userId: string;
}

export default function TokenSendModal({ 
  isOpen, 
  onClose, 
  technicianId, 
  technicianName, 
  userId 
}: TokenSendModalProps) {
  const [tokens, setTokens] = useState(5);
  const [sending, setSending] = useState(false);
  const [userBalance, setUserBalance] = useState(0);

  useEffect(() => {
    if (isOpen && userId) {
      loadUserData();
    }
  }, [isOpen, userId]);

  const loadUserData = async () => {
    try {
      // Load user token balance
      const balance = await getUserTokenBalance(userId);
      setUserBalance(balance.tokens);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleSend = async () => {
    setSending(true);
    
    try {
      const result = await sendTokens(userId, technicianId, tokens);
      
      if (result.success) {
        // Show success message
        alert(`Success! ${formatTokens(tokens)} sent to ${technicianName}!`);
        onClose();
        // Refresh balance
        loadUserData();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error sending tokens:', error);
      alert('Error sending tokens. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 iphone-safe-top iphone-safe-bottom">
      <div className="iphone-modal bg-white/15 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 p-4 sm:p-6 w-full max-w-sm sm:max-w-md">
        <div className="flex justify-between items-center bg-gradient-to-r from-green-500/90 to-blue-600/90 backdrop-blur-md text-white p-4 rounded-t-2xl -m-4 mb-4 border-b border-white/20 sm:-m-6 sm:mb-4">
          <h2 className="text-xl font-bold">Send TOA Tokens</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4">
          <div className="mb-4">
            <p className="text-gray-800 mb-2">To: <span className="font-semibold">{technicianName}</span></p>
            <p className="text-sm text-gray-600">Your token balance: {formatTokens(userBalance)}</p>
          </div>

          {/* Token Amount Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Token Amount: {formatTokens(tokens)}
            </label>
            <input
              type="range"
              min="5"
              max="50"
              value={tokens}
              onChange={(e) => setTokens(parseInt(e.target.value))}
              className="w-full h-2 bg-white/30 backdrop-blur-sm rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>5 tokens</span>
              <span>50 tokens</span>
            </div>
            {userBalance < tokens && (
              <p className="text-red-600 text-sm mt-1 bg-red-100/50 backdrop-blur-sm rounded-lg p-2 border border-red-200/50">
                Not enough tokens. You have {formatTokens(userBalance)}.
              </p>
            )}
          </div>

          {/* Message Info */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Message:</h3>
            <div className="p-3 bg-gradient-to-r from-blue-100/20 to-green-100/20 backdrop-blur-md border border-white/30 rounded-xl">
              <p className="text-sm text-gray-700 italic">
                &quot;Thank you for your exceptional service! Your expertise and dedication truly make a difference. Here&apos;s {tokens} tokens as a token of my appreciation.&quot;
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl hover:bg-white/30 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || userBalance < tokens}
            className="iphone-btn-primary flex-1 px-4 py-3 bg-gradient-to-r from-green-500/90 to-blue-600/90 backdrop-blur-md text-white rounded-2xl hover:from-green-600/90 hover:to-blue-700/90 disabled:from-gray-400/50 disabled:to-gray-500/50 disabled:cursor-not-allowed transition-all border border-white/30 active:scale-95"
          >
            {sending ? 'Sending...' : `Send ${formatTokens(tokens)}`}
          </button>
        </div>
      </div>
    </div>
  );
}