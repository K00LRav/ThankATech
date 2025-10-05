"use client";

import { useState, useEffect } from 'react';
import { convertPointsToTOA, getConversionStatus } from '../lib/token-firebase';
import { CONVERSION_SYSTEM } from '../lib/tokens';

interface ConversionWidgetProps {
  userId: string;
}

export default function ConversionWidget({ userId }: ConversionWidgetProps) {
  const [conversionStatus, setConversionStatus] = useState<any>(null);
  const [pointsToConvert, setPointsToConvert] = useState<number>(CONVERSION_SYSTEM.pointsToTOARate);
  const [converting, setConverting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (userId) {
      loadConversionStatus();
    }
  }, [userId]);

  const loadConversionStatus = async () => {
    try {
      const status = await getConversionStatus(userId);
      setConversionStatus(status);
      
      // Set default conversion amount to maximum convertible
      if (status.canConvert > 0) {
        setPointsToConvert(Math.min(
          status.canConvert * CONVERSION_SYSTEM.pointsToTOARate,
          status.availablePoints
        ));
      }
    } catch (error) {
      console.error('Error loading conversion status:', error);
      setMessage('❌ Failed to load conversion status');
    }
  };

  const handleConversion = async () => {
    if (!conversionStatus || converting) return;

    setConverting(true);
    setMessage('');

    try {
      const result = await convertPointsToTOA(userId, pointsToConvert);
      
      if (result.success) {
        setMessage(result.message || `🎉 Successfully converted ${pointsToConvert} points to ${result.tokensGenerated} TOA tokens!`);
        await loadConversionStatus(); // Refresh status
        setPointsToConvert(CONVERSION_SYSTEM.pointsToTOARate); // Reset to minimum
      } else {
        setMessage(`❌ ${result.error}`);
      }
    } catch (error) {
      setMessage('❌ Conversion failed. Please try again.');
    } finally {
      setConverting(false);
      
      // Clear message after 5 seconds
      setTimeout(() => setMessage(''), 5000);
    }
  };

  if (!conversionStatus) {
    return (
      <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-6">
        <div className="animate-pulse bg-white/5 rounded-lg h-40 flex items-center justify-center">
          <div className="text-purple-300">Loading conversion status...</div>
        </div>
      </div>
    );
  }

  const tokensToGenerate = Math.floor(pointsToConvert / CONVERSION_SYSTEM.pointsToTOARate);
  const canConvertAmount = pointsToConvert >= CONVERSION_SYSTEM.minimumConversion && 
                          pointsToConvert <= conversionStatus.availablePoints &&
                          tokensToGenerate <= conversionStatus.canConvert &&
                          pointsToConvert % CONVERSION_SYSTEM.pointsToTOARate === 0;

  return (
    <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-4 sm:p-6 iphone-card">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2 sm:gap-0">
        <h3 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
          <span className="text-xl sm:text-2xl">⚡</span>
          Convert Points to TOA
        </h3>
        <div className="text-xs sm:text-sm text-purple-200">
          Rate: {CONVERSION_SYSTEM.pointsToTOARate} points = 1 TOA
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Status Display - iPhone 12 Pro Max Optimized */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-300">{conversionStatus.availablePoints}</div>
            <div className="text-xs text-purple-200">ThankATech Points</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-300">{conversionStatus.canConvert}</div>
            <div className="text-xs text-green-200">Max TOA Today</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-300">{conversionStatus.usedToday}</div>
            <div className="text-xs text-blue-200">Converted Today</div>
          </div>
        </div>

        {conversionStatus.availablePoints >= CONVERSION_SYSTEM.minimumConversion && conversionStatus.canConvert > 0 ? (
          <>
            {/* Conversion Input */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Points to Convert
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={pointsToConvert}
                    onChange={(e) => setPointsToConvert(Math.max(0, parseInt(e.target.value) || 0))}
                    min={CONVERSION_SYSTEM.minimumConversion}
                    max={Math.min(conversionStatus.availablePoints, conversionStatus.canConvert * CONVERSION_SYSTEM.pointsToTOARate)}
                    step={CONVERSION_SYSTEM.pointsToTOARate}
                    className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <div className="text-white font-medium">
                    → <span className="font-bold text-green-300">{tokensToGenerate}</span> TOA
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Must be multiple of {CONVERSION_SYSTEM.pointsToTOARate} points
                </div>
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: 'Min', points: CONVERSION_SYSTEM.minimumConversion },
                  { label: '10 TOA', points: 50 },
                  { label: '20 TOA', points: 100 },
                  { label: 'Max', points: Math.min(conversionStatus.availablePoints, conversionStatus.canConvert * CONVERSION_SYSTEM.pointsToTOARate) }
                ].filter(option => 
                  option.points <= conversionStatus.availablePoints && 
                  option.points >= CONVERSION_SYSTEM.minimumConversion &&
                  option.points % CONVERSION_SYSTEM.pointsToTOARate === 0
                ).map((option) => (
                  <button
                    key={option.label}
                    onClick={() => setPointsToConvert(option.points)}
                    className="px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-200 rounded-lg text-sm transition-all duration-200 hover:scale-105"
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {/* Convert Button */}
              <button
                onClick={handleConversion}
                disabled={!canConvertAmount || converting}
                className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 ${
                  canConvertAmount && !converting
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl hover:scale-105'
                    : 'bg-gray-600/20 text-gray-400 cursor-not-allowed'
                }`}
              >
                {converting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white animate-spin rounded-full"></div>
                    Converting...
                  </div>
                ) : (
                  `Convert ${pointsToConvert} Points → ${tokensToGenerate} TOA`
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            {conversionStatus.availablePoints < CONVERSION_SYSTEM.minimumConversion ? (
              <div className="text-gray-300">
                <div className="text-4xl mb-3">⚡</div>
                <p className="text-lg font-medium">Earn {CONVERSION_SYSTEM.minimumConversion} ThankATech Points to start converting!</p>
                <p className="text-sm text-gray-400 mt-2">
                  Get points by sending thank yous (1 pt) and TOA tokens (1 pt per token sent)
                </p>
              </div>
            ) : (
              <div className="text-gray-300">
                <div className="text-4xl mb-3">🎯</div>
                <p className="text-lg font-medium">Daily conversion limit reached!</p>
                <p className="text-sm text-gray-400 mt-2">
                  You can convert {conversionStatus.dailyLimit - conversionStatus.usedToday} more TOA tomorrow
                </p>
              </div>
            )}
          </div>
        )}

        {/* Status Message */}
        {message && (
          <div className={`p-4 rounded-lg text-sm transition-all duration-200 ${
            message.includes('Successfully') 
              ? 'bg-green-500/20 text-green-200 border border-green-500/30'
              : 'bg-red-500/20 text-red-200 border border-red-500/30'
          }`}>
            {message}
          </div>
        )}

        {/* Conversion Info */}
        <div className="bg-white/5 rounded-lg p-4">
          <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
            <span>💡</span>
            How The Closed-Loop Economy Works
          </h4>
          <ul className="text-xs text-gray-300 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-300">1.</span>
              <span>Send thank yous → Technician earns 1 ThankATech Point (free for customers)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-300">2.</span>
              <span>Send TOA tokens → Earn 1 point per transaction (for being generous!)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-300">3.</span>
              <span>Convert 5 points → 1 TOA token (send more appreciation without buying)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-300">4.</span>
              <span>Daily limit: {CONVERSION_SYSTEM.maxDailyConversions} TOA conversions (prevents abuse)</span>
            </li>
          </ul>
          <div className="mt-3 p-2 bg-purple-500/10 rounded border border-purple-500/20">
            <p className="text-xs text-purple-200 font-medium">
              🔄 Creates endless appreciation: Your generosity generates points to appreciate others!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}