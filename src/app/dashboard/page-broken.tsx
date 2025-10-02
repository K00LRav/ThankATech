'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '@/lib/stripe';
import { auth, db, migrateTechnicianProfile, getTechnicianTransactions } from '@/lib/firebase';
import { onAuthStateChanged, Auth } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit, Firestore } from 'firebase/firestore';
import Link from 'next/link';
import Image from 'next/image';
import PayoutModal from '@/components/PayoutModal';
import { useTechnicianEarnings } from '@/hooks/useTechnicianEarnings';

interface TechnicianProfile {
  id: string;
  name: string;
  email: string;
  uniqueId?: string;
  businessName?: string;
  category: string;
  title?: string;
  photoURL?: string;
  points?: number;
  totalThankYous?: number;
  totalTips?: number;
  totalTipAmount?: number;
  phone?: string;
  businessAddress?: string;
  website?: string;
  about?: string;
}

interface EarningsData {
  totalEarnings: number;
  availableBalance: number;
  pendingBalance: number;
  totalTips: number;
  thisMonthEarnings: number;
}

interface Transaction {
  id: string;
  amount: number;
  customerName: string;
  date: string;
  status: 'completed' | 'pending';
  platformFee: number;
  technicianPayout?: number; // Net amount technician receives after fees
}

interface Withdrawal {
  id: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'processing';
  method: 'standard' | 'express';
  fee: number;
  netAmount: number;
}

export default function TechnicianDashboard() {
  const [user, setUser] = useState<any>(null);
  const [technicianProfile, setTechnicianProfile] = useState<TechnicianProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stripeAccountStatus, setStripeAccountStatus] = useState<'none' | 'pending' | 'active'>('none');
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Use the real earnings hook with technician document ID
  const { earnings: realEarnings, loading: earningsLoading } = useTechnicianEarnings(technicianProfile?.id || null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);

  // Load user and technician profile
  useEffect(() => {
    if (!(auth as Auth)) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth as Auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        try {
          let technicianFound = false;
          
          // First, try to fetch technician profile from technicians collection
          const techDoc = await getDoc(doc(db as Firestore, 'technicians', firebaseUser.uid));
          
          if (techDoc.exists()) {
            const techData = { id: techDoc.id, ...techDoc.data() } as TechnicianProfile;
            setTechnicianProfile(techData);
            technicianFound = true;
            
            // Calculate earnings from profile data
            const totalTipAmount = techData.totalTipAmount || 0;
            const totalTips = techData.totalTips || 0;
            
            // Earnings are now handled by the useTechnicianEarnings hook
          }
          
          // If not found in technicians collection, check users collection
          if (!technicianFound) {
            const userDoc = await getDoc(doc(db as Firestore, 'users', firebaseUser.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              
              // Check if user registered as a technician
              if (userData.userType === 'technician') {
                const techData = { 
                  id: userDoc.id, 
                  ...userData,
                  // Map user fields to technician fields for compatibility
                  businessName: userData.businessName || '',
                  category: userData.category || '',
                  points: userData.points || 0,
                  totalThankYous: userData.totalThankYous || 0,
                  totalTips: userData.totalTips || 0,
                  totalTipAmount: userData.totalTipAmount || 0
                } as TechnicianProfile;
                
                setTechnicianProfile(techData);
                technicianFound = true;
                
                // Earnings are now handled by the useTechnicianEarnings hook
              }
            }
          }
          
          // If still not found, search in both collections by email as fallback
          if (!technicianFound && firebaseUser.email) {
            
            // Search technicians collection
            const techQuery = query(
              collection(db as Firestore, 'technicians'),
              where('email', '==', firebaseUser.email),
              limit(1)
            );
            const techSnapshot = await getDocs(techQuery);
            
            if (!techSnapshot.empty) {
              const techDoc = techSnapshot.docs[0];
              const techData = { id: techDoc.id, ...techDoc.data() } as TechnicianProfile;
              setTechnicianProfile(techData);
              technicianFound = true;
            } else {
              // Search users collection
              const userQuery = query(
                collection(db as Firestore, 'users'),
                where('email', '==', firebaseUser.email),
                where('userType', '==', 'technician'),
                limit(1)
              );
              const userSnapshot = await getDocs(userQuery);
              
              if (!userSnapshot.empty) {
                const userDoc = userSnapshot.docs[0];
                const userData = userDoc.data();
                const techData = { 
                  id: userDoc.id, 
                  ...userData,
                  businessName: userData.businessName || '',
                  category: userData.category || ''
                } as TechnicianProfile;
                setTechnicianProfile(techData);
                technicianFound = true;
              }
            }
          }
          
          // Transactions will be loaded in a separate useEffect when technicianProfile is set
          
          // Debug logging and migration attempt
          if (!technicianFound) {
            // Try to migrate from users collection
            try {
              const migratedProfile = await migrateTechnicianProfile(firebaseUser.uid);
              if (migratedProfile && 'name' in migratedProfile) {
                const techProfile = migratedProfile as TechnicianProfile;
                setTechnicianProfile(techProfile);
                technicianFound = true;
                
                // Earnings are now handled by the useTechnicianEarnings hook
              }
            } catch (migrationError) {
              console.error('Error during migration:', migrationError);
            }
          }
          
        } catch (error) {
          console.error('Error loading technician profile:', error);
        }
      } else {
        setUser(null);
        setTechnicianProfile(null);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Calculate profile completeness percentage
  const getProfileCompleteness = () => {
    if (!technicianProfile) return 0;
    
    const fields = [
      technicianProfile.name,
      technicianProfile.email,
      technicianProfile.category,
      technicianProfile.businessName,
      technicianProfile.phone,
      technicianProfile.about,
      technicianProfile.businessAddress,
    ];
    
    const completedFields = fields.filter(field => field && field.trim() !== '').length;
    return Math.round((completedFields / fields.length) * 100);
  };



  const loadWithdrawals = useCallback(async () => {
    if (!user?.uid || !technicianProfile?.id) return;

    try {
      // TODO: Replace with actual Firebase query for withdrawals
      // For now, showing empty state as no withdrawal tracking exists yet
      const mockWithdrawals: Withdrawal[] = [
        // Uncomment to test with mock data:
        // {
        //   id: 'w1',
        //   amount: 25000, // $250.00 in cents
        //   date: 'Sep 25, 2025',
        //   status: 'completed',
        //   method: 'standard',
        //   fee: 0,
        //   netAmount: 25000
        // }
      ];
      setWithdrawals(mockWithdrawals);
    } catch (error) {
      console.error('❌ Error loading withdrawals:', error);
      setWithdrawals([]);
    }
  }, [user?.uid, technicianProfile?.id]);

  const checkStripeAccountStatus = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const response = await fetch('/api/check-express-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          technicianId: user.uid,
        }),
      });

      const data = await response.json();
      
      if (data.status) {
        setStripeAccountStatus(data.status);
      }
    } catch (error) {
      console.error('Failed to check Stripe account status:', error);
    }
  }, [user?.uid]);

  // Check for setup completion or refresh from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const setup = urlParams.get('setup');
    const refresh = urlParams.get('refresh');

    if (setup === 'complete') {
      // Account setup completed, check status
      setTimeout(() => {
        checkStripeAccountStatus();
      }, 2000); // Give Stripe a moment to process
      
      // Clean up URL
      window.history.replaceState({}, document.title, '/dashboard');
    } else if (refresh === 'true') {
      // User needs to refresh setup
      checkStripeAccountStatus();
      window.history.replaceState({}, document.title, '/dashboard');
    }
  }, [user, checkStripeAccountStatus]);

  // Load transactions when technician profile is available
  useEffect(() => {
    const loadTransactions = async () => {
      if (technicianProfile) {
        try {
          const realTransactions = await getTechnicianTransactions(
            technicianProfile.id, 
            technicianProfile.email, 
            (technicianProfile as any).uniqueId
          );
          
          
          setTransactions(realTransactions);
        } catch (error) {
          console.error('❌ Error loading transactions:', error);
          setTransactions([]); // Set empty array on error
        }
      }
    };

    loadTransactions();
    loadWithdrawals();
  }, [technicianProfile, loadWithdrawals]);

  // Check account status periodically
  useEffect(() => {
    if (user && technicianProfile) {
      checkStripeAccountStatus();
      
      // Check status every 30 seconds if account is pending
      const interval = setInterval(() => {
        if (stripeAccountStatus === 'pending') {
          checkStripeAccountStatus();
        }
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [user, technicianProfile, stripeAccountStatus, checkStripeAccountStatus]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center bg-slate-800/50 backdrop-blur rounded-xl p-8 border border-white/10 max-w-md mx-4">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Technician Dashboard</h1>
          <p className="text-blue-200 mb-6">Please sign in to access your dashboard and manage your technician profile.</p>
          <Link 
            href="/" 
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Go to Home & Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (!technicianProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center bg-slate-800/50 backdrop-blur rounded-xl p-8 border border-white/10 max-w-md mx-4">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.982 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Technician Profile Required</h1>
          <p className="text-blue-200 mb-6">You need to register as a technician to use this dashboard.</p>
          <Link 
            href="/" 
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Register as Technician
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: 'home' },
    { id: 'profile', label: 'Profile', icon: 'user' },
    { id: 'transactions', label: 'Transactions', icon: 'credit-card' },
    { id: 'payouts', label: 'Payouts', icon: 'dollar-sign' },
    { id: 'statistics', label: 'Statistics', icon: 'bar-chart' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  const renderIcon = (iconName: string) => {
    const iconClass = "w-5 h-5";
    switch (iconName) {
      case 'home':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
      case 'user':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
      case 'credit-card':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
      case 'dollar-sign':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>;
      case 'bar-chart':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
      case 'settings':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
      default:
        return <div className={iconClass}></div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">TT</span>
            </div>
            <h1 className="text-white font-bold text-lg">Dashboard</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User Profile Section */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            {technicianProfile?.photoURL ? (
              <Image 
                src={technicianProfile.photoURL} 
                alt={technicianProfile.name}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full border-2 border-blue-400"
              />
            ) : (
              <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">
                {technicianProfile?.name || user?.displayName || 'Technician'}
              </p>
              <p className="text-slate-400 text-sm truncate">
                {technicianProfile?.businessName || 'Professional'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6">
          <ul className="space-y-2">
            {sidebarItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors ${
                    activeTab === item.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {renderIcon(item.icon)}
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom section */}
        <div className="p-4 border-t border-slate-700">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {/* Top Bar */}
        <div className="bg-slate-800 border-b border-slate-700 h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h2 className="text-xl font-semibold text-white capitalize">{activeTab}</h2>
              <p className="text-slate-400 text-sm">
                {activeTab === 'overview' && 'Your performance overview'}
                {activeTab === 'profile' && 'Manage your profile information'}
                {activeTab === 'transactions' && 'View your transaction history'}
                {activeTab === 'payouts' && 'Manage your earnings and payouts'}
                {activeTab === 'statistics' && 'Detailed performance analytics'}
                {activeTab === 'settings' && 'Account and notification settings'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                className="bg-slate-700 text-white placeholder-slate-400 border border-slate-600 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 1115 0z" />
                </svg>
              </div>
              <span className="text-slate-300 text-sm font-medium">{user?.displayName || 'John Smith'}</span>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 overflow-auto">
          {activeTab === 'overview' && (
            <>
              {/* Earnings Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Total Earnings</h3>
            </div>
            <p className="text-3xl font-bold text-green-400">
              {formatCurrency(realEarnings.totalEarnings * 100)}
            </p>
            <p className="text-sm text-blue-200 mt-1">{realEarnings.tipCount || 0} tips received</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Available Balance</h3>
            </div>
            <p className="text-3xl font-bold text-blue-400">
              {formatCurrency(realEarnings.availableBalance * 100)}
            </p>
            <p className="text-sm text-blue-200 mt-1">Ready to withdraw</p>
            {realEarnings.availableBalance >= 1.00 && (
              <div className="mt-4">
                <button
                  onClick={() => setShowPayoutModal(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Withdraw Funds
                </button>
              </div>
            )}
          </div>

          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Pending</h3>
            </div>
            <p className="text-3xl font-bold text-yellow-400">
              {formatCurrency(realEarnings.pendingBalance * 100)}
            </p>
            <p className="text-sm text-blue-200 mt-1">Processing (2-3 days)</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">This Month</h3>
            </div>
            <p className="text-3xl font-bold text-purple-400">
              {formatCurrency(realEarnings.totalEarnings * 100)}
            </p>
            <p className="text-sm text-blue-200 mt-1">September 2025</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => setShowPayoutModal(true)}
                disabled={realEarnings.availableBalance < 1.00}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {realEarnings.availableBalance > 0
                  ? `Withdraw ${formatCurrency(realEarnings.availableBalance * 100)}`
                  : 'No funds to withdraw'
                }
              </button>
              <Link
                href="/profile"
                className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-xl transition-colors text-center"
              >
                Edit Profile
              </Link>
              <Link
                href="/"
                className="block w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 rounded-xl transition-colors text-center"
              >
                View Your Profile Card
              </Link>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">Account Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-blue-200">Profile Completeness</span>
                <span className={`font-semibold ${getProfileCompleteness() >= 80 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {getProfileCompleteness()}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-200">Payment Setup</span>
                <span className={`font-semibold ${
                  stripeAccountStatus === 'active' ? 'text-green-400' :
                  stripeAccountStatus === 'pending' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {stripeAccountStatus === 'active' ? 'Active' :
                   stripeAccountStatus === 'pending' ? 'Pending' : 'Required'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-200">Category</span>
                <span className="text-blue-300 font-semibold capitalize">
                  {technicianProfile?.category || 'Not Set'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-200">Thank Yous Received</span>
                <span className="text-green-400 font-semibold">
                  {technicianProfile?.totalThankYous || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">Profile Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-1">Business Name</label>
                <p className="text-white">{technicianProfile.businessName || 'Not set'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-1">Category</label>
                <p className="text-white capitalize">{technicianProfile.category || 'Not set'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-1">Phone</label>
                <p className="text-white">{technicianProfile.phone || 'Not set'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-1">Website</label>
                <p className="text-white">{technicianProfile.website || 'Not set'}</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-blue-200 mb-1">Business Address</label>
                <p className="text-white">{technicianProfile.businessAddress || 'Not set'}</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-blue-200 mb-1">About</label>
                <p className="text-white">{technicianProfile.about || 'No description provided'}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">Performance Stats</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-blue-200">Total Points</span>
                <span className="text-2xl font-bold text-blue-400">{technicianProfile.points || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-200">Thank Yous</span>
                <span className="text-2xl font-bold text-green-400">{technicianProfile.totalThankYous || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-200">Tips Received</span>
                <span className="text-2xl font-bold text-purple-400">{technicianProfile.totalTips || 0}</span>
              </div>
              {getProfileCompleteness() < 100 && (
                <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                  <p className="text-yellow-200 text-sm">
                    Complete your profile to get more visibility!
                  </p>
                  <Link 
                    href="/profile" 
                    className="text-yellow-300 hover:text-yellow-100 text-sm font-medium"
                  >
                    Complete Profile →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-white/10">
          <div className="p-6 border-b border-white/10">
            <h3 className="text-xl font-bold text-white">Recent Tips</h3>
          </div>
          <div className="divide-y divide-white/10">
            {transactions.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <p className="text-slate-400 text-lg font-medium mb-2">No tips received yet</p>
                <p className="text-slate-500 text-sm">Your tip history will appear here once customers start appreciating your work!</p>
              </div>
            ) : (
              transactions.map((transaction) => (
              <div key={transaction.id} className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-white">{transaction.customerName}</p>
                    <p className="text-sm text-blue-200">{transaction.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-400">
                    +{formatCurrency(transaction.technicianPayout || (transaction.amount - transaction.platformFee))}
                  </p>
                  <p className="text-sm text-blue-300">
                    {formatCurrency(transaction.amount)} - {formatCurrency(transaction.platformFee)} fee
                  </p>
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

        {/* Withdrawal History */}
        <div className="mt-8 bg-slate-800/50 backdrop-blur rounded-xl border border-white/10">
          <div className="p-6 border-b border-white/10">
            <h3 className="text-xl font-bold text-white">Withdrawal History</h3>
          </div>
          <div className="divide-y divide-white/10">
            {withdrawals.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <p className="text-slate-400 text-lg font-medium mb-2">No withdrawals yet</p>
                <p className="text-slate-500 text-sm">Your withdrawal history will appear here after you make your first payout.</p>
              </div>
            ) : (
              withdrawals.map((withdrawal) => (
                <div key={withdrawal.id} className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-white">Bank Transfer</p>
                      <p className="text-sm text-blue-200">{withdrawal.date}</p>
                      <p className="text-xs text-slate-400 capitalize">{withdrawal.method} transfer</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-purple-400">
                      -{formatCurrency(withdrawal.amount)}
                    </p>
                    {withdrawal.fee > 0 && (
                      <p className="text-sm text-slate-400">
                        {formatCurrency(withdrawal.fee)} fee
                      </p>
                    )}
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      withdrawal.status === 'completed' 
                        ? 'bg-green-500/20 text-green-400' 
                        : withdrawal.status === 'processing'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {withdrawal.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
            </>
          )}
        </div>
      </div>
      
      {/* Payout Modal */}
      {showPayoutModal && (
        <PayoutModal
          isOpen={showPayoutModal}
          onClose={() => setShowPayoutModal(false)}
          availableBalance={realEarnings.availableBalance}
          technicianId={user?.uid || ''}
          onPayoutSuccess={(amount) => {
            // The useTechnicianEarnings hook will automatically refresh earnings
            loadWithdrawals(); // Refresh withdrawal history
            setShowPayoutModal(false);
          }}
        />
      )}
    </div>
  );
}
