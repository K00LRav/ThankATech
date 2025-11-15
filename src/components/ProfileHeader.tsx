"use client";

import Image from 'next/image';

interface ProfileHeaderProps {
  technician: {
    name: string;
    businessName: string;
    category: string;
    title?: string;
    image?: string;
    points?: number;
    totalThankYous?: number;
    totalTips?: number;
    experience?: string;
    serviceArea?: string;
    hourlyRate?: string;
  };
}

export function ProfileHeader({ technician }: ProfileHeaderProps) {
  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
      {/* Profile Header with Enhanced Glassmorphism */}
      <div className="relative bg-gradient-to-r from-blue-600/60 via-cyan-600/60 to-blue-800/60 backdrop-blur-xl p-6 sm:p-8">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/20 rounded-full blur-xl"></div>
        
        <div className="relative flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
          {/* Enhanced Profile Image */}
          <div className="relative group">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-white/40 bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-sm shadow-2xl group-hover:scale-105 transition-transform duration-300">
              {technician.image ? (
                <Image
                  src={technician.image}
                  alt={technician.name}
                  width={160}
                  height={160}
                  className="w-full h-full object-cover"
                  unoptimized={technician.image.startsWith('http')}
                  key={technician.image}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/30 to-purple-500/30">
                  <svg className="w-20 h-20 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
            {/* Available Status Indicator */}
            <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full border-3 border-white shadow-lg flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          </div>

          {/* Enhanced Profile Info */}
          <div className="text-center sm:text-left flex-1 space-y-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent drop-shadow-lg">
                {technician.name}
              </h1>
              <p className="text-xl sm:text-2xl text-blue-200 font-medium mb-3">{technician.businessName}</p>
              {technician.title && (
                <p className="text-lg text-purple-200 italic">{technician.title}</p>
              )}
            </div>
            
            {/* Enhanced Tags */}
            <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
              <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium border border-white/30 hover:bg-white/30 transition-colors">
                🔧 {technician.category}
              </span>
              {technician.serviceArea && (
                <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium border border-white/30 hover:bg-white/30 transition-colors">
                  📍 {technician.serviceArea}
                </span>
              )}
              {technician.experience && (
                <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium border border-white/30 hover:bg-white/30 transition-colors">
                  ⭐ {technician.experience.replace(/[^\d+]/g, '')} Years of Experience
                </span>
              )}
              {technician.hourlyRate && (
                <span className="px-4 py-2 bg-green-500/30 backdrop-blur-sm rounded-full text-white text-sm font-medium border border-green-400/50 hover:bg-green-500/40 transition-colors">
                  💰 {technician.hourlyRate}
                </span>
              )}
            </div>
          </div>

          {/* Simple Stats Grid - Brand-aligned */}
          <div className="grid grid-cols-2 sm:grid-cols-1 gap-4 sm:gap-6">
            {/* Thank You Count - PRIMARY STAT */}
            <div className="bg-gradient-to-br from-blue-500/30 to-cyan-500/30 backdrop-blur-sm rounded-2xl p-4 text-center border border-blue-400/50 hover:from-blue-500/40 hover:to-cyan-500/40 transition-all duration-300 shadow-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-2xl">🙏</span>
                <div className="text-2xl font-bold text-white">
                  {technician.totalThankYous || 0}
                </div>
              </div>
              <div className="text-xs text-blue-200 font-medium">Thank Yous</div>
              <div className="text-xs text-blue-300/80 mt-1">Community appreciation</div>
            </div>

            {/* ThankATech Points */}
            <div className="bg-gradient-to-br from-green-500/30 to-emerald-500/30 backdrop-blur-sm rounded-2xl p-4 text-center border border-green-400/50 hover:from-green-500/40 hover:to-emerald-500/40 transition-all duration-300 shadow-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">⚡</span>
                </div>
                <div className="text-2xl font-bold text-white">{technician.points || 0}</div>
              </div>
              <div className="text-xs text-green-200 font-medium">ThankATech Points</div>
              <div className="text-xs text-green-300/80 mt-1">Community reputation</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Status Bar */}
      <div className="bg-white/5 backdrop-blur-sm border-y border-white/10 px-6 sm:px-8 py-4">
        <div className="flex flex-wrap justify-center gap-6 sm:gap-8 text-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-slate-300 text-sm">Available for hire</span>
          </div>
          {(technician.totalThankYous && technician.totalThankYous > 0) && (
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 text-lg">🙏</span>
              <span className="text-slate-300 text-sm">Appreciated technician</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-slate-300 text-sm">Verified professional</span>
          </div>
        </div>
      </div>
    </div>
  );
}
