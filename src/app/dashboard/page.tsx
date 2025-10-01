'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '@/lib/stripe';
import { logger } from '@/lib/logger';
import { auth, db, migrateTechnicianProfile, getTechnicianTransactions, getClientTransactions, authHelpers, getTechnician, getClient } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
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
  hourlyRate?: number | string; // Can be number or string like "$75-$110"
  completedJobs?: number;
  responseTime?: number;
  specialties?: string[] | string;
  certifications?: string[] | string;
  experience?: number | string; // Can be number or string like "15 years"
  profileViews?: number;
  favoriteTechnicians?: string[];
  
  // Additional technician-specific fields
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  serviceArea?: string;
  availability?: string;
  about?: string;
  
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
  
  // Profile editing states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  
  const { earnings, loading: earningsLoading } = useTechnicianEarnings(user?.uid);

  // Auth state management - using same system as main page
  useEffect(() => {
    const unsubscribe = authHelpers.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, get their complete profile data
        try {
          // Try to get user data from either technicians or users collection
          let userData: any = await getTechnician(firebaseUser.uid);
          if (!userData) {
            userData = await getClient(firebaseUser.uid);
          }

          if (userData) {
            const completeUser = {
              id: userData.id,
              uid: firebaseUser.uid,
              name: userData.name || userData.displayName || firebaseUser.displayName,
              email: userData.email || firebaseUser.email,
              displayName: userData.displayName || firebaseUser.displayName,
              photoURL: userData.photoURL || firebaseUser.photoURL,
              userType: userData.userType || 'client'
            };
            
            setUser(completeUser);
            await loadUserProfile(firebaseUser.uid, completeUser);
          } else {
            // Firebase user exists but no profile data, create basic user object
            const basicUser = {
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              userType: 'client'
            };
            
            setUser(basicUser);
            await loadUserProfile(firebaseUser.uid, basicUser);
          }
        } catch (error) {
          logger.error('Error loading user data:', error);
          setError('Failed to load user data');
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setTransactions([]);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string, existingUserData?: any) => {
    try {
      // If we already have user data from auth, use it as base
      if (existingUserData) {
        const profileData = { 
          ...existingUserData, 
          id: userId,
          userType: existingUserData.userType || 'client'
        };
        setUserProfile(profileData);
        
        // Load transactions after profile is loaded
        await loadTransactions(userId, profileData);
        return;
      }

      // Fallback to loading from Firestore (legacy logic)
      let userData: UserProfile | null = null;
      
      // First, try to get user from users collection
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        userData = userDoc.data() as UserProfile;
      }
      
      // If no userType is set, try to determine from technicians collection
      if (userData && !userData.userType) {
        const techDoc = await getDoc(doc(db, 'technicians', userId));
        if (techDoc.exists()) {
          // User exists in technicians collection, set as technician
          userData.userType = 'technician';
          // Update the users collection with correct userType
          await updateDoc(doc(db, 'users', userId), { userType: 'technician' });
          logger.info('Updated user type to technician for:', userId);
        } else {
          // Default to client if not found in technicians
          userData.userType = 'client';
          await updateDoc(doc(db, 'users', userId), { userType: 'client' });
          logger.info('Updated user type to client for:', userId);
        }
      }
      
      if (userData) {
        const profileData = { ...userData, id: userId };
        setUserProfile(profileData);
        
        // Load transactions after profile is loaded
        await loadTransactions(userId, profileData);
      } else {
        // Try migrating technician profile if user doesn't exist in users collection
        const migratedProfile = await migrateTechnicianProfile(userId);
        if (migratedProfile) {
          const profileData = { ...migratedProfile, id: userId, userType: 'technician' as const };
          setUserProfile(profileData);
          await loadTransactions(userId, profileData);
        }
      }
    } catch (error) {
      logger.error('Error loading user profile:', error);
      setError('Failed to load profile');
    }
  };

  const loadTransactions = async (userId: string, profile?: UserProfile) => {
    try {
      const currentProfile = profile || userProfile;
      if (!currentProfile) return;
      
      let transactionData: Transaction[] = [];
      
      if (currentProfile.userType === 'technician') {
        transactionData = await getTechnicianTransactions(userId, currentProfile.email, currentProfile.uniqueId);
      } else {
        transactionData = await getClientTransactions(userId, currentProfile.email);
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

  // Profile editing functions
  const handleEditProfile = () => {
    setEditedProfile({
      name: userProfile?.name || '',
      businessName: userProfile?.businessName || '',
      category: userProfile?.category || '',
      bio: userProfile?.bio || '',
      location: userProfile?.location || '',
      phone: userProfile?.phone || '',
      website: userProfile?.website || '',
    });
    setIsEditingProfile(true);
    setSaveMessage(null);
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setEditedProfile({});
    setSaveMessage(null);
  };

  const handleSaveProfile = async () => {
    if (!userProfile) return;
    
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      const updatedData = {
        ...editedProfile,
        updatedAt: new Date().toISOString()
      };
      
      // Update users collection
      await updateDoc(doc(db, 'users', userProfile.id), updatedData);
      
      // If user is a technician, also update technicians collection
      if (userProfile.userType === 'technician') {
        try {
          await updateDoc(doc(db, 'technicians', userProfile.id), updatedData);
          logger.info('Updated technician profile in technicians collection');
        } catch (techError) {
          // If technician document doesn't exist, this is okay
          // The user might not have been migrated to technicians collection yet
          logger.warn('Could not update technicians collection:', techError);
        }
      }
      
      // Update local state
      setUserProfile({ ...userProfile, ...editedProfile });
      setIsEditingProfile(false);
      setSaveMessage('Profile updated successfully!');
      
      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      logger.error('Error saving profile:', error);
      setSaveMessage('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setEditedProfile(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white text-center">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
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

  // Modern Header Component - matches main page design
  const DashboardHeader = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="flex justify-between items-center p-6 bg-black/20 backdrop-blur-sm border-b border-white/10 rounded-2xl mb-8">
        <Link href="/" className="flex items-center gap-3 group cursor-pointer">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="text-xl font-bold">🔧</span>
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent group-hover:text-blue-400 transition-colors">
            ThankATech
          </span>
        </Link>

        <div className="flex gap-4 items-center">
          {/* Points Badge */}
          {userProfile.points && userProfile.points > 0 && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-full px-3 py-1 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-300 text-sm font-medium">{userProfile.points} Points</span>
            </div>
          )}

          {/* User Profile Section */}
          <div className="flex items-center space-x-3">
            {userProfile.photoURL ? (
              <Image 
                src={userProfile.photoURL}
                alt={userProfile.name}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full border-2 border-white/20"
              />
            ) : (
              <div className="w-8 h-8 bg-slate-600/50 rounded-full flex items-center justify-center border-2 border-white/20">
                <span className="text-white text-sm font-medium">
                  {userProfile.name?.charAt(0) || 'U'}
                </span>
              </div>
            )}
            <span className="text-gray-300">Welcome, {userProfile.name?.split(' ')[0] || 'User'}!</span>
            <button
              onClick={handleSignOut}
              className="px-3 py-1 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg text-sm hover:bg-red-500/30 transition-all duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
    </div>
  );

  // Simplified Navigation (only 3 main sections) - matches main page styling
  const NavigationTabs = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <nav className="flex space-x-8 bg-black/10 backdrop-blur-sm rounded-2xl p-4 mb-6">
        {[
          { id: 'overview', label: 'Dashboard', icon: '🏠' },
          { id: 'activity', label: 'Activity', icon: '📊' },
          { id: 'settings', label: 'Settings', icon: '⚙️' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id as any)}
            className={`flex items-center gap-2 py-3 px-4 rounded-xl transition-all duration-200 ${
              activeView === tab.id
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>{tab.icon}</span>
            <span className="font-medium">{tab.label}</span>
          </button>
        ))}
      </nav>
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
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Profile Settings</h2>
              {!isEditingProfile ? (
                <button
                  onClick={handleEditProfile}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                >
                  ✏️ {userProfile.userType === 'technician' ? 'Edit Business Profile' : 'Edit Profile'}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                  >
                    {isSaving ? '💾 Saving...' : '💾 Save Changes'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Save Message */}
            {saveMessage && (
              <div className={`p-4 rounded-lg border ${
                saveMessage.includes('successfully') 
                  ? 'bg-green-500/20 border-green-500/30 text-green-300'
                  : 'bg-red-500/20 border-red-500/30 text-red-300'
              }`}>
                {saveMessage}
              </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profile Information */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-semibold text-white">Profile Information</h3>
                  {userProfile.userType === 'technician' && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs font-medium rounded-full border border-blue-500/30">
                      Enhanced
                    </span>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={editedProfile.name || ''}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                        placeholder="Enter your name"
                      />
                    ) : (
                      <input
                        type="text"
                        value={userProfile.name}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                        readOnly
                      />
                    )}
                  </div>
                  
                  {userProfile.userType === 'technician' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Business Name</label>
                      {isEditingProfile ? (
                        <input
                          type="text"
                          value={editedProfile.businessName || ''}
                          onChange={(e) => handleInputChange('businessName', e.target.value)}
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                          placeholder="Enter your business name"
                        />
                      ) : (
                        <input
                          type="text"
                          value={userProfile.businessName || 'Not set'}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                          readOnly
                        />
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Bio</label>
                    {isEditingProfile ? (
                      <textarea
                        value={editedProfile.bio || ''}
                        onChange={(e) => handleInputChange('bio', e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                        placeholder="Tell people about yourself..."
                        rows={3}
                      />
                    ) : (
                      <textarea
                        value={userProfile.bio || 'No bio set'}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                        readOnly
                        rows={3}
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Location</label>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={editedProfile.location || ''}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                        placeholder="City, State"
                      />
                    ) : (
                      <input
                        type="text"
                        value={userProfile.location || 'Not set'}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                        readOnly
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Phone</label>
                    {isEditingProfile ? (
                      <input
                        type="tel"
                        value={editedProfile.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                        placeholder="(555) 123-4567"
                      />
                    ) : (
                      <input
                        type="text"
                        value={userProfile.phone || 'Not set'}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                        readOnly
                      />
                    )}
                  </div>

                  {userProfile.userType === 'technician' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Website</label>
                        {isEditingProfile ? (
                          <input
                            type="url"
                            value={editedProfile.website || ''}
                            onChange={(e) => handleInputChange('website', e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                            placeholder="https://yourwebsite.com"
                          />
                        ) : (
                          <input
                            type="text"
                            value={userProfile.website || 'Not set'}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                            readOnly
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Service Area</label>
                        {isEditingProfile ? (
                          <input
                            type="text"
                            value={editedProfile.serviceArea || ''}
                            onChange={(e) => handleInputChange('serviceArea', e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                            placeholder="e.g., Atlanta Metro - 25 mile radius"
                          />
                        ) : (
                          <input
                            type="text"
                            value={userProfile.serviceArea || 'Not set'}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                            readOnly
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Hourly Rate</label>
                        {isEditingProfile ? (
                          <input
                            type="text"
                            value={editedProfile.hourlyRate || ''}
                            onChange={(e) => handleInputChange('hourlyRate', e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                            placeholder="e.g., $75-$110"
                          />
                        ) : (
                          <input
                            type="text"
                            value={userProfile.hourlyRate || 'Not set'}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                            readOnly
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Years of Experience</label>
                        {isEditingProfile ? (
                          <input
                            type="text"
                            value={editedProfile.experience || ''}
                            onChange={(e) => handleInputChange('experience', e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                            placeholder="e.g., 15 years"
                          />
                        ) : (
                          <input
                            type="text"
                            value={userProfile.experience || 'Not set'}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                            readOnly
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Certifications</label>
                        {isEditingProfile ? (
                          <textarea
                            value={editedProfile.certifications || ''}
                            onChange={(e) => handleInputChange('certifications', e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                            placeholder="e.g., Licensed & Insured, EPA Certified, CompTIA A+"
                            rows={2}
                          />
                        ) : (
                          <textarea
                            value={userProfile.certifications || 'Not set'}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                            readOnly
                            rows={2}
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Service Specialties</label>
                        {isEditingProfile ? (
                          <textarea
                            value={editedProfile.specialties || ''}
                            onChange={(e) => handleInputChange('specialties', e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                            placeholder="e.g., Smart Home Systems, Panel Upgrades, LED Lighting"
                            rows={2}
                          />
                        ) : (
                          <textarea
                            value={userProfile.specialties || 'Not set'}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                            readOnly
                            rows={2}
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Availability Schedule</label>
                        {isEditingProfile ? (
                          <textarea
                            value={editedProfile.availability || ''}
                            onChange={(e) => handleInputChange('availability', e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                            placeholder="e.g., Monday-Friday 8AM-6PM, Weekend consultations available"
                            rows={2}
                          />
                        ) : (
                          <textarea
                            value={userProfile.availability || 'Not set'}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                            readOnly
                            rows={2}
                          />
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Account Information & Actions */}
              <div className="space-y-6">
                {/* Account Info */}
                <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                      <input
                        type="email"
                        value={userProfile.email}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                        readOnly
                      />
                      <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">User Type</label>
                      <input
                        type="text"
                        value={userProfile.userType}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white capitalize"
                        readOnly
                      />
                      <p className="text-xs text-slate-400 mt-1">Account type cannot be changed</p>
                    </div>
                  </div>
                </div>

                {/* Business Information - Technicians Only */}
                {userProfile.userType === 'technician' && (
                  <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Business Information</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Business Address</label>
                        {isEditingProfile ? (
                          <textarea
                            value={editedProfile.businessAddress || ''}
                            onChange={(e) => handleInputChange('businessAddress', e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                            placeholder="123 Business St, City, State ZIP"
                            rows={2}
                          />
                        ) : (
                          <textarea
                            value={userProfile.businessAddress || 'Not set'}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                            readOnly
                            rows={2}
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Business Phone</label>
                        {isEditingProfile ? (
                          <input
                            type="tel"
                            value={editedProfile.businessPhone || ''}
                            onChange={(e) => handleInputChange('businessPhone', e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                            placeholder="(555) 123-4567"
                          />
                        ) : (
                          <input
                            type="text"
                            value={userProfile.businessPhone || 'Not set'}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                            readOnly
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Business Email</label>
                        {isEditingProfile ? (
                          <input
                            type="email"
                            value={editedProfile.businessEmail || ''}
                            onChange={(e) => handleInputChange('businessEmail', e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                            placeholder="business@example.com"
                          />
                        ) : (
                          <input
                            type="text"
                            value={userProfile.businessEmail || 'Not set'}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                            readOnly
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Professional Summary</label>
                        {isEditingProfile ? (
                          <textarea
                            value={editedProfile.about || ''}
                            onChange={(e) => handleInputChange('about', e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                            placeholder="Describe your professional background and expertise..."
                            rows={4}
                          />
                        ) : (
                          <textarea
                            value={userProfile.about || 'No professional summary set'}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                            readOnly
                            rows={4}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Account Actions */}
                <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <Link
                      href={`/${userProfile.username || userProfile.uniqueId}`}
                      className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-center"
                    >
                      👁️ View Public Profile
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      🚪 Sign Out
                    </button>
                  </div>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 relative overflow-hidden">
      {/* Animated background elements - matching main page */}
      <div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-blue-700/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-blue-700/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-blue-600/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <DashboardHeader />
      <NavigationTabs />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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