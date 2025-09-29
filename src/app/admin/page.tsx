"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, updateDoc, query, orderBy, where } from 'firebase/firestore';

// Username utility functions
async function isUsernameTaken(username: string): Promise<boolean> {
  try {
    const techniciansQuery = query(
      collection(db, 'technicians'),
      where('username', '==', username.toLowerCase())
    );
    const customersQuery = query(
      collection(db, 'users'),
      where('username', '==', username.toLowerCase())
    );
    
    const [techSnapshot, customerSnapshot] = await Promise.all([
      getDocs(techniciansQuery),
      getDocs(customersQuery)
    ]);
    
    return !techSnapshot.empty || !customerSnapshot.empty;
  } catch (error) {
    console.error('Error checking username availability:', error);
    return true; // Assume taken on error for safety
  }
}

function validateUsername(username: string): { isValid: boolean; error: string | null } {
  if (!username) {
    return { isValid: false, error: 'Username is required' };
  }
  
  const trimmed = username.trim();
  
  if (trimmed.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters long' };
  }
  
  if (trimmed.length > 20) {
    return { isValid: false, error: 'Username must be 20 characters or less' };
  }
  
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(trimmed)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }
  
  const reserved = ['admin', 'api', 'www', 'mail', 'ftp', 'localhost', 'dashboard', 'profile', 'about', 'contact', 'privacy', 'terms'];
  if (reserved.includes(trimmed.toLowerCase())) {
    return { isValid: false, error: 'This username is reserved and cannot be used' };
  }
  
  return { isValid: true, error: null };
}

async function generateUsernameSuggestions(baseUsername: string): Promise<string[]> {
  const suggestions = [];
  const variations = [
    baseUsername,
    baseUsername + 'tech',
    baseUsername + 'pro',
    baseUsername + '2024',
    baseUsername + 'service'
  ];
  
  for (const variation of variations) {
    const isTaken = await isUsernameTaken(variation);
    if (!isTaken && validateUsername(variation).isValid) {
      suggestions.push(variation);
    }
    if (suggestions.length >= 5) break;
  }
  
  // Fill remaining slots with numbered variations
  let counter = 1;
  while (suggestions.length < 5 && counter <= 99) {
    const numberedUsername = baseUsername + counter;
    const isTaken = await isUsernameTaken(numberedUsername);
    if (!isTaken && validateUsername(numberedUsername).isValid) {
      suggestions.push(numberedUsername);
    }
    counter++;
  }
  
  return suggestions;
}

interface Technician {
  id: string;
  name: string;
  email: string;
  username?: string;
  businessName?: string;
  category?: string;
  createdAt?: number;
  points?: number;
  totalTips?: number;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  username?: string;
  totalTipsSent?: number;
  totalSpent?: number;
  createdAt?: number;
}

