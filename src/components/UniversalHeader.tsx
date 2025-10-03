'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface UniversalHeaderProps {
  currentUser?: {
    id?: string;
    name?: string;
    email?: string;
    photoURL?: string;
    userType?: 'technician' | 'client' | 'admin';
    points?: number;
  };
  onSignOut?: () => void;
  showNav?: boolean;
  customTitle?: string;
  customSubtitle?: string;
}

const UniversalHeader: React.FC<UniversalHeaderProps> = ({
  currentUser,
  onSignOut,
  showNav = true,
  customTitle,
  customSubtitle
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <>
      {/* Header - Universal Glassmorphism Design */}
      <header className="relative bg-white/10 backdrop-blur-xl border-b border-white/20 shadow-lg">
        <div className="max-w-md mx-auto px-3 py-3 sm:max-w-7xl sm:px-4 lg:px-8 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Logo - Always Visible */}
            <Link href="/" className="flex items-center gap-2 sm:gap-3 group cursor-pointer" prefetch={false}>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-base sm:text-xl font-bold">🔧</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent group-hover:text-blue-400 transition-colors">
                  {customTitle || 'ThankATech'}
                </span>
                {customSubtitle && (
                  <span className="text-xs text-slate-300 hidden sm:block">{customSubtitle}</span>
                )}
              </div>
            </Link>

            {/* Desktop Navigation */}
            {showNav && (
              <div className="hidden sm:flex gap-3 sm:gap-4 items-center">
                {currentUser ? (
                  <>
                    {/* Dashboard Link - Icon on mobile, text on desktop */}
                    <Link
                      href="/dashboard"
                      className="px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm sm:text-base"
                    >
                      <span className="hidden sm:inline">Dashboard</span>
                      <span className="sm:hidden">📊</span>
                    </Link>

                    {/* Admin Link (if admin) */}
                    {currentUser.userType === 'admin' && (
                      <Link
                        href="/admin"
                        className="px-3 py-2 bg-red-500/20 text-red-200 rounded-lg font-medium hover:bg-red-500/30 transition-colors text-sm"
                      >
                        <span className="hidden sm:inline">Admin</span>
                        <span className="sm:hidden">🛡️</span>
                      </Link>
                    )}
                    
                    {/* Profile Photo - Display Only */}
                    {currentUser?.photoURL ? (
                      <Image 
                        src={currentUser.photoURL} 
                        alt="Profile" 
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full border-2 border-white/20"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-slate-600/50 rounded-full flex items-center justify-center border-2 border-white/20">
                        <span className="text-white text-sm font-medium">
                          {currentUser.name?.charAt(0) || 'U'}
                        </span>
                      </div>
                    )}

                    {/* Points Badge */}
                    {currentUser?.points && currentUser.points > 0 && (
                      <div className="flex items-center px-2 py-1 bg-blue-500/20 rounded-lg text-xs">
                        <span className="text-blue-300">⚡{currentUser.points}</span>
                      </div>
                    )}
                    
                    {/* Logout */}
                    <button
                      onClick={onSignOut}
                      className="px-3 py-2 bg-red-500/20 text-red-200 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <button className="text-gray-300 hover:text-blue-400 transition-colors font-medium text-sm sm:text-base px-3 py-2">
                      Sign In
                    </button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm sm:text-base">
                      Join
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Mobile Hamburger Button */}
            {showNav && (
              <button
                onClick={toggleMobileMenu}
                className="sm:hidden p-2 text-white hover:text-blue-400 transition-colors"
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {showNav && isMobileMenuOpen && (
          <div className="sm:hidden bg-white/10 backdrop-blur-xl border-t border-white/20">
            <div className="max-w-md mx-auto px-3 py-4 space-y-3">
              {currentUser ? (
                <>
                  {/* User Info */}
                  <div className="flex items-center gap-3 pb-3 border-b border-white/20">
                    {currentUser?.photoURL ? (
                      <Image 
                        src={currentUser.photoURL} 
                        alt="Profile" 
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full border-2 border-white/20"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-slate-600/50 rounded-full flex items-center justify-center border-2 border-white/20">
                        <span className="text-white font-medium">
                          {currentUser.name?.charAt(0) || 'U'}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-white font-medium">Welcome, {currentUser.name?.split(' ')[0] || 'User'}!</p>
                      {currentUser?.points && currentUser.points > 0 && (
                        <p className="text-blue-300 text-sm">⚡ {currentUser.points} Points</p>
                      )}
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <Link
                    href="/dashboard"
                    className="block w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium text-center hover:bg-blue-700 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    📊 Dashboard
                  </Link>

                  {currentUser.userType === 'admin' && (
                    <Link
                      href="/admin"
                      className="block w-full px-4 py-3 bg-red-500/20 text-red-200 rounded-lg font-medium text-center hover:bg-red-500/30 transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      🛡️ Admin Panel
                    </Link>
                  )}

                  <button
                    onClick={() => {
                      onSignOut?.();
                      setIsMobileMenuOpen(false);
                    }}
                    className="block w-full px-4 py-3 bg-red-500/20 text-red-200 rounded-lg font-medium text-center hover:bg-red-500/30 transition-colors"
                  >
                    🚪 Logout
                  </button>
                </>
              ) : (
                <>
                  <button className="block w-full px-4 py-3 bg-white/10 text-white rounded-lg font-medium text-center hover:bg-white/20 transition-colors">
                    Sign In
                  </button>
                  <button className="block w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium text-center hover:bg-blue-700 transition-colors">
                    Join ThankATech
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
};

export default UniversalHeader;