'use client';

import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/stripe';
import ConversionWidget from '@/components/ConversionWidget';
import Link from 'next/link';
import Image from 'next/image';

// Modern Dashboard Redesign with Better UX
// Focus: Simplified navigation, clear actions, better information hierarchy

interface UserProfile {
  id: string;
  name: string;
  email: string;
  userType: 'technician' | 'client';
  points?: number;
  totalTips?: number;
  totalSpent?: number;
  totalThankYousSent?: number;
  favoriteTechnicians?: string[];
  totalThankYous?: number;
  photoURL?: string;
  businessName?: string;
  category?: string;
}

interface Transaction {
  id: string;
  amount: number;
  clientName?: string;
  technicianName?: string;
  date: string;
  status: 'completed' | 'pending';
  type?: 'tip' | 'toa';
}

export default function ModernDashboardRedesign() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeView, setActiveView] = useState<'home' | 'activity' | 'profile'>('home');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showConversionWidget, setShowConversionWidget] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    // This would be replaced with actual data loading
    setUserProfile({
      id: '1',
      name: 'John Smith',
      email: 'john@example.com',
      userType: 'client',
      points: 47,
      totalTips: 12,
      totalSpent: 156.50,
      totalThankYousSent: 8,
      favoriteTechnicians: ['tech1', 'tech2', 'tech3'],
      photoURL: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
    });

    setTransactions([
      {
        id: '1',
        amount: 25.00,
        technicianName: 'Mike Johnson',
        date: '2025-09-28',
        status: 'completed',
        type: 'toa'
      },
      {
        id: '2',
        amount: 15.00,
        technicianName: 'Sarah Davis',
        date: '2025-09-25',
        status: 'completed',
        type: 'toa'
      }
    ]);
  }, []);

  // Header with user info and main navigation
  const DashboardHeader = () => (
    <div className="bg-gradient-to-r from-blue-900/80 to-slate-800/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <span className="text-white font-semibold hidden sm:block">ThankATech</span>
            </Link>
            <div className="hidden sm:block text-slate-300 text-sm">
              Welcome back, {userProfile?.name?.split(' ')[0] || 'User'}!
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {/* Points Badge */}
            {userProfile?.points && userProfile.points > 0 && (
              <div className="bg-green-500/20 border border-green-500/30 rounded-full px-3 py-1 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-green-300 text-sm font-medium">{userProfile.points} Points</span>
              </div>
            )}

            {/* Profile Avatar */}
            <div className="flex items-center gap-3">
              {userProfile?.photoURL ? (
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
                    {userProfile?.name?.charAt(0) || 'U'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Main navigation tabs - simplified to 3 core views
  const NavigationTabs = () => (
    <div className="bg-white/5 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-8">
          {[
            { id: 'home', label: 'Dashboard', icon: '🏠' },
            { id: 'activity', label: 'Activity', icon: '📊' },
            { id: 'profile', label: 'Settings', icon: '⚙️' }
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

  // Hero section with primary action
  const HeroSection = () => (
    <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 backdrop-blur-xl rounded-2xl p-8 mb-8 border border-white/10">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white mb-2">
            {userProfile?.userType === 'client' ? 'Ready to Show Appreciation?' : 'Your Technician Dashboard'}
          </h1>
          <p className="text-slate-300 text-lg mb-4">
            {userProfile?.userType === 'client' 
              ? 'Send TOA tokens to your favorite technicians and earn points!'
              : 'Track your earnings and manage your profile'
            }
          </p>
          
          {/* Primary CTA */}
          <div className="flex flex-col sm:flex-row gap-3">
            {userProfile?.userType === 'client' ? (
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
              <Link
                href="/"
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 text-center"
              >
                View Public Profile
              </Link>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex-shrink-0">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 text-center border border-white/20">
              <div className="text-2xl font-bold text-blue-400">{userProfile?.totalTips || 0}</div>
              <div className="text-slate-300 text-sm">TOA Sent</div>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 text-center border border-white/20">
              <div className="text-2xl font-bold text-green-400">{userProfile?.points || 0}</div>
              <div className="text-slate-300 text-sm">Points</div>
            </div>
          </div>
        </div>
      </div>

      {/* Conversion Widget */}
      {showConversionWidget && userProfile?.points && userProfile.points >= 5 && (
        <div className="mt-6 p-6 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Convert Points to TOA</h3>
            <button
              onClick={() => setShowConversionWidget(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <ConversionWidget userId={userProfile.id} />
        </div>
      )}
    </div>
  );

  // Simplified stats cards
  const StatsGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {userProfile?.userType === 'client' ? (
        <>
          <StatCard
            title="Total Spent"
            value={userProfile.totalSpent ? formatCurrency(userProfile.totalSpent * 100) : '$0'}
            icon="💰"
            color="blue"
            subtitle="On TOA tokens"
          />
          <StatCard
            title="Favorites"
            value={userProfile.favoriteTechnicians?.length || 0}
            icon="⭐"
            color="yellow"
            subtitle="Saved technicians"
            onClick={() => setActiveView('activity')}
            clickable
          />
          <StatCard
            title="Thank Yous"
            value={userProfile.totalThankYousSent || 0}
            icon="❤️"
            color="red"
            subtitle="Sent to techs"
          />
        </>
      ) : (
        <>
          <StatCard
            title="Total Earnings"
            value="$450.00"
            icon="💰"
            color="green"
            subtitle="This month"
          />
          <StatCard
            title="Thank Yous"
            value={userProfile.totalThankYous || 0}
            icon="❤️"
            color="red"
            subtitle="Received"
          />
          <StatCard
            title="Available"
            value="$125.50"
            icon="🏦"
            color="blue"
            subtitle="Ready to withdraw"
          />
        </>
      )}
    </div>
  );

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
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{value}</div>
          </div>
        </div>
        <h3 className="font-semibold text-white mb-1">{title}</h3>
        <p className="text-slate-300 text-sm">{subtitle}</p>
      </div>
    );
  };

  // Recent activity with better visual design
  const RecentActivity = () => (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
          <button
            onClick={() => setActiveView('activity')}
            className="text-blue-400 hover:text-blue-300 text-sm font-medium"
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
          transactions.slice(0, 3).map((transaction) => (
            <div key={transaction.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <span className="text-blue-400">💰</span>
                </div>
                <div>
                  <p className="font-medium text-white">
                    {userProfile?.userType === 'client' 
                      ? `TOA to ${transaction.technicianName}`
                      : `TOA from ${transaction.clientName || 'Client'}`
                    }
                  </p>
                  <p className="text-sm text-slate-400">{transaction.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold ${userProfile?.userType === 'client' ? 'text-red-400' : 'text-green-400'}`}>
                  {userProfile?.userType === 'client' ? '-' : '+'}
                  {formatCurrency(transaction.amount * 100)}
                </p>
                <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                  {transaction.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Render different views
  const renderView = () => {
    switch (activeView) {
      case 'home':
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
            <h2 className="text-2xl font-bold text-white">Activity History</h2>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
              <p className="text-slate-300">Detailed activity view would go here...</p>
            </div>
          </div>
        );
      case 'profile':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Profile Settings</h2>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
              <p className="text-slate-300">Profile management would go here...</p>
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
    </div>
  );
}