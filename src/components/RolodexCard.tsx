"use client";

import { useState } from 'react';
import Image from 'next/image';

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
  // Removed expandedCard state - keeping it simple

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
    else if (totalTips >= 10) badges.push({ icon: '🪙', text: 'TOA Earner', color: 'bg-green-100 text-green-800 border-green-300' });

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
        {/* Category Badge - iPhone 12 Pro Max Optimized */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-blue-500/80 to-teal-600/80 backdrop-blur-sm border border-white/30 rounded-full px-2.5 py-1 sm:px-3 sm:py-1.5 shadow-lg">
            <span className="text-sm sm:text-base lg:text-lg">{getCategoryIcon(technician.category, technician.title || '')}</span>
            <span className="text-white text-xs sm:text-sm font-medium">
              {formatCategory(technician.category)}
            </span>
          </div>
        </div>
        
        {/* Card Content */}
        <div className="relative p-6 sm:p-8 h-full min-h-[20rem] sm:min-h-[24rem]">
          <div className="flex flex-col h-full">
            {/* Header Section */}
            <div className="flex items-start space-x-4 mb-4">
              {/* Profile Image */}
              <div className="relative">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-lg ring-4 ring-white/50">
                  <Image
                    src={technician.photoURL || technician.image || '/default-avatar.png'}
                    alt={technician.name}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
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
                <h2 className="text-xl sm:text-2xl font-bold text-white">{technician.name}</h2>
                <p className="text-base sm:text-lg text-blue-200 font-semibold mt-1">{technician.businessName || technician.title}</p>
                
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
                
                {/* Achievement badge - optimized positioning */}
                {achievementBadges.length > 0 && (
                  <div className="mt-1.5">
                    <span 
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${achievementBadges[0].color} shadow-sm`}
                      title={`Achievement: ${achievementBadges[0].text}`}
                    >
                      <span className="text-xs">{achievementBadges[0].icon}</span>
                      <span className="hidden sm:inline text-xs">{achievementBadges[0].text}</span>
                    </span>
                    {achievementBadges.length > 1 && (
                      <span className="text-xs text-gray-300 ml-1.5">+{achievementBadges.length - 1}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Essential Info Only - Streamlined for customers */}
            <div className="space-y-3">
              {/* Brief About */}
              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-sm">
                <p className="text-sm text-gray-800 leading-relaxed line-clamp-2">
                  {technician.about ? 
                    technician.about.substring(0, 120) + (technician.about.length > 120 ? '...' : '') :
                    `Professional ${formatCategory(technician.category)} with expertise in quality service delivery.`
                  }
                </p>
              </div>

              {/* Key Details - Only most important info */}
              <div className="grid grid-cols-2 gap-2">
                {technician.experience && (
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg p-2 border border-white/20 shadow-sm">
                    <div className="flex items-center space-x-1">
                      <span className="text-blue-600 text-xs">⚡</span>
                      <span className="text-xs text-gray-800 font-medium">
                        {technician.experience.replace(/[^\d]+/, '') + ' yrs'}
                      </span>
                    </div>
                  </div>
                )}
                {technician.certifications && (
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg p-2 border border-white/20 shadow-sm">
                    <div className="flex items-center space-x-1">
                      <span className="text-green-600 text-xs">✓</span>
                      <span className="text-xs text-gray-800 font-medium">Certified</span>
                    </div>
                  </div>
                )}
              </div>

              {/* View Profile Link */}
              <div className="text-center">
                <a 
                  href={technician.username ? `/${technician.username}` : '#'}
                  className="text-xs text-blue-300 hover:text-blue-100 transition-colors duration-200 underline"
                >
                  View Full Profile →
                </a>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="mt-auto pt-2 sm:pt-3 border-t border-gray-200/50">
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full px-4 py-2 shadow-lg border border-emerald-400/20">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">👍</span>
                    <span className="text-sm font-bold">{technician.totalThankYous || 0}</span>
                    <span className="text-sm opacity-90">thanks</span>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-full px-4 py-2 shadow-lg border border-blue-400/20">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">🪙</span>
                    <span className="text-sm font-bold">{technician.totalTips || 0}</span>
                    <span className="text-sm opacity-90">TOA</span>
                  </div>
                </div>
                {technician.certifications && (
                  <div className="bg-blue-100 text-blue-700 rounded-full px-3 py-1.5 shadow-sm">
                    <span className="text-sm font-medium">✓ Certified</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons - Brand-aligned hierarchy */}
            {showActions && (onThankYou || onSendTOA) && (
              <div className="flex flex-col gap-3 w-full max-w-sm mx-auto mt-4">
                {/* PRIMARY ACTION: Say Thank You - Hero button */}
                {onThankYou && (
                  <button 
                    onClick={onThankYou}
                    className="group flex items-center justify-center space-x-2 px-4 py-4 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 backdrop-blur-sm rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-blue-500/30 transform hover:-translate-y-1 hover:scale-[1.02] min-h-[56px] w-full border border-blue-400/30"
                  >
                    <span className="font-bold text-white text-base">🙏 Say Thank You</span>
                  </button>
                )}
                
                {/* SECONDARY ACTION: Send TOA - Subtle option */}
                {onSendTOA && (
                  <button 
                    onClick={onSendTOA}
                    className="group flex items-center justify-center space-x-2 px-3 py-2 bg-transparent hover:bg-white/5 rounded-lg transition-all duration-300 min-h-[36px] w-full border border-white/20 hover:border-white/30"
                  >
                    <span className="font-normal text-white/70 hover:text-white/90 text-sm">💝 Send TOA</span>
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