interface AdminStats {
  totalTechnicians: number;
  totalCustomers: number;
  techniciansWithUsernames: number;
  customersWithUsernames: number;
  totalTransactions: number;
  totalRevenue: number;
}

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data states
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalTechnicians: 0,
    totalCustomers: 0,
    techniciansWithUsernames: 0,
    customersWithUsernames: 0,
    totalTransactions: 0,
    totalRevenue: 0
  });
  
  // Operation states
  const [isGeneratingUsernames, setIsGeneratingUsernames] = useState(false);
  const [operationResults, setOperationResults] = useState<string>('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        checkAdminAccess(user);
      } else {
        setIsAuthorized(false);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const checkAdminAccess = async (user: any) => {
    try {
      // Only k00lrav@gmail.com with Google authentication is admin
      const ADMIN_EMAIL = 'k00lrav@gmail.com';
      
      // Check if user email matches admin email
      const isCorrectEmail = user.email?.toLowerCase() === ADMIN_EMAIL;
      
      // Check if user is authenticated via Google (Google provider ID)
      const isGoogleAuth = user.providerData?.some((provider: any) => 
        provider.providerId === 'google.com'
      );
      
      // Must be both correct email AND Google authenticated
      const isAdmin = isCorrectEmail && isGoogleAuth;
      
      if (!isCorrectEmail) {
        console.log('❌ Admin access denied: Wrong email address');
      }
      if (!isGoogleAuth) {
        console.log('❌ Admin access denied: Must use Google authentication');
      }
      if (isAdmin) {
        console.log('✅ Admin access granted for:', user.email);
      }
      
      setIsAuthorized(isAdmin);
      
      if (isAdmin) {
        await loadAdminData();
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      setIsAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  const loadAdminData = async () => {
    try {
      // Load technicians
      const techniciansRef = collection(db, 'technicians');
      const techQuery = query(techniciansRef, orderBy('createdAt', 'desc'));
      const techSnapshot = await getDocs(techQuery);
      
      const techData: Technician[] = [];
      techSnapshot.forEach((doc) => {
        techData.push({ id: doc.id, ...doc.data() } as Technician);
      });
      
      // Load customers
      const customersRef = collection(db, 'users');
      const customerQuery = query(customersRef, orderBy('createdAt', 'desc'));
      const customerSnapshot = await getDocs(customerQuery);
      
      const customerData: Customer[] = [];
      customerSnapshot.forEach((doc) => {
        customerData.push({ id: doc.id, ...doc.data() } as Customer);
      });
      
      // Load transactions for stats
      const transactionsRef = collection(db, 'transactions');
      const transactionSnapshot = await getDocs(transactionsRef);
      
      let totalRevenue = 0;
      transactionSnapshot.forEach((doc) => {
        const transaction = doc.data();
        totalRevenue += transaction.amount || 0;
      });
      
      setTechnicians(techData);
      setCustomers(customerData);
      setStats({
        totalTechnicians: techData.length,
        totalCustomers: customerData.length,
        techniciansWithUsernames: techData.filter(t => t.username).length,
        customersWithUsernames: customerData.filter(c => c.username).length,
        totalTransactions: transactionSnapshot.size,
        totalRevenue: totalRevenue / 100 // Convert cents to dollars
      });
      
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  };

  const generateUsernamesForAllTechnicians = async () => {
    setIsGeneratingUsernames(true);
    setOperationResults('Starting username generation...\n');
    
    try {
      const techniciansWithoutUsernames = technicians.filter(tech => !tech.username);
      
      if (techniciansWithoutUsernames.length === 0) {
        setOperationResults('✅ All technicians already have usernames!\n');
        setIsGeneratingUsernames(false);
        return;
      }
      
      setOperationResults(prev => prev + `Found ${techniciansWithoutUsernames.length} technicians without usernames.\n\n`);
      
      const results = [];
      
      for (const technician of techniciansWithoutUsernames) {
        try {
          setOperationResults(prev => prev + `Processing: ${technician.name}...\n`);
          
          // Generate username from name
          const cleanName = technician.name.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .trim();
          
          const parts = cleanName.split(/\s+/);
          let baseUsername = parts.length > 1 ? parts[0] + parts[parts.length - 1] : parts[0];
          
          // Ensure minimum length
          if (baseUsername.length < 3) {
            baseUsername = baseUsername + 'tech';
          }
          
          // Find available username
          let finalUsername = baseUsername;
          let counter = 1;
          
          while (await isUsernameTaken(finalUsername)) {
            finalUsername = baseUsername + counter;
            counter++;
            if (counter > 99) break;
          }
          
          // Validate final username
          const validation = validateUsername(finalUsername);
          if (!validation.isValid) {
            const suggestions = await generateUsernameSuggestions(baseUsername);
            finalUsername = suggestions[0];
          }
          
          // Update technician
          const technicianRef = doc(db, 'technicians', technician.id);
          await updateDoc(technicianRef, {
            username: finalUsername
          });
          
          setOperationResults(prev => prev + `✅ ${technician.name} → ${finalUsername}\n`);
          results.push({ name: technician.name, username: finalUsername, status: 'success' });
          
          // Update local state
          setTechnicians(prev => 
            prev.map(t => t.id === technician.id ? { ...t, username: finalUsername } : t)
          );
          
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          const errorMsg = `❌ Failed to set username for ${technician.name}: ${error.message}\n`;
          setOperationResults(prev => prev + errorMsg);
          results.push({ name: technician.name, status: 'error', error: error.message });
        }
      }
      
      const successful = results.filter(r => r.status === 'success');
      setOperationResults(prev => prev + `\n🎉 Complete! Generated ${successful.length} usernames.\n`);
      
      // Update stats
      setStats(prev => ({
        ...prev,
        techniciansWithUsernames: prev.techniciansWithUsernames + successful.length
      }));
      
    } catch (error) {
      setOperationResults(prev => prev + `💥 Error: ${error.message}\n`);
    } finally {
      setIsGeneratingUsernames(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Admin Access Required</h1>
          <p className="text-slate-300 mb-6">
            This admin panel requires authentication as k00lrav@gmail.com using Google Sign-In.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors duration-200"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-300">Total Technicians</p>
              <p className="text-2xl font-bold text-white">{stats.totalTechnicians}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-300">Total Customers</p>
              <p className="text-2xl font-bold text-white">{stats.totalCustomers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-300">Total Transactions</p>
              <p className="text-2xl font-bold text-white">{stats.totalTransactions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-300">Total Revenue</p>
              <p className="text-2xl font-bold text-white">${stats.totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">Username Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Technicians with usernames:</span>
              <span className="text-white font-semibold">
                {stats.techniciansWithUsernames} / {stats.totalTechnicians}
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full" 
                style={{ width: `${(stats.techniciansWithUsernames / Math.max(stats.totalTechnicians, 1)) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Customers with usernames:</span>
              <span className="text-white font-semibold">
                {stats.customersWithUsernames} / {stats.totalCustomers}
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full" 
                style={{ width: `${(stats.customersWithUsernames / Math.max(stats.totalCustomers, 1)) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={generateUsernamesForAllTechnicians}
              disabled={isGeneratingUsernames}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {isGeneratingUsernames ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating Usernames...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Generate Missing Usernames
                </>
              )}
            </button>
            
            <button
              onClick={() => loadAdminData()}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      {operationResults && (
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">Operation Results</h3>
          <pre className="text-sm text-slate-300 whitespace-pre-wrap bg-black/20 p-4 rounded-lg overflow-auto max-h-64">
            {operationResults}
          </pre>
        </div>
      )}
    </div>
  );

  const renderTechnicians = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Technicians Management</h2>
        <span className="text-slate-300">{technicians.length} total technicians</span>
      </div>
      
      <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Username</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Tips</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {technicians.map((tech) => (
                <tr key={tech.id} className="hover:bg-white/5">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{tech.name}</div>
                    <div className="text-sm text-slate-300">{tech.businessName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {tech.username ? (
                      <span className="text-blue-400">@{tech.username}</span>
                    ) : (
                      <span className="text-red-400">No username</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    {tech.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    {tech.category || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {tech.totalTips || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">ThankATech Admin</h1>
                <p className="text-sm text-slate-300">Site Administration Panel</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-slate-300">Welcome, {user?.email}</span>
              <Link
                href="/dashboard"
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white/5 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-300 hover:text-white hover:border-white/30'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('technicians')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'technicians'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-300 hover:text-white hover:border-white/30'
              }`}
            >
              Technicians
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'customers'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-300 hover:text-white hover:border-white/30'
              }`}
            >
              Customers
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'technicians' && renderTechnicians()}
        {activeTab === 'customers' && (
          <div className="text-center py-8">
            <p className="text-slate-300">Customer management coming soon...</p>
          </div>
        )}
      </main>
    </div>
  );
}
