'use client';

import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/stripe';
import { auth, db, migrateTechnicianProfile, getTechnicianTransactions } from '@/lib/firebase';
import { onAuthStateChanged, Auth } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit, Firestore } from 'firebase/firestore';
import Link from 'next/link';
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
}

export default function TechnicianDashboard() {
  const [user, setUser] = useState<any>(null);
  const [technicianProfile, setTechnicianProfile] = useState<TechnicianProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stripeAccountStatus, setStripeAccountStatus] = useState<'none' | 'pending' | 'active'>('none');
  
  // Use the real earnings hook
  const { earnings: realEarnings, loading: earningsLoading } = useTechnicianEarnings(user?.uid || null);
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
            console.log('Searching for technician by email:', firebaseUser.email);
            
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
            console.log('No technician profile found for user:', {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName
            });
            
            // Try to migrate from users collection
            try {
              console.log('Attempting to migrate technician profile...');
              const migratedProfile = await migrateTechnicianProfile(firebaseUser.uid);
              if (migratedProfile && 'name' in migratedProfile) {
                const techProfile = migratedProfile as TechnicianProfile;
                setTechnicianProfile(techProfile);
                technicianFound = true;
                console.log('Successfully migrated and loaded technician profile');
                
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

  const handleStripeConnect = async () => {
    if (!user?.uid || !technicianProfile?.email) {
      alert('Unable to connect account. Please ensure your profile is complete.');
      return;
    }

    try {
      const response = await fetch('/api/create-express-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          technicianId: user.uid,
          email: technicianProfile.email,
          returnUrl: `${window.location.origin}/dashboard?setup=complete`,
          refreshUrl: `${window.location.origin}/dashboard?refresh=true`,
        }),
      });

      const data = await response.json();

      if (data.success && data.onboardingUrl) {
        // Redirect to Stripe onboarding
        window.location.href = data.onboardingUrl;
      } else {
        throw new Error(data.error || 'Failed to create payment account');
      }
    } catch (error) {
      console.error('Stripe Connect error:', error);
      alert('Failed to set up payment account. Please try again.');
    }
  };

  const checkStripeAccountStatus = async () => {
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
        console.log('Stripe account status:', data.status, data.message);
      }
    } catch (error) {
      console.error('Failed to check Stripe account status:', error);
    }
  };

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
  }, [user]);

  // Load transactions when technician profile is available
  useEffect(() => {
    const loadTransactions = async () => {
      if (technicianProfile) {
        try {
          console.log('Loading transactions for technician:', technicianProfile);
          const realTransactions = await getTechnicianTransactions(
            technicianProfile.id, 
            technicianProfile.email, 
            (technicianProfile as any).uniqueId
          );
          console.log('Loaded real transactions:', realTransactions);
          setTransactions(realTransactions);
        } catch (error) {
          console.error('Error loading transactions:', error);
          setTransactions([]); // Set empty array on error
        }
      }
    };

    loadTransactions();
  }, [technicianProfile]);

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
  }, [user, technicianProfile, stripeAccountStatus]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {technicianProfile?.photoURL && (
                <img 
                  src={technicianProfile.photoURL} 
                  alt={technicianProfile.name}
                  className="w-16 h-16 rounded-full border-2 border-blue-400"
                />
              )}
              <div>
                <h1 className="text-3xl font-bold text-white">Technician Dashboard</h1>
                <p className="text-blue-200 mt-1">
                  Welcome back, {technicianProfile?.name || user?.displayName || 'Technician'}
                </p>
                {technicianProfile?.businessName && (
                  <p className="text-blue-300 text-sm">{technicianProfile.businessName}</p>
                )}
              </div>
            </div>
            <Link
              href="/"
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-xl transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stripe Account Status - Only show if user has earnings to withdraw */}
        {stripeAccountStatus === 'none' && realEarnings.availableBalance >= 1.00 && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.982 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-300 mb-1">Bank Account Setup Required</h3>
                <p className="text-yellow-200 mb-4">
                  Connect your bank account to withdraw your earnings. You can continue receiving tips while setting this up.
                </p>
                <button
                  onClick={handleStripeConnect}
                  className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-semibold px-6 py-2 rounded-xl transition-colors"
                >
                  Connect Bank Account
                </button>
              </div>
            </div>
          </div>
        )}

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
            {transactions.map((transaction) => (
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
                    +{formatCurrency(transaction.amount - transaction.platformFee)}
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
            ))}
          </div>
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
            setShowPayoutModal(false);
          }}
        />
      )}
    </div>
  );
}