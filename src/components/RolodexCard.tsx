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
      {/* Rolodex background layers - hidden on mobile for performance */}
      <div className="absolute top-2 left-2 right-2 bottom-2 bg-gradient-to-br from-blue-400/10 to-teal-500/10 backdrop-blur-sm rounded-2xl transform rotate-1 transition-all duration-500 group-hover:rotate-2 border border-white/10 shadow-xl hidden sm:block"></div>
      <div className="absolute top-1 left-1 right-1 bottom-1 bg-gradient-to-br from-blue-400/15 to-teal-500/15 backdrop-blur-sm rounded-2xl transform rotate-0.5 transition-all duration-500 group-hover:rotate-1 border border-white/15 shadow-2xl hidden sm:block"></div>
      
      {/* Main Glass Card - iPhone 12 Pro Max Optimized */}
      <div className="relative w-full bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl transition-all duration-300 hover:shadow-3xl hover:-translate-y-1 hover:bg-white/15 overflow-hidden z-10 mobile-touch-feedback">
        {/* Category Badge - Adjusted for better spacing from info icon */}
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-blue-500/80 to-teal-600/80 backdrop-blur-sm border border-white/30 rounded-full px-2 py-1 sm:px-3 sm:py-1.5 shadow-lg max-w-[120px] sm:max-w-none">
            <span className="text-sm sm:text-base lg:text-lg">{getCategoryIcon(technician.category, technician.title || '')}</span>
            <span className="text-white text-xs sm:text-sm font-medium truncate">
              {formatCategory(technician.category)}
            </span>
          </div>
        </div>
        
        {/* Card Content */}
        <div className="relative p-6 sm:p-8 h-full min-h-[20rem] sm:min-h-[24rem]">
          <div className="flex flex-col h-full">
            {/* Header Section - Extra top margin for category badge clearance */}
            <div className="flex items-start space-x-4 mb-4 mt-4 sm:mt-4">
              {/* Profile Image */}
              <div className="relative">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-lg ring-4 ring-white/50">
                  <Avatar
                    name={technician.name}
                    photoURL={technician.photoURL || technician.image}
                    size={96}
                    className="w-full h-full"
                    textSize="text-xl sm:text-2xl"
                  />
                </div>
                {/* ThankATech Points overlay */}
                <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-xs sm:text-sm font-bold shadow-lg border-2 border-white">
                  <span className="flex items-center justify-center">
                    {(technician as any).points || 0}✨
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

            {/* Bottom Section */}
            <div className="mt-auto pt-2 sm:pt-3">
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-full px-4 py-2 shadow-lg border border-blue-400/20">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">👍</span>
                    <span className="text-sm font-bold">{technician.totalThankYous || 0}</span>
                    <span className="text-sm opacity-90">thanks</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-full px-4 py-2 shadow-lg border border-amber-400/20">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">⭐</span>
                    <span className="text-sm font-bold">{technician.totalTips || 0}</span>
                    <span className="text-sm opacity-90">TOA</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons - Brand-aligned hierarchy */}
            {showActions && (onThankYou || onSendTOA) && (
              <div className="flex flex-col gap-3 w-full max-w-sm mx-auto mt-4">
                {/* PRIMARY ACTION: Say Thank You - Emerald Call-to-Action */}
                {onThankYou && (
                  <button 
                    onClick={onThankYou}
                    className="group flex items-center justify-center space-x-2 px-4 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 backdrop-blur-sm rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/30 transform hover:-translate-y-1 hover:scale-[1.02] min-h-[56px] w-full border border-emerald-400/30"
                  >
                    <span className="font-bold text-white text-base">🙏 Say Thank You</span>
                  </button>
                )}
                
                {/* SECONDARY ACTION: Send TOA - Signature Tinted Glass */}
                {onSendTOA && (
                  <button 
                    onClick={onSendTOA}
                    className="group flex items-center justify-center space-x-2 px-3 py-2 bg-gradient-to-r from-amber-400/20 to-yellow-500/20 backdrop-blur-md hover:from-amber-400/30 hover:to-yellow-500/30 rounded-lg transition-all duration-300 min-h-[36px] w-full border border-amber-300/40 hover:border-amber-200/60 shadow-lg hover:shadow-amber-400/25"
                  >
                    <span className="font-normal text-amber-100 group-hover:text-amber-50 text-sm drop-shadow-sm">💝 Send TOA</span>
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
