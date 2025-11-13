'use client';

import { useState, useEffect } from 'react';
import { convertPointsToTOA, getConversionStatus } from '@/lib/token-firebase';
import { CONVERSION_SYSTEM } from '@/lib/tokens';

interface PointsConversionWidgetProps {
  userId: string;
  currentPoints: number;
  onConversionComplete?: () => void;
}

export default function PointsConversionWidget({ 
  userId, 
  currentPoints,
  onConversionComplete 
}: PointsConversionWidgetProps) {
  const [pointsToConvert, setPointsToConvert] = useState<string>('');
  const [isConverting, setIsConverting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [conversionStatus, setConversionStatus] = useState<{
    availablePoints: number;
    canConvert: number;
    conversionRate?: number;
  } | null>(null);

  useEffect(() => {
    loadConversionStatus();
  }, [userId, currentPoints]);

  const loadConversionStatus = async () => {
    try {
      const status = await getConversionStatus(userId);
      setConversionStatus(status);
    } catch (error) {
      console.error('Error loading conversion status:', error);
    }
  };

  const handleConvert = async () => {
    const points = parseInt(pointsToConvert);
    
    if (isNaN(points) || points <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid number of points' });
      return;
    }

    if (points < CONVERSION_SYSTEM.minimumConversion) {
      setMessage({ 
        type: 'error', 
        text: `Minimum conversion is ${CONVERSION_SYSTEM.minimumConversion} points` 
      });
      return;
    }

    if (points > currentPoints) {
      setMessage({ type: 'error', text: `You only have ${currentPoints} points available` });
      return;
    }

    if (points % CONVERSION_SYSTEM.pointsToTOARate !== 0) {
      setMessage({ 
        type: 'error', 
        text: `Points must be divisible by ${CONVERSION_SYSTEM.pointsToTOARate}` 
      });
      return;
    }

    setIsConverting(true);
    setMessage(null);

    try {
      const result = await convertPointsToTOA(userId, points);
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: result.message || `Successfully converted ${points} points to ${result.tokensGenerated} TOA!` 
        });
        setPointsToConvert('');
        
        // Delay to ensure Firebase has fully propagated changes
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Reload status
        await loadConversionStatus();
        
        // Notify parent component to reload everything (await it!)
        if (onConversionComplete) {
          await onConversionComplete();
        }
      } else {
        setMessage({ type: 'error', text: result.error || 'Conversion failed' });
      }
    } catch (error) {
      console.error('Conversion error:', error);
      setMessage({ type: 'error', text: 'An error occurred during conversion' });
    } finally {
      setIsConverting(false);
    }
  };

  const calculateTokens = () => {
    const points = parseInt(pointsToConvert);
    if (isNaN(points) || points <= 0) return 0;
    return Math.floor(points / CONVERSION_SYSTEM.pointsToTOARate);
  };

  const suggestedAmounts = [5, 10, 25, 50, 100, 500].filter(amount => amount <= currentPoints);

  return (
    <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-lg rounded-xl border border-white/20 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">Convert Points to TOA</h3>
        <div className="text-sm text-slate-300 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
          Rate: {CONVERSION_SYSTEM.pointsToTOARate} pts = 1 TOA
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 mb-4 border border-white/20">
        <div className="flex justify-between items-center mb-2">
          <span className="text-slate-300">Your Points Balance:</span>
          <span className="text-2xl font-bold text-purple-400">{currentPoints} pts</span>
        </div>
        {conversionStatus && (
          <div className="text-sm text-slate-400">
            Can convert up to {conversionStatus.canConvert} TOA tokens
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Quick Convert Buttons */}
        {suggestedAmounts.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Quick Convert:
            </label>
            <div className="flex flex-wrap gap-2">
              {suggestedAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setPointsToConvert(amount.toString())}
                  className="px-4 py-2 bg-purple-500/30 hover:bg-purple-500/50 text-purple-200 rounded-lg text-sm font-medium transition-colors border border-purple-400/30 backdrop-blur-sm"
                >
                  {amount} pts → {Math.floor(amount / CONVERSION_SYSTEM.pointsToTOARate)} TOA
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom Amount Input */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Or enter custom amount:
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="number"
                value={pointsToConvert}
                onChange={(e) => setPointsToConvert(e.target.value)}
                placeholder={`Min ${CONVERSION_SYSTEM.minimumConversion} points`}
                min={CONVERSION_SYSTEM.minimumConversion}
                max={currentPoints}
                step={CONVERSION_SYSTEM.pointsToTOARate}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-400 backdrop-blur-sm"
                disabled={isConverting}
              />
              {pointsToConvert && (
                <div className="text-sm text-slate-400 mt-1">
                  = {calculateTokens()} TOA tokens
                </div>
              )}
            </div>
            <button
              onClick={handleConvert}
              disabled={isConverting || !pointsToConvert || currentPoints === 0}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
            >
              {isConverting ? 'Converting...' : 'Convert'}
            </button>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`p-4 rounded-lg backdrop-blur-sm border ${
            message.type === 'success' 
              ? 'bg-green-500/20 text-green-200 border-green-400/30' 
              : 'bg-red-500/20 text-red-200 border-red-400/30'
          }`}>
            {message.text}
          </div>
        )}

        {/* Info Text */}
        <div className="text-xs text-slate-400 bg-white/5 rounded-lg p-3 backdrop-blur-sm border border-white/10">
          <p className="font-semibold mb-1 text-slate-300">💡 How it works:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Earn points by sending and receiving TOA tokens and thank yous</li>
            <li>Convert {CONVERSION_SYSTEM.pointsToTOARate} ThankATech Points = 1 TOA token</li>
            <li>Minimum conversion: {CONVERSION_SYSTEM.minimumConversion} points</li>
            <li>No daily limits - convert anytime!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
