'use client';

import React, { useState, useEffect } from 'react';
import { sendTokens, getUserTokenBalance } from '@/lib/token-firebase';
import { formatTokens, RANDOM_THANK_YOU_MESSAGES } from '@/lib/tokens';

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
  const [customMessage, setCustomMessage] = useState('');
  const [useRandomMessage, setUseRandomMessage] = useState(true);
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
      const messageToSend = useRandomMessage ? undefined : customMessage;
      
      const result = await sendTokens(userId, technicianId, tokens, messageToSend);
      
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

  const getRandomPreview = () => {
    const randomIndex = Math.floor(Math.random() * RANDOM_THANK_YOU_MESSAGES.length);
    return RANDOM_THANK_YOU_MESSAGES[randomIndex];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Send Tokens</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="mb-4">
          <p className="text-gray-600 mb-2">To: <span className="font-semibold">{technicianName}</span></p>
          <p className="text-sm text-gray-500">Your token balance: {formatTokens(userBalance)}</p>
        </div>

        {/* Token Amount Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Token Amount: {formatTokens(tokens)}
          </label>
          <input
            type="range"
            min="5"
            max="50"
            value={tokens}
            onChange={(e) => setTokens(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>5 tokens</span>
            <span>50 tokens</span>
          </div>
          {userBalance < tokens && (
            <p className="text-red-500 text-sm mt-1">
              Not enough tokens. You have {formatTokens(userBalance)}.
            </p>
          )}
        </div>

        {/* Message Selection */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Message:</h3>
          
          <label className={`block p-3 border rounded-lg mb-2 cursor-pointer ${
            useRandomMessage ? 'border-green-500 bg-green-50' : 'border-gray-200'
          }`}>
            <input
              type="radio"
              name="messageType"
              checked={useRandomMessage}
              onChange={() => setUseRandomMessage(true)}
              className="mr-2"
            />
            <span className="font-medium">Random Message</span>
            <span className="text-sm text-gray-500 block ml-6 italic">
              &quot;{getRandomPreview()}&quot;
            </span>
          </label>

          <label className={`block p-3 border rounded-lg cursor-pointer ${
            !useRandomMessage ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
          }`}>
            <input
              type="radio"
              name="messageType"
              checked={!useRandomMessage}
              onChange={() => setUseRandomMessage(false)}
              className="mr-2"
            />
            <span className="font-medium">Custom Message</span>
          </label>

          {!useRandomMessage && (
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Write your personal thank you message..."
              className="w-full mt-2 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              maxLength={300}
            />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || userBalance < tokens || (!useRandomMessage && !customMessage.trim())}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : `Send ${formatTokens(tokens)}`}
          </button>
        </div>
      </div>
    </div>
  );
}