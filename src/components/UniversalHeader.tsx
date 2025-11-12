'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Avatar from './Avatar';

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
  onSignIn?: () => void;
  onRegister?: () => void;
  showNav?: boolean;
  customTitle?: string;
  customSubtitle?: string;
  currentPath?: string;
}

const UniversalHeader: React.FC<UniversalHeaderProps> = ({
  currentUser,
  onSignOut,
  onSignIn,
  onRegister,
  showNav = true,
  customTitle,
  customSubtitle,
  currentPath
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <>
      {/* Header - Universal Glassmorphism Design */}
      <header className="relative max-w-md mx-auto px-3 sm:max-w-7xl sm:px-4 lg:px-8 mt-4 sm:mt-8 mb-4 sm:mb-8">
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl shadow-lg">
          <div className="px-3 py-3 sm:px-4 sm:py-4">
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
                    {/* Dashboard Link - Only show for non-admin users, or if admin and on admin page (to go back) */}
                    {currentUser.userType !== 'admin' && (
                      <Link
                        href="/dashboard"
                        className="px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm sm:text-base"
                      >
                        <span className="hidden sm:inline">Dashboard</span>
                        <span className="sm:hidden">📊</span>
                      </Link>
                    )}

                    {/* Admin Panel Link (if admin) */}
                    {currentUser.userType === 'admin' && (
                      <Link
                        href="/admin"
                        className={`px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-amber-500/20 to-yellow-600/20 backdrop-blur-md text-amber-200 rounded-lg font-medium hover:from-amber-500/30 hover:to-yellow-600/30 transition-all duration-200 text-sm sm:text-base border border-amber-400/30 ${
                          currentPath === '/admin' ? 'ring-2 ring-amber-400/50' : ''
                        }`}
                      >
                        <span className="hidden sm:inline">Admin Panel</span>
                        <span className="sm:hidden">🛡️</span>
                      </Link>
                    )}
                    
                    {/* Profile Photo - Display Only */}
                    <Avatar
                      name={currentUser.name}
                      photoURL={currentUser.photoURL}
                      size={32}
                      className="border-2 border-white/20"
                      textSize="text-sm"
                    />

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
                    <button 
                      onClick={onSignIn}
                      className="text-gray-300 hover:text-blue-400 transition-colors font-medium text-sm sm:text-base px-3 py-2"
                    >
                      Sign In
                    </button>
                    <button 
                      onClick={onRegister}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm sm:text-base"
                    >
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
              <div className="px-3 py-4 space-y-3">
              {currentUser ? (
                <>
                  {/* User Info */}
                  <div className="flex items-center gap-3 pb-3 border-b border-white/20">
                    <Avatar
                      name={currentUser.name}
                      photoURL={currentUser.photoURL}
                      size={40}
                      className="border-2 border-white/20"
                      textSize="text-base"
                    />
                    <div>
                      <p className="text-white font-medium">Welcome, {currentUser.name?.split(' ')[0] || 'User'}!</p>
                      {currentUser?.points && currentUser.points > 0 && (
                        <p className="text-blue-300 text-sm">⚡ {currentUser.points} Points</p>
                      )}
                    </div>
                  </div>

                  {/* Navigation Links */}
                  {currentUser.userType !== 'admin' && (
                    <Link
                      href="/dashboard"
                      className="block w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium text-center hover:bg-blue-700 transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      📊 Dashboard
                    </Link>
                  )}

                  {currentUser.userType === 'admin' && (
                    <Link
                      href="/admin"
                      className={`block w-full px-4 py-3 bg-gradient-to-r from-amber-500/20 to-yellow-600/20 backdrop-blur-md text-amber-200 rounded-lg font-medium text-center hover:from-amber-500/30 hover:to-yellow-600/30 transition-all duration-200 border border-amber-400/30 ${
                        currentPath === '/admin' ? 'ring-2 ring-amber-400/50' : ''
                      }`}
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
                  <button 
                    onClick={() => {
                      onSignIn?.();
                      setIsMobileMenuOpen(false);
                    }}
                    className="block w-full px-4 py-3 bg-white/10 text-white rounded-lg font-medium text-center hover:bg-white/20 transition-colors"
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => {
                      onRegister?.();
                      setIsMobileMenuOpen(false);
                    }}
                    className="block w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium text-center hover:bg-blue-700 transition-colors"
                  >
                    Join ThankATech
                  </button>
                </>
              )}
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
};

export default UniversalHeader;