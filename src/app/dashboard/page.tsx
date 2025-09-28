'use client';

import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/stripe';
import Link from 'next/link';

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
  const [userProfile, setUserProfile] = useState<any>(null);
  const [earnings, setEarnings] = useState<EarningsData>({
    totalEarnings: 1247.50,
    availableBalance: 342.75,
    pendingBalance: 125.00,
    totalTips: 47,
    thisMonthEarnings: 528.25,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([
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
    {
      id: '3',
      amount: 5000,
      customerName: 'Emma Davis',
      date: '2025-09-26',
      status: 'pending',
      platformFee: 280,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [stripeAccountStatus, setStripeAccountStatus] = useState<'none' | 'pending' | 'active'>('pending');
  
  // Mock user for now
  const user = {
    uid: 'demo-user',
    displayName: 'John Technician',
    email: 'john@example.com'
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
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Please sign in to access your dashboard</h1>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            Go to Home
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
            <div>
              <h1 className="text-3xl font-bold text-white">Technician Dashboard</h1>
              <p className="text-blue-200 mt-1">
                Welcome back, {userProfile?.displayName || user.displayName}
              </p>
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
                Withdraw {formatCurrency(earnings.availableBalance * 100)}
              </button>
              <Link
                href="/profile"
                className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-xl transition-colors text-center"
              >
                Edit Profile
              </Link>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">Account Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-blue-200">Profile Completeness</span>
                <span className="text-green-400 font-semibold">100%</span>
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
                <span className="text-blue-200">Verification</span>
                <span className="text-green-400 font-semibold">Verified</span>
              </div>
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