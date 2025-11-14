"use client";

import { useState } from 'react';
import Image from 'next/image';
import Avatar from './Avatar';

interface Technician {
  id: string;
  name: string;
  username?: string;
  businessName: string;
  category: string;
  email: string;
  phone?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessAddress?: string;
  website?: string;
  about?: string;
  experience?: string;
  certifications?: string;
  serviceArea?: string;
  hourlyRate?: string;
  availability?: string;
  image?: string;
  photoURL?: string;
  title?: string;
  points?: number;
  totalThankYous?: number;
  totalTips?: number;
  distance?: number;
  isNearby?: boolean;
}

interface RolodexCardProps {
  technician: Technician;
  onThankYou?: () => void;
  onSendTOA?: () => void;
  showActions?: boolean;
}

export function RolodexCard({ 
  technician, 
  onThankYou, 
  onSendTOA, 
  showActions = true
}: RolodexCardProps) {
  // State for expandable description on mobile
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Achievement badges based on ThankATech Points and community engagement
  const getAchievementBadges = () => {
    const badges = [];
    const totalThankYous = technician.totalThankYous || 0;
    const totalTips = technician.totalTips || 0;
    const totalPoints = (technician as any).points || 0;

    // ThankATech Points milestones (primary focus)
    if (totalPoints >= 100) badges.push({ icon: '🌟', text: 'Point Master', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' });
    else if (totalPoints >= 50) badges.push({ icon: '✨', text: 'Community Star', color: 'bg-blue-100 text-blue-800 border-blue-300' });
    else if (totalPoints >= 25) badges.push({ icon: '⚡', text: 'Rising Star', color: 'bg-purple-100 text-purple-800 border-purple-300' });

    // Thank you milestones
    if (totalThankYous >= 100) badges.push({ icon: '🏆', text: 'Thank You Champion', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' });
    else if (totalThankYous >= 50) badges.push({ icon: '�', text: 'Community Hero', color: 'bg-orange-100 text-orange-800 border-orange-300' });
    else if (totalThankYous >= 25) badges.push({ icon: '🥉', text: 'Appreciated', color: 'bg-green-100 text-green-800 border-green-300' });

    // TOA milestones
    if (totalTips >= 50) badges.push({ icon: '💎', text: 'Diamond TOA Earner', color: 'bg-purple-100 text-purple-800 border-purple-300' });
    else if (totalTips >= 25) badges.push({ icon: '🥇', text: 'Gold TOA Recipient', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' });
    else if (totalTips >= 10) badges.push({ icon: '⭐', text: 'TOA Earner', color: 'bg-amber-100 text-amber-800 border-amber-300' });

    return badges;
  };

  const achievementBadges = getAchievementBadges();

  const getCategoryIcon = (category: string, title: string) => {
    const normalizedCategory = category?.toLowerCase() || '';
    const normalizedTitle = title?.toLowerCase() || '';
    
    if (normalizedCategory.includes('plumb') || normalizedTitle.includes('plumb')) return '🔧';
    if (normalizedCategory.includes('electric') || normalizedTitle.includes('electric')) return '⚡';
    if (normalizedCategory.includes('hvac') || normalizedTitle.includes('hvac')) return '❄️';
    if (normalizedCategory.includes('clean') || normalizedTitle.includes('clean')) return '🧽';
    if (normalizedCategory.includes('garden') || normalizedTitle.includes('garden') || normalizedTitle.includes('lawn')) return '🌱';
    if (normalizedCategory.includes('car') || normalizedTitle.includes('auto')) return '🚗';
    if (normalizedCategory.includes('paint') || normalizedTitle.includes('paint')) return '🎨';
    if (normalizedCategory.includes('tech') || normalizedTitle.includes('tech') || normalizedTitle.includes('it')) return '💻';
    return '🔧';
  };

  const formatCategory = (category: string) => {
    return category?.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ') || 'Service Provider';
  };

  return (
    <div className="card-container relative group flex justify-center max-w-sm mx-auto sm:max-w-lg lg:max-w-3xl iphone-card">
      {/* Enhanced Rolodex background layers with better colors */}
      <div className="absolute top-2 left-2 right-2 bottom-2 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm rounded-2xl transform rotate-1 transition-all duration-500 group-hover:rotate-2 border border-blue-300/30 shadow-xl hidden sm:block"></div>
      <div className="absolute top-1 left-1 right-1 bottom-1 bg-gradient-to-br from-blue-500/25 to-cyan-500/25 backdrop-blur-sm rounded-2xl transform rotate-0.5 transition-all duration-500 group-hover:rotate-1 border border-blue-300/40 shadow-2xl hidden sm:block"></div>
      
      {/* Main Glass Card - Enhanced with better colors and glow */}
      <div className="relative w-full bg-gradient-to-br from-slate-800/90 via-blue-900/80 to-slate-800/90 backdrop-blur-xl border border-blue-400/30 rounded-2xl shadow-2xl transition-all duration-300 hover:shadow-[0_20px_60px_-15px_rgba(59,130,246,0.5)] hover:-translate-y-1 hover:border-blue-400/50 overflow-hidden z-10 mobile-touch-feedback">
        {/* Subtle inner glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 via-transparent to-cyan-400/5 pointer-events-none"></div>
        
        {/* Category Badge - Enhanced visibility */}
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 backdrop-blur-sm border border-blue-300/50 rounded-full px-2 py-1 sm:px-3 sm:py-1.5 shadow-lg hover:shadow-blue-400/50 transition-all duration-300 max-w-[120px] sm:max-w-none">
            <span className="text-sm sm:text-base lg:text-lg">{getCategoryIcon(technician.category, technician.title || '')}</span>
            <span className="text-white text-xs sm:text-sm font-semibold truncate drop-shadow-md">
              {formatCategory(technician.category)}
            </span>
          </div>
        </div>
        
        {/* Card Content */}
        <div className="relative p-6 sm:p-8 h-full min-h-[20rem] sm:min-h-[24rem]">
          <div className="flex flex-col h-full">
            {/* Header Section - Enhanced profile image */}
            <div className="flex items-start space-x-4 mb-4 mt-4 sm:mt-4">
              {/* Profile Image - Made larger */}
              <div className="relative">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-blue-400/40 hover:ring-blue-400/60 transition-all duration-300">
                  <Avatar
                    name={technician.name}
                    photoURL={technician.photoURL || technician.image}
                    size={128}
                    className="w-full h-full"
                    textSize="text-2xl sm:text-3xl"
                    rounded="2xl"
                  />
                </div>
                {/* ThankATech Points overlay - Positioned to not overlap image */}
                <div className="absolute -bottom-4 -right-4 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 text-white rounded-full min-w-[3rem] h-12 sm:min-w-[3.5rem] sm:h-14 flex items-center justify-center text-xs sm:text-sm font-bold shadow-2xl border-4 border-white hover:scale-110 transition-transform duration-300">
                  <span className="flex items-center justify-center px-2">
                    <span className="font-extrabold">{(technician as any).points || 0}</span>
                    <span className="ml-1">✨</span>
                  </span>
                </div>
              </div>

              {/* Name and Essential Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-white">{technician.name}</h2>
                  {technician.username && (
                    <a 
                      href={`/${technician.username}`}
                      className="group relative"
                      title="View Full Profile"
                    >
                      <div className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 hover:border-white/50 flex items-center justify-center transition-all duration-200 hover:scale-110">
                        <span className="text-white/70 hover:text-white text-xs">ℹ️</span>
                      </div>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20">
                        View Full Profile
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </a>
                  )}
                </div>
                <p className="text-base sm:text-lg text-blue-200 font-semibold mt-1">{technician.businessName || technician.title}</p>
                
                {/* Certified badge directly under name */}
                {technician.certifications && (
                  <div className="mt-2">
                    <span className="inline-flex items-center gap-1 bg-white/90 text-green-700 px-2 py-1 rounded-full text-xs font-medium border border-green-200 shadow-sm">
                      <span className="text-green-600">✓</span>
                      <span>Certified</span>
                    </span>
                  </div>
                )}
                
                {/* Distance if available */}
                {technician.distance !== undefined && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-gray-200 flex items-center">
                      🚗 {technician.distance.toFixed(1)} miles away
                    </span>
                    {technician.isNearby && (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                        📍 Nearby
                      </span>
                    )}
                  </div>
                )}
                
                {/* Achievement and Experience badges */}
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {/* Experience badge */}
                  {technician.experience && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-blue-100 text-blue-800 border-blue-300 shadow-sm">
                      <span className="text-xs">⚡</span>
                      <span className="text-xs">{technician.experience.replace(/[^\d]+/, '') + ' yrs'}</span>
                    </span>
                  )}
                  
                  {/* Achievement badges - show more on desktop */}
                  {achievementBadges.map((badge, index) => {
                    // On mobile, show only first badge + indicator
                    // On desktop, show up to 3 badges
                    const showOnMobile = index === 0;
                    const showOnDesktop = index < 3;
                    
                    if (!showOnMobile && !showOnDesktop) return null;
                    
                    return (
                      <span 
                        key={index}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${badge.color} shadow-sm ${
                          index === 0 ? '' : 'hidden sm:inline-flex'
                        }`}
                        title={`Achievement: ${badge.text}`}
                      >
                        <span className="text-xs">{badge.icon}</span>
                        <span className="text-xs">{badge.text}</span>
                      </span>
                    );
                  })}
                  
                  {/* Additional achievements indicator - mobile only (shows for 2+ badges) */}
                  {achievementBadges.length > 1 && (
                    <span className="text-xs text-gray-300 block sm:hidden">+{achievementBadges.length - 1}</span>
                  )}
                  
                  {/* Additional achievements indicator - desktop only (shows for 4+ badges) */}
                  {achievementBadges.length > 3 && (
                    <span className="text-xs text-gray-300 hidden sm:block">+{achievementBadges.length - 3}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Essential Info Only - Streamlined for customers */}
            <div className="space-y-3">
              {/* Brief About - Expandable on mobile */}
              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-sm">
                {(() => {
                  const aboutText = technician.about || `Professional ${formatCategory(technician.category)} with expertise in quality service delivery.`;
                  const isLong = aboutText.length > 120;
                  const shouldTruncate = isLong && !isDescriptionExpanded;
                  
                  return (
                    <div>
                      <p className={`text-sm text-gray-800 leading-relaxed ${shouldTruncate ? 'line-clamp-2' : ''}`}>
                        {shouldTruncate ? aboutText.substring(0, 120) + '...' : aboutText}
                      </p>
                      {isLong && (
                        <button
                          onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                          className="mt-2 text-xs sm:text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200 flex items-center gap-1"
                        >
                          {isDescriptionExpanded ? (
                            <>
                              <span className="text-xs">Show less</span>
                              <span className="text-xs">▲</span>
                            </>
                          ) : (
                            <>
                              <span className="text-xs">Read more</span>
                              <span className="text-xs">▼</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>




            </div>

            {/* Bottom Section - Enhanced stat cards */}
            <div className="mt-auto pt-2 sm:pt-3">
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl px-4 py-2.5 shadow-lg hover:shadow-blue-400/50 border border-blue-400/30 transition-all duration-300 hover:scale-105">
                  <div className="flex items-center space-x-2">
                    <span className="text-base">👍</span>
                    <span className="text-base font-bold">{technician.totalThankYous || 0}</span>
                    <span className="text-sm opacity-90 font-medium">thanks</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl px-4 py-2.5 shadow-lg hover:shadow-amber-400/50 border border-amber-400/30 transition-all duration-300 hover:scale-105">
                  <div className="flex items-center space-x-2">
                    <span className="text-base">⭐</span>
                    <span className="text-base font-bold">{technician.totalTips || 0}</span>
                    <span className="text-sm opacity-90 font-medium">TOA</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons - Enhanced colors and effects */}
            {showActions && (onThankYou || onSendTOA) && (
              <div className="flex flex-col gap-3 w-full max-w-sm mx-auto mt-4">
                {/* PRIMARY ACTION: Say Thank You - Enhanced with glow */}
                {onThankYou && (
                  <button 
                    onClick={onThankYou}
                    className="group flex items-center justify-center space-x-2 px-4 py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 backdrop-blur-sm rounded-xl transition-all duration-300 shadow-xl hover:shadow-[0_10px_40px_-10px_rgba(16,185,129,0.6)] transform hover:-translate-y-1 hover:scale-[1.02] min-h-[56px] w-full border border-emerald-400/50"
                  >
                    <span className="font-bold text-white text-base drop-shadow-md">🙏 Say Thank You</span>
                  </button>
                )}
                
                {/* SECONDARY ACTION: Send TOA - Enhanced visibility */}
                {onSendTOA && (
                  <button 
                    onClick={onSendTOA}
                    className="group flex items-center justify-center space-x-2 px-3 py-3 bg-gradient-to-r from-amber-500/30 to-orange-500/30 backdrop-blur-md hover:from-amber-500/40 hover:to-orange-500/40 rounded-xl transition-all duration-300 min-h-[48px] w-full border border-amber-400/60 hover:border-amber-300/80 shadow-lg hover:shadow-amber-400/40 hover:scale-[1.01]"
                  >
                    <span className="font-semibold text-amber-50 group-hover:text-white text-base drop-shadow-md">💝 Send TOA</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

