'use client';

import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/stripe';
import { auth, db, migrateTechnicianProfile } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import Link from 'next/link';

interface TechnicianProfile {
  id: string;
  name: string;
  email: string;
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
  const [earnings, setEarnings] = useState<EarningsData>({
    totalEarnings: 0,
    availableBalance: 0,
    pendingBalance: 0,
    totalTips: 0,
    thisMonthEarnings: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stripeAccountStatus, setStripeAccountStatus] = useState<'none' | 'pending' | 'active'>('none');

  // Load user and technician profile
  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        try {
          let technicianFound = false;
          
          // First, try to fetch technician profile from technicians collection
          const techDoc = await getDoc(doc(db, 'technicians', firebaseUser.uid));
          
          if (techDoc.exists()) {
            const techData = { id: techDoc.id, ...techDoc.data() } as TechnicianProfile;
            setTechnicianProfile(techData);
            technicianFound = true;
            
            // Calculate earnings from profile data
            const totalTipAmount = techData.totalTipAmount || 0;
            const totalTips = techData.totalTips || 0;
            
            setEarnings({
              totalEarnings: totalTipAmount / 100, // Convert from cents
              availableBalance: (totalTipAmount * 0.85) / 100, // 85% available (15% for fees/pending)
              pendingBalance: (totalTipAmount * 0.15) / 100, // 15% pending
              totalTips: totalTips,
              thisMonthEarnings: totalTipAmount / 100, // For demo, show all as this month
            });
          }
          
          // If not found in technicians collection, check users collection
          if (!technicianFound) {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
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
                
                // Calculate earnings from profile data
                const totalTipAmount = userData.totalTipAmount || 0;
                const totalTips = userData.totalTips || 0;
                
                setEarnings({
                  totalEarnings: totalTipAmount / 100,
                  availableBalance: (totalTipAmount * 0.85) / 100,
                  pendingBalance: (totalTipAmount * 0.15) / 100,
                  totalTips: totalTips,
                  thisMonthEarnings: totalTipAmount / 100,
                });
              }
            }
          }
          
          // If still not found, search in both collections by email as fallback
          if (!technicianFound && firebaseUser.email) {
            console.log('Searching for technician by email:', firebaseUser.email);
            
            // Search technicians collection
            const techQuery = query(
              collection(db, 'technicians'),
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
                collection(db, 'users'),
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
          
          // TODO: Load real transactions from Firestore
          // For now, using mock data
          setTransactions([
            {
              id: '1',
              amount: 2500,
              customerName: 'Sarah Johnson',
              date: '2025-09-28',
              status: 'completed',
              platformFee: 155,
            },
            {
              id: '2',
              amount: 1000,
              customerName: 'Mike Chen',
              date: '2025-09-27',
              status: 'completed',
              platformFee: 80,
            },
          ]);
          
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
                
                // Calculate earnings from migrated profile
                const totalTipAmount = techProfile.totalTipAmount || 0;
                const totalTips = techProfile.totalTips || 0;
                
                setEarnings({
                  totalEarnings: totalTipAmount / 100,
                  availableBalance: (totalTipAmount * 0.85) / 100,
                  pendingBalance: (totalTipAmount * 0.15) / 100,
                  totalTips: totalTips,
                  thisMonthEarnings: totalTipAmount / 100,
                });
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
    // TODO: Implement Stripe Connect account creation
    alert('Stripe Connect integration coming soon!');
  };

  const handleWithdraw = async () => {
    // TODO: Implement withdrawal functionality
    alert('Withdrawal feature coming soon!');
  };

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
        {/* Stripe Account Status */}
        {stripeAccountStatus === 'none' && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.982 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-300 mb-1">Payment Setup Required</h3>
                <p className="text-yellow-200 mb-4">
                  Connect your bank account to receive tips and payments from customers.
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
              {formatCurrency(earnings.totalEarnings * 100)}
            </p>
            <p className="text-sm text-blue-200 mt-1">{earnings.totalTips} tips received</p>
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
              {formatCurrency(earnings.availableBalance * 100)}
            </p>
            <p className="text-sm text-blue-200 mt-1">Ready to withdraw</p>
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
              {formatCurrency(earnings.pendingBalance * 100)}
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
              {formatCurrency(earnings.thisMonthEarnings * 100)}
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
                onClick={handleWithdraw}
                disabled={earnings.availableBalance === 0}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {earnings.availableBalance > 0 
                  ? `Withdraw ${formatCurrency(earnings.availableBalance * 100)}`
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
    </div>
  );
}