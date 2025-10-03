'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc,
  orderBy 
} from 'firebase/firestore';
import UniversalHeader from '@/components/UniversalHeader';
import { EmailTemplates } from '@/lib/email';
import { getUserTokenBalance, addTokensToBalance } from '@/lib/token-firebase';
// Remove the direct Firebase import - we'll use the custom API instead

// Types
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
  averageTip: number;
  activeTechnicians: number;
}

// Admin configuration
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@thankatech.com';

export default function AdminPage() {
  const router = useRouter();
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
    totalRevenue: 0,
    averageTip: 0,
    activeTechnicians: 0
  });
  
  // Operation states
  const [operationResults, setOperationResults] = useState<string>('');
  
  // Token management states
  const [tokenUserId, setTokenUserId] = useState('');
  const [tokensToAdd, setTokensToAdd] = useState<number>(0);
  const [tokenManagementResults, setTokenManagementResults] = useState('');
  const [isProcessingTokens, setIsProcessingTokens] = useState(false);
  const [userTokenBalances, setUserTokenBalances] = useState<{[key: string]: any}>({});
  
  // Password reset states
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetResults, setResetResults] = useState<string>('');
  const [resetEmail, setResetEmail] = useState<string>('');
  
  // Email testing states
  const [emailTestResults, setEmailTestResults] = useState<string>('');
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testEmailData, setTestEmailData] = useState({
    to: '',
    subject: 'Test Email from ThankATech Admin',
    message: 'This is a test email sent from the ThankATech admin panel.'
  });

  // Brevo status states
  const [brevoStatus, setBrevoStatus] = useState<any>(null);
  const [isCheckingBrevo, setIsCheckingBrevo] = useState(false);
  const [brevoError, setBrevoError] = useState<string>('');

  // Username utility functions
  const isUsernameTaken = async (username: string): Promise<boolean> => {
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
  };

  const validateUsername = (username: string): { isValid: boolean; error: string | null } => {
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
  };

  const checkAdminAccess = useCallback(async (user: any) => {
    try {
      // Check if user email matches admin email
      const isCorrectEmail = user.email?.toLowerCase() === ADMIN_EMAIL;
      
      // Check if user is authenticated via Google (Google provider ID)
      const isGoogleAuth = user.providerData?.some((provider: any) => 
        provider.providerId === 'google.com'
      );
      
      // Check if user is authenticated via email/password
      const isEmailAuth = user.providerData?.some((provider: any) => 
        provider.providerId === 'password'
      ) || user.providerData?.length === 0;
      
      // Admin can use either Google OR email/password authentication with correct email
      const isAdmin = isCorrectEmail && (isGoogleAuth || isEmailAuth);
      
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
  }, []);

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
  }, [checkAdminAccess]);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setIsAuthorized(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const loadAdminData = useCallback(async () => {
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
      
      // Calculate stats
      const averageTip = transactionSnapshot.size > 0 ? (totalRevenue / transactionSnapshot.size) / 100 : 0;
      const activeTechnicians = techData.filter(t => t.username).length;
      
      setStats({
        totalTechnicians: techData.length,
        totalCustomers: customerData.length,
        techniciansWithUsernames: techData.filter(t => t.username).length,
        customersWithUsernames: customerData.filter(c => c.username).length,
        totalTransactions: transactionSnapshot.size,
        totalRevenue: totalRevenue / 100, // Convert cents to dollars
        averageTip: averageTip,
        activeTechnicians: activeTechnicians
      });
      
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  }, []);

  // Token Management Functions
  const handleAddTokens = async () => {
    if (!tokenUserId || tokensToAdd <= 0) {
      setTokenManagementResults('❌ Please enter a valid user ID and token amount');
      return;
    }

    setIsProcessingTokens(true);
    try {
      await addTokensToBalance(tokenUserId, tokensToAdd, tokensToAdd * 0.1); // Assume $0.10 per token for admin grants
      setTokenManagementResults(`✅ Successfully added ${tokensToAdd} tokens to user ${tokenUserId}`);
      
      // Refresh user's token balance
      const balance = await getUserTokenBalance(tokenUserId);
      setUserTokenBalances(prev => ({ ...prev, [tokenUserId]: balance }));
      
      // Reset form
      setTokenUserId('');
      setTokensToAdd(0);
    } catch (error: any) {
      console.error('Error adding tokens:', error);
      setTokenManagementResults(`❌ Failed to add tokens: ${error.message}`);
    }
    setIsProcessingTokens(false);
  };

  const handleCheckUserBalance = async (userId: string) => {
    if (!userId) return;
    
    try {
      const balance = await getUserTokenBalance(userId);
      
      setUserTokenBalances(prev => ({ ...prev, [userId]: balance }));
      
      setTokenManagementResults(`✅ Retrieved data for user ${userId}:
      TOA: ${balance.tokens} (Total Purchased: ${balance.totalPurchased}, Total Spent: ${balance.totalSpent})`);
    } catch (error: any) {
      console.error('Error checking user balance:', error);
      setTokenManagementResults(`❌ Failed to check balance: ${error.message}`);
    }
  };

  // Send password reset email
  const handlePasswordReset = async () => {
    if (!resetEmail.trim()) {
      setResetResults('❌ Please enter an email address');
      return;
    }
    
    setIsSendingReset(true);
    setResetResults(`📧 Sending password reset email to: ${resetEmail}...\n`);
    
    try {
      // Use custom API endpoint that sends branded Brevo emails
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: resetEmail }),
      });

      const result = await response.json();
      
      if (result.success) {
        setResetResults(`🎉 Password reset sent!\n\n📋 ${result.message}\n\n✨ Sent using branded ThankATech email template via Brevo`);
      } else {
        setResetResults(`❌ Reset failed: ${result.message}`);
      }
    } catch (error: any) {
      setResetResults(`❌ Reset failed: ${error.message}`);
    }
    
    setIsSendingReset(false);
  };

  // Brevo status checking
  const checkBrevoStatus = async () => {
    if (isCheckingBrevo) return;
    
    setIsCheckingBrevo(true);
    setBrevoError('');
    
    try {
      const response = await fetch('/api/brevo-status');
      const data = await response.json();
      
      if (data.success) {
        setBrevoStatus(data.data);
      } else {
        setBrevoError(data.error || 'Failed to fetch Brevo status');
      }
    } catch (error: any) {
      setBrevoError(`Network error: ${error.message}`);
    } finally {
      setIsCheckingBrevo(false);
    }
  };

  // Email testing
  const testEmailDelivery = async () => {
    if (isTestingEmail) return;
    
    setIsTestingEmail(true);
    setEmailTestResults('Testing email delivery...\n');
    
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(testEmailData.to)) {
        setEmailTestResults(prev => prev + '❌ Invalid email address format\n');
        return;
      }
      
      setEmailTestResults(prev => prev + `📧 Sending test email to: ${testEmailData.to}\n`);
      
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: testEmailData.to,
          subject: `[ADMIN TEST] ${testEmailData.subject}`,
          message: testEmailData.message + '\n\n--- ADMIN TEST EMAIL ---\nThis is a test email sent from the ThankATech admin panel.'
        }),
      });
      
      if (response.ok) {
        setEmailTestResults(prev => prev + '✅ Email sent successfully!\n');
      } else {
        const errorData = await response.json();
        setEmailTestResults(prev => prev + `❌ Email sending failed: ${errorData.message || response.statusText}\n`);
      }
      
    } catch (error: any) {
      setEmailTestResults(prev => prev + `💥 Error: ${error.message}\n`);
    } finally {
      setIsTestingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
            <h1 className="text-2xl font-bold text-white mb-4">🔒 Admin Access Required</h1>
            <p className="text-blue-200 mb-6">Please sign in with admin credentials to access this page.</p>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Platform Status Header */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-lg rounded-lg p-6 border border-white/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Platform Overview</h2>
            <p className="text-blue-200">ThankATech Administration Dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400 font-medium">System Online</span>
          </div>
        </div>
      </div>

      {/* Core Platform Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-300 text-sm font-medium">Total Technicians</p>
              <p className="text-white text-3xl font-bold">{stats.totalTechnicians}</p>
            </div>
            <div className="bg-blue-500/20 p-3 rounded-lg">
              <span className="text-2xl">🔧</span>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-300 text-sm font-medium">Total Customers</p>
              <p className="text-white text-3xl font-bold">{stats.totalCustomers}</p>
            </div>
            <div className="bg-green-500/20 p-3 rounded-lg">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-300 text-sm font-medium">Total Transactions</p>
              <p className="text-white text-3xl font-bold">{stats.totalTransactions}</p>
            </div>
            <div className="bg-purple-500/20 p-3 rounded-lg">
              <span className="text-2xl">💳</span>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-300 text-sm font-medium">Total Revenue</p>
              <p className="text-white text-3xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
            </div>
            <div className="bg-yellow-500/20 p-3 rounded-lg">
              <span className="text-2xl">💰</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Token Management */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
          <h3 className="text-lg font-bold text-white mb-4">🪙 Token Management</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">User ID</label>
              <input
                type="text"
                value={tokenUserId}
                onChange={(e) => setTokenUserId(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                placeholder="Enter user ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Tokens to Add</label>
              <input
                type="number"
                value={tokensToAdd}
                onChange={(e) => setTokensToAdd(parseInt(e.target.value) || 0)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                placeholder="Number of tokens"
                min="0"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddTokens}
                disabled={isProcessingTokens}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 text-white py-2 px-4 rounded-lg transition-colors"
              >
                {isProcessingTokens ? 'Adding...' : 'Add Tokens'}
              </button>
              <button
                onClick={() => handleCheckUserBalance(tokenUserId)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Check Balance
              </button>
            </div>
          </div>
        </div>

        {/* Password Reset */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
          <h3 className="text-lg font-bold text-white mb-4">🔐 Password Reset</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                placeholder="user@example.com"
              />
            </div>
            <button
              onClick={handlePasswordReset}
              disabled={isSendingReset}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-900 text-white py-2 px-4 rounded-lg transition-colors"
            >
              {isSendingReset ? 'Sending...' : 'Send Password Reset'}
            </button>
          </div>
        </div>

        {/* Brevo SMTP Status */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
          <h3 className="text-lg font-bold text-white mb-4">📊 Brevo SMTP Status</h3>
          <div className="space-y-4">
            <button
              onClick={checkBrevoStatus}
              disabled={isCheckingBrevo}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 text-white py-2 px-4 rounded-lg transition-colors"
            >
              {isCheckingBrevo ? 'Checking...' : 'Check Brevo Status'}
            </button>
            
            {brevoError && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-200 text-sm">❌ {brevoError}</p>
              </div>
            )}
            
            {brevoStatus && (
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                <div className="space-y-2 text-sm">
                  <h4 className="font-semibold text-green-200">Account Information:</h4>
                  <p className="text-green-100">📧 Email: {brevoStatus.account?.email || 'N/A'}</p>
                  <p className="text-green-100">👤 Name: {brevoStatus.account?.firstName} {brevoStatus.account?.lastName}</p>
                  <p className="text-green-100">🏢 Company: {brevoStatus.account?.companyName || 'N/A'}</p>
                  <p className="text-green-100">📋 Plan: {brevoStatus.account?.plan || 'N/A'}</p>
                  <p className="text-green-100">💳 Credits: {brevoStatus.account?.credits || 'N/A'}</p>
                  
                  {brevoStatus.senders && brevoStatus.senders.senders && (
                    <div className="mt-3">
                      <h4 className="font-semibold text-green-200">Verified Senders:</h4>
                      {brevoStatus.senders.senders.map((sender: any, index: number) => (
                        <p key={index} className="text-green-100">✅ {sender.email} ({sender.name})</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Email Testing */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
          <h3 className="text-lg font-bold text-white mb-4">📧 Email Testing</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Test Email</label>
              <input
                type="email"
                value={testEmailData.to}
                onChange={(e) => setTestEmailData(prev => ({ ...prev, to: e.target.value }))}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                placeholder="test@example.com"
              />
            </div>
            <button
              onClick={testEmailDelivery}
              disabled={isTestingEmail}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 text-white py-2 px-4 rounded-lg transition-colors"
            >
              {isTestingEmail ? 'Sending...' : 'Send Test Email'}
            </button>
          </div>
        </div>
      </div>

      {/* Results Display */}
      {(operationResults || tokenManagementResults || resetResults || emailTestResults) && (
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
          <h3 className="text-lg font-bold text-white mb-4">📋 Operation Results</h3>
          <div className="bg-black/30 rounded-lg p-4 font-mono text-sm text-green-400 whitespace-pre-wrap max-h-96 overflow-y-auto">
            {operationResults || tokenManagementResults || resetResults || emailTestResults}
          </div>
        </div>
      )}
    </div>
  );

  const renderTechnicians = () => (
    <div className="space-y-6">
      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
        <h2 className="text-xl font-bold text-white mb-4">👨‍🔧 Technicians Management</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/20">
                <th className="pb-3 text-slate-300 font-medium">Name</th>
                <th className="pb-3 text-slate-300 font-medium">Email</th>
                <th className="pb-3 text-slate-300 font-medium">Username</th>
                <th className="pb-3 text-slate-300 font-medium">Category</th>
                <th className="pb-3 text-slate-300 font-medium">Points</th>
              </tr>
            </thead>
            <tbody>
              {technicians.slice(0, 20).map((tech) => (
                <tr key={tech.id} className="border-b border-white/10">
                  <td className="py-3 text-white">{tech.name}</td>
                  <td className="py-3 text-slate-300">{tech.email}</td>
                  <td className="py-3 text-blue-400">{tech.username || 'Not set'}</td>
                  <td className="py-3 text-slate-300">{tech.category || 'General'}</td>
                  <td className="py-3 text-green-400">{tech.points || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderCustomers = () => (
    <div className="space-y-6">
      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
        <h2 className="text-xl font-bold text-white mb-4">👥 Customers Management</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/20">
                <th className="pb-3 text-slate-300 font-medium">Name</th>
                <th className="pb-3 text-slate-300 font-medium">Email</th>
                <th className="pb-3 text-slate-300 font-medium">Username</th>
                <th className="pb-3 text-slate-300 font-medium">Tips Sent</th>
                <th className="pb-3 text-slate-300 font-medium">Total Spent</th>
              </tr>
            </thead>
            <tbody>
              {customers.slice(0, 20).map((customer) => (
                <tr key={customer.id} className="border-b border-white/10">
                  <td className="py-3 text-white">{customer.name}</td>
                  <td className="py-3 text-slate-300">{customer.email}</td>
                  <td className="py-3 text-blue-400">{customer.username || 'Not set'}</td>
                  <td className="py-3 text-green-400">{customer.totalTipsSent || 0}</td>
                  <td className="py-3 text-yellow-400">${(customer.totalSpent || 0).toFixed(2)}</td>
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
      {/* Beautiful Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-blue-700/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-500/20 to-blue-800/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-blue-300/10 to-blue-600/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <UniversalHeader 
        currentUser={user ? {
          id: user.uid,
          name: user.displayName || 'Admin',
          email: user.email || '',
          photoURL: user.photoURL || undefined,
          userType: 'admin'
        } : undefined}
        onSignOut={handleSignOut}
      />
      
      <main className="relative max-w-7xl mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-2 border border-white/20 inline-flex">
            {[
              { id: 'overview', label: '📊 Overview', icon: '📊' },
              { id: 'technicians', label: '🔧 Technicians', icon: '🔧' },
              { id: 'customers', label: '👥 Customers', icon: '👥' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'technicians' && renderTechnicians()}
        {activeTab === 'customers' && renderCustomers()}
      </main>
    </div>
  );
}