'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '@/lib/stripe';
import { logger } from '@/lib/logger';
import { auth, db, migrateTechnicianProfile, getTechnicianTransactions, getClientTransactions } from '@/lib/firebase';
import { onAuthStateChanged, signOut, Auth } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit, Firestore, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import Image from 'next/image';
import PayoutModal from '@/components/PayoutModal';
import ConversionWidget from '@/components/ConversionWidget';
import { useTechnicianEarnings } from '@/hooks/useTechnicianEarnings';
import '@/lib/adminUtils';

// Modern Dashboard with Improved UX
// Key improvements:
// 1. Simplified navigation (3 main sections instead of 8+ tabs)
// 2. Hero section with primary actions prominently displayed
// 3. Better visual hierarchy and spacing
// 4. Responsive design with mobile-first approach
// 5. Progressive disclosure - show important info first
// 6. Action-oriented design with clear CTAs

interface UserProfile {
  id: string;
  name: string;
  email: string;
  uniqueId?: string;
  username?: string;
  userType: 'technician' | 'client';
  businessName?: string;
  category?: string;
  title?: string;
  photoURL?: string;
  
  // TOA Business Model - ThankATech Points System
  points?: number;
  toaBalance?: number;
  totalPointsEarned?: number;
  totalPointsSpent?: number;
  
  // Thank You System
  totalThankYous?: number;
  totalThankYousSent?: number;
  
  // TOA Token System
  totalToaReceived?: number;
  totalToaSent?: number;
  totalToaValue?: number;
  
  // Conversion System
  dailyConversions?: number;
  lastConversionDate?: string;
  totalConversions?: number;
  
  // Profile data
  location?: string;
  bio?: string;
  website?: string;
  phone?: string;
  availabilityStatus?: 'available' | 'busy' | 'offline';
  hourlyRate?: number;
  completedJobs?: number;
  responseTime?: number;
  specialties?: string[];
  certifications?: string[];
  experience?: number;
  profileViews?: number;
  favoriteTechnicians?: string[];
  
  // Legacy fields
  totalTips?: number;
  totalTipAmount?: number;
}

interface Transaction {
  id: string;
  amount: number;
  clientId?: string;
  clientName?: string;
  technicianId?: string;
  technicianName?: string;
  date: string;
  timestamp?: any;
  status: 'completed' | 'pending' | 'cancelled';
  type?: 'tip' | 'toa' | 'thankyou';
  message?: string;
  dollarValue?: number;
  technicianPayout?: number;
  platformFee?: number;
  pointsAwarded?: number;
  conversionId?: string;
  originalCurrency?: string;
  exchangeRate?: number;
  fees?: number;
  taxes?: number;
}

export default function ModernDashboard() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Simplified navigation - only 3 main views
  const [activeView, setActiveView] = useState<'overview' | 'activity' | 'settings'>('overview');
  
  // Modal states
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showConversionWidget, setShowConversionWidget] = useState(false);
  
  const { earnings, loading: earningsLoading } = useTechnicianEarnings(user?.uid);

  // Auth state management
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await loadUserProfile(currentUser.uid);
        await loadTransactions(currentUser.uid);
      } else {
        setUser(null);
        setUserProfile(null);
        setTransactions([]);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        setUserProfile({ ...userData, id: userId });
      }
    } catch (error) {
      logger.error('Error loading user profile:', error);
      setError('Failed to load profile');
    }
  };

  const loadTransactions = async (userId: string) => {
    try {
      if (!userProfile) return;
      
      let transactionData: Transaction[] = [];
      
      if (userProfile.userType === 'technician') {
        transactionData = await getTechnicianTransactions(userId, userProfile.email, userProfile.uniqueId);
      } else {
        transactionData = await getClientTransactions(userId, userProfile.email);
      }
      
      setTransactions(transactionData);
    } catch (error) {
      logger.error('Error loading transactions:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      logger.error('Sign out error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/50 to-slate-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white text-center">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/50 to-slate-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-slate-300 mb-6">Please log in to access your dashboard.</p>
          <Link
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  // Modern Header Component
  const DashboardHeader = () => (
    <div className="bg-gradient-to-r from-blue-900/80 to-slate-800/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Welcome */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <span className="text-white font-semibold hidden sm:block">ThankATech</span>
            </Link>
            <div className="hidden sm:block text-slate-300 text-sm">
              Welcome back, {userProfile.name?.split(' ')[0] || 'User'}!
            </div>
          </div>

          {/* User Section */}
          <div className="flex items-center gap-4">
            {/* Points Badge */}
            {userProfile.points && userProfile.points > 0 && (
              <div className="bg-green-500/20 border border-green-500/30 rounded-full px-3 py-1 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-300 text-sm font-medium">{userProfile.points} Points</span>
              </div>
            )}

            {/* Profile Menu */}
            <div className="flex items-center gap-3">
              {userProfile.photoURL ? (
                <Image 
                  src={userProfile.photoURL}
                  alt={userProfile.name}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full border border-white/20"
                />
              ) : (
                <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {userProfile.name?.charAt(0) || 'U'}
                  </span>
                </div>
              )}
              
              <button
                onClick={handleSignOut}
                className="text-slate-300 hover:text-white text-sm transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Simplified Navigation (only 3 main sections)
  const NavigationTabs = () => (
    <div className="bg-white/5 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Dashboard', icon: '🏠' },
            { id: 'activity', label: 'Activity', icon: '📊' },
            { id: 'settings', label: 'Settings', icon: '⚙️' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              className={`flex items-center gap-2 py-4 px-2 border-b-2 transition-colors ${
                activeView === tab.id
                  ? 'border-blue-400 text-blue-300'
                  : 'border-transparent text-slate-400 hover:text-white hover:border-slate-500'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );

  // Hero Section with Primary Actions
  const HeroSection = () => (
    <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 backdrop-blur-xl rounded-2xl p-8 mb-8 border border-white/10">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white mb-2">
            {userProfile.userType === 'client' 
              ? 'Ready to Show Appreciation?' 
              : 'Your Technician Dashboard'
            }
          </h1>
          <p className="text-slate-300 text-lg mb-4">
            {userProfile.userType === 'client' 
              ? 'Send TOA tokens to your favorite technicians and earn ThankATech Points!'
              : 'Track your earnings, manage your profile, and grow your business'
            }
          </p>
          
          {/* Primary CTAs */}
          <div className="flex flex-col sm:flex-row gap-3">
            {userProfile.userType === 'client' ? (
              <>
                <Link
                  href="/"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 text-center"
                >
                  Find Technicians
                </Link>
                {userProfile.points && userProfile.points >= 5 && (
                  <button
                    onClick={() => setShowConversionWidget(!showConversionWidget)}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                  >
                    Convert {userProfile.points} Points to TOA
                  </button>
                )}
              </>
            ) : (
              <>
                <Link
                  href={`/${userProfile.username || userProfile.uniqueId}`}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 text-center"
                >
                  View Public Profile
                </Link>
                {earnings && earnings.availableBalance > 0 && (
                  <button
                    onClick={() => setShowPayoutModal(true)}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                  >
                    Request Payout
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="flex-shrink-0">
          <div className="grid grid-cols-2 gap-4">
            {userProfile.userType === 'client' ? (
              <>
                <QuickStatCard
                  title="TOA Sent"
                  value={userProfile.totalToaSent || 0}
                  color="blue"
                />
                <QuickStatCard
                  title="Points"
                  value={userProfile.points || 0}
                  color="green"
                />
              </>
            ) : (
              <>
                <QuickStatCard
                  title="TOA Received"
                  value={userProfile.totalToaReceived || 0}
                  color="purple"
                />
                <QuickStatCard
                  title="Thank Yous"
                  value={userProfile.totalThankYous || 0}
                  color="red"
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Conversion Widget */}
      {showConversionWidget && userProfile.points && userProfile.points >= 5 && (
        <div className="mt-6 p-6 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Convert Points to TOA</h3>
            <button
              onClick={() => setShowConversionWidget(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          <ConversionWidget userId={userProfile.id} />
        </div>
      )}
    </div>
  );

  // Quick Stat Card Component
  const QuickStatCard = ({ title, value, color }: {
    title: string;
    value: string | number;
    color: 'blue' | 'green' | 'purple' | 'red';
  }) => {
    const colorClasses = {
      blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-300',
      green: 'from-green-500/20 to-green-600/10 border-green-500/30 text-green-300',
      purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-300',
      red: 'from-red-500/20 to-red-600/10 border-red-500/30 text-red-300',
    };

    return (
      <div className={`bg-gradient-to-br ${colorClasses[color]} backdrop-blur-lg rounded-xl p-4 border text-center`}>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-sm font-medium">{title}</div>
      </div>
    );
  };

  // Main Stats Grid with Better Layout
  const StatsGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {userProfile.userType === 'client' ? (
        <>
          <StatCard
            title="Total Spent"
            value={userProfile.totalToaValue ? formatCurrency(userProfile.totalToaValue * 100) : '$0'}
            icon="💰"
            color="blue"
            subtitle="On TOA tokens"
          />
          <StatCard
            title="ThankATech Points"
            value={userProfile.points || 0}
            icon="⭐"
            color="green"
            subtitle={`${Math.floor((userProfile.points || 0) / 5)} TOA available`}
            onClick={() => userProfile.points && userProfile.points >= 5 && setShowConversionWidget(true)}
            clickable={!!(userProfile.points && userProfile.points >= 5)}
          />
          <StatCard
            title="Thank Yous Sent"
            value={userProfile.totalThankYousSent || 0}
            icon="❤️"
            color="red"
            subtitle="Appreciation sent"
          />
          <StatCard
            title="Favorites"
            value={userProfile.favoriteTechnicians?.length || 0}
            icon="🌟"
            color="yellow"
            subtitle="Saved technicians"
            onClick={() => setActiveView('activity')}
            clickable
          />
        </>
      ) : (
        <>
          <StatCard
            title="Total Earnings"
            value={earnings ? formatCurrency(earnings.totalEarnings * 100) : '$0'}
            icon="💰"
            color="green"
            subtitle="All time"
          />
          <StatCard
            title="Available Payout"
            value={earnings ? formatCurrency(earnings.availableBalance * 100) : '$0'}
            icon="🏦"
            color="blue"
            subtitle="Ready to withdraw"
            onClick={() => earnings && earnings.availableBalance > 0 && setShowPayoutModal(true)}
            clickable={!!(earnings && earnings.availableBalance > 0)}
          />
          <StatCard
            title="Thank Yous"
            value={userProfile.totalThankYous || 0}
            icon="❤️"
            color="red"
            subtitle="Received"
          />
          <StatCard
            title="Profile Views"
            value={userProfile.profileViews || 0}
            icon="👁️"
            color="purple"
            subtitle="This month"
          />
        </>
      )}
    </div>
  );

  // Enhanced Stat Card Component
  const StatCard = ({ title, value, icon, color, subtitle, clickable, onClick }: {
    title: string;
    value: string | number;
    icon: string;
    color: string;
    subtitle: string;
    clickable?: boolean;
    onClick?: () => void;
  }) => {
    const colorClasses = {
      blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-300',
      green: 'from-green-500/20 to-green-600/10 border-green-500/30 text-green-300',
      yellow: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 text-yellow-300',
      red: 'from-red-500/20 to-red-600/10 border-red-500/30 text-red-300',
      purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-300',
    };

    return (
      <div
        className={`bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} backdrop-blur-lg rounded-xl p-6 border transition-all duration-200 ${
          clickable ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : ''
        }`}
        onClick={clickable ? onClick : undefined}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl">{icon}</span>
          {clickable && <span className="text-xs opacity-50">Click to view</span>}
        </div>
        <div className="text-2xl font-bold text-white mb-1">{value}</div>
        <h3 className="font-semibold text-white/90 mb-1">{title}</h3>
        <p className="text-sm opacity-75">{subtitle}</p>
      </div>
    );
  };

  // Recent Activity Section
  const RecentActivity = () => (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
          <button
            onClick={() => setActiveView('activity')}
            className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
          >
            View All →
          </button>
        </div>
      </div>

      <div className="divide-y divide-white/10">
        {transactions.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-slate-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📝</span>
            </div>
            <p className="text-slate-300 mb-2">No activity yet</p>
            <p className="text-slate-400 text-sm">Your recent TOA transactions will appear here</p>
          </div>
        ) : (
          transactions.slice(0, 5).map((transaction) => (
            <div key={transaction.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  transaction.type === 'toa' ? 'bg-blue-500/20' : 'bg-red-500/20'
                }`}>
                  <span className={transaction.type === 'toa' ? 'text-blue-400' : 'text-red-400'}>
                    {transaction.type === 'toa' ? '💰' : '❤️'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-white">
                    {userProfile.userType === 'client' 
                      ? `${transaction.type === 'toa' ? 'TOA to' : 'Thank you to'} ${transaction.technicianName}`
                      : `${transaction.type === 'toa' ? 'TOA from' : 'Thank you from'} ${transaction.clientName || 'Client'}`
                    }
                  </p>
                  <p className="text-sm text-slate-400">{transaction.date}</p>
                </div>
              </div>
              
              <div className="text-right">
                {transaction.type === 'toa' && (
                  <p className={`font-bold ${userProfile.userType === 'client' ? 'text-red-400' : 'text-green-400'}`}>
                    {userProfile.userType === 'client' ? '-' : '+'}
                    {formatCurrency(transaction.amount * 100)}
                  </p>
                )}
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  transaction.status === 'completed' 
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {transaction.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Render different views based on activeView
  const renderView = () => {
    switch (activeView) {
      case 'overview':
        return (
          <div className="space-y-6">
            <HeroSection />
            <StatsGrid />
            <RecentActivity />
          </div>
        );
      
      case 'activity':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Activity History</h2>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm">Filter:</span>
                <select className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white text-sm">
                  <option value="all">All Activity</option>
                  <option value="toa">TOA Tokens</option>
                  <option value="thankyou">Thank Yous</option>
                </select>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
              <div className="divide-y divide-white/10">
                {transactions.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-20 h-20 bg-slate-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <span className="text-4xl">📊</span>
                    </div>
                    <p className="text-slate-300 text-lg mb-2">No activity yet</p>
                    <p className="text-slate-400">Your transactions and interactions will appear here</p>
                  </div>
                ) : (
                  transactions.map((transaction) => (
                    <div key={transaction.id} className="p-6 hover:bg-white/5 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            transaction.type === 'toa' ? 'bg-blue-500/20' : 'bg-red-500/20'
                          }`}>
                            <span className={`text-xl ${transaction.type === 'toa' ? 'text-blue-400' : 'text-red-400'}`}>
                              {transaction.type === 'toa' ? '💰' : '❤️'}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-white">
                              {userProfile.userType === 'client' 
                                ? `${transaction.type === 'toa' ? 'TOA to' : 'Thank you to'} ${transaction.technicianName}`
                                : `${transaction.type === 'toa' ? 'TOA from' : 'Thank you from'} ${transaction.clientName || 'Client'}`
                              }
                            </p>
                            <p className="text-slate-400">{transaction.date}</p>
                            {transaction.message && (
                              <p className="text-sm text-slate-300 mt-1 italic">"{transaction.message}"</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          {transaction.type === 'toa' && (
                            <p className={`text-lg font-bold ${userProfile.userType === 'client' ? 'text-red-400' : 'text-green-400'}`}>
                              {userProfile.userType === 'client' ? '-' : '+'}
                              {formatCurrency(transaction.amount * 100)}
                            </p>
                          )}
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            transaction.status === 'completed' 
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {transaction.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      
      case 'settings':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Profile Settings</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profile Information */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Profile Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                    <input
                      type="text"
                      value={userProfile.name}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={userProfile.email}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">User Type</label>
                    <input
                      type="text"
                      value={userProfile.userType}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white capitalize"
                      readOnly
                    />
                  </div>
                </div>
              </div>

              {/* Account Actions */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Account Actions</h3>
                <div className="space-y-3">
                  <Link
                    href={`/${userProfile.username || userProfile.uniqueId}`}
                    className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-center"
                  >
                    View Public Profile
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/50 to-slate-900">
      <DashboardHeader />
      <NavigationTabs />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderView()}
      </main>

      {/* Modals */}
      {showPayoutModal && earnings && (
        <PayoutModal
          isOpen={showPayoutModal}
          onClose={() => setShowPayoutModal(false)}
          availableBalance={earnings.availableBalance}
          technicianId={userProfile.id}
          onPayoutSuccess={() => {
            setShowPayoutModal(false);
          }}
        />
      )}
    </div>
  );
}