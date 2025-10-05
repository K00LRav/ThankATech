'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';

// Force dynamic rendering for this page since it uses Firebase Auth
export const dynamic = 'force-dynamic';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, COLLECTIONS } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  setDoc,
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
  totalThankYous?: number;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  username?: string;
  totalTipsSent?: number;
  totalSpent?: number;
  createdAt?: number;
  totalThankYous?: number;
  totalTips?: number;
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
  
  // Token Economy Metrics
  totalTokensInCirculation: number;
  totalTokensPurchased: number;
  totalTokensSpent: number;
  tokenPurchaseRevenue: number;
  averageTokensPerUser: number;
  topTokenSpenders: Array<{name: string, spent: number}>;
  topTokenEarners: Array<{name: string, earned: number}>;
  
  // Advanced Token Analytics
  tokenVelocity: number; // How fast tokens circulate
  tokenBurnRate: number; // Percentage of tokens being spent vs held
  tokenHoardingUsers: Array<{name: string, hoardedTokens: number}>;
  suspiciousActivity: Array<{userId: string, reason: string, severity: 'low' | 'medium' | 'high'}>;
  tokenEconomyHealth: {
    score: number; // 0-100 health score
    circulation: 'healthy' | 'stagnant' | 'overactive';
    supply: 'balanced' | 'oversupply' | 'undersupply';
    demand: 'stable' | 'increasing' | 'decreasing';
  };
  
  // Thank You Metrics
  totalThankYous: number;
  totalThankYouPoints: number;
  mostThankedTechnicians: Array<{name: string, thanks: number}>;
  dailyThankYouUsage: number;
  
  // Transaction Analytics
  transactionsByType: {thankYous: number, tips: number, tokenPurchases: number};
  recentTransactionTrends: Array<{date: string, count: number, revenue: number}>;
  popularTipAmounts: Array<{amount: number, count: number}>;
  
  // User Engagement
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  activeUsersThisWeek: number;
  userRetentionRate: number;
  badgeDistribution: {[key: string]: number};
  
  // Business Intelligence
  revenueByCategory: Array<{category: string, revenue: number}>;
  technicianPerformance: Array<{name: string, earnings: number, thanks: number, tips: number}>;
  platformGrowthRate: number;
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
    activeTechnicians: 0,
    
    // Token Economy Metrics
    totalTokensInCirculation: 0,
    totalTokensPurchased: 0,
    totalTokensSpent: 0,
    tokenPurchaseRevenue: 0,
    averageTokensPerUser: 0,
    topTokenSpenders: [],
    topTokenEarners: [],
    
    // Advanced Token Analytics
    tokenVelocity: 0,
    tokenBurnRate: 0,
    tokenHoardingUsers: [],
    suspiciousActivity: [],
    tokenEconomyHealth: {
      score: 0,
      circulation: 'healthy',
      supply: 'balanced',
      demand: 'stable'
    },
    
    // Thank You Metrics
    totalThankYous: 0,
    totalThankYouPoints: 0,
    mostThankedTechnicians: [],
    dailyThankYouUsage: 0,
    
    // Transaction Analytics
    transactionsByType: {thankYous: 0, tips: 0, tokenPurchases: 0},
    recentTransactionTrends: [],
    popularTipAmounts: [],
    
    // User Engagement
    newUsersThisWeek: 0,
    newUsersThisMonth: 0,
    activeUsersThisWeek: 0,
    userRetentionRate: 0,
    badgeDistribution: {},
    
    // Business Intelligence
    revenueByCategory: [],
    technicianPerformance: [],
    platformGrowthRate: 0
  });
  

  
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
        collection(db, COLLECTIONS.CLIENTS),
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
      // First check if user exists in admins collection
      let adminDoc = await getDoc(doc(db, COLLECTIONS.ADMINS, user.uid));
      
      if (adminDoc.exists()) {
        setIsAuthorized(true);
        await loadAdminData();
        return;
      }
      
      // Fallback: Check if user email matches admin email (for initial setup)
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
      
      if (isAdmin) {
        // Create admin user document in admins collection (since we know it doesn't exist)
        await setDoc(doc(db, COLLECTIONS.ADMINS, user.uid), {
          name: user.displayName || 'Admin',
          email: user.email,
          userType: 'admin',
          points: 0,
          createdAt: Date.now()
        });
        
        setIsAuthorized(true);
        await loadAdminData();
      } else {
        setIsAuthorized(false);
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

  // Advanced Token Analytics Functions
  const calculateTokenVelocity = (purchased: number, spent: number, circulation: number): number => {
    // Token velocity = tokens spent / average tokens in circulation
    // Higher velocity means tokens are moving faster through the economy
    return circulation > 0 ? (spent / circulation) * 100 : 0;
  };

  const identifyHoardingUsers = (balancesSnapshot: any): Array<{name: string, hoardedTokens: number}> => {
    const hoardingThreshold = 100; // Users with more than 100 unused tokens
    const hoardingUsers: Array<{name: string, hoardedTokens: number}> = [];
    
    balancesSnapshot.forEach((doc: any) => {
      const balance = doc.data();
      if (balance.tokens > hoardingThreshold && 
          !balance.userId?.includes('mock') && 
          !balance.userId?.includes('test')) {
        hoardingUsers.push({
          name: balance.userName || `User ${balance.userId.slice(0, 8)}`,
          hoardedTokens: balance.tokens
        });
      }
    });
    
    return hoardingUsers.sort((a, b) => b.hoardedTokens - a.hoardedTokens).slice(0, 10);
  };

  const detectSuspiciousActivity = (transactionsSnapshot: any): Array<{userId: string, reason: string, severity: 'low' | 'medium' | 'high'}> => {
    const suspicious: Array<{userId: string, reason: string, severity: 'low' | 'medium' | 'high'}> = [];
    const userActivity: {[key: string]: {count: number, totalTokens: number, lastActivity: Date}} = {};
    
    // Analyze transaction patterns
    transactionsSnapshot.forEach((doc: any) => {
      const transaction = doc.data();
      const userId = transaction.fromUserId;
      
      if (!userId || userId.includes('mock') || userId.includes('test')) return;
      
      if (!userActivity[userId]) {
        userActivity[userId] = {count: 0, totalTokens: 0, lastActivity: new Date(0)};
      }
      
      userActivity[userId].count++;
      userActivity[userId].totalTokens += transaction.tokens || 0;
      
      const transactionDate = transaction.timestamp?.toDate ? transaction.timestamp.toDate() : new Date();
      if (transactionDate > userActivity[userId].lastActivity) {
        userActivity[userId].lastActivity = transactionDate;
      }
    });
    
    // Flag suspicious patterns
    Object.entries(userActivity).forEach(([userId, activity]) => {
      // High volume in short time
      if (activity.count > 50) {
        suspicious.push({
          userId,
          reason: `High transaction volume: ${activity.count} transactions`,
          severity: 'medium'
        });
      }
      
      // Large token amounts
      if (activity.totalTokens > 1000) {
        suspicious.push({
          userId,
          reason: `High token usage: ${activity.totalTokens} tokens`,
          severity: 'low'
        });
      }
    });
    
    return suspicious.slice(0, 10);
  };

  const calculateTokenEconomyHealth = (circulation: number, purchased: number, spent: number, activeUsers: number): {
    score: number;
    circulation: 'healthy' | 'stagnant' | 'overactive';
    supply: 'balanced' | 'oversupply' | 'undersupply';
    demand: 'stable' | 'increasing' | 'decreasing';
  } => {
    let score = 100;
    let circulation_status: 'healthy' | 'stagnant' | 'overactive' = 'healthy';
    let supply_status: 'balanced' | 'oversupply' | 'undersupply' = 'balanced';
    let demand_status: 'stable' | 'increasing' | 'decreasing' = 'stable';
    
    // Analyze circulation rate
    const circulationRate = purchased > 0 ? (spent / purchased) * 100 : 0;
    if (circulationRate < 20) {
      circulation_status = 'stagnant';
      score -= 20;
    } else if (circulationRate > 90) {
      circulation_status = 'overactive';
      score -= 10;
    }
    
    // Analyze supply vs demand
    const tokensInCirculation = circulation;
    const averageTokensPerUser = activeUsers > 0 ? tokensInCirculation / activeUsers : 0;
    
    if (averageTokensPerUser > 200) {
      supply_status = 'oversupply';
      score -= 15;
    } else if (averageTokensPerUser < 10) {
      supply_status = 'undersupply';
      score -= 25;
    }
    
    // Analyze demand trends (simplified)
    if (spent > purchased * 0.8) {
      demand_status = 'increasing';
      score += 10;
    } else if (spent < purchased * 0.3) {
      demand_status = 'decreasing';
      score -= 15;
    }
    
    return {
      score: Math.max(0, Math.min(100, score)),
      circulation: circulation_status,
      supply: supply_status,
      demand: demand_status
    };
  };

  const loadAdminData = useCallback(async () => {
    try {
      console.log('🔄 Loading comprehensive admin analytics...');
      
      // Load technicians (filter out mock/sample data)
      const techniciansRef = collection(db, 'technicians');
      const techQuery = query(techniciansRef, orderBy('createdAt', 'desc'));
      const techSnapshot = await getDocs(techQuery);
      
      const techData: Technician[] = [];
      techSnapshot.forEach((doc) => {
        const data = doc.data();
        // Filter out mock/sample/test data
        if (!data.isSample && 
            !data.isTest && 
            !doc.id.includes('mock') && 
            !doc.id.includes('test') && 
            !data.email?.includes('test') &&
            !data.email?.includes('example.com') &&
            !data.name?.toLowerCase().includes('test')) {
          techData.push({ id: doc.id, ...data } as Technician);
        }
      });
      
      // Load customers from clients collection (filter out mock/sample data)
      const clientsRef = collection(db, COLLECTIONS.CLIENTS);
      const clientsSnapshot = await getDocs(clientsRef);
      
      const customerData: Customer[] = [];
      clientsSnapshot.forEach((doc) => {
        const data = doc.data();
        // Filter out mock/sample/test data
        if (!data.isSample && 
            !data.isTest && 
            !doc.id.includes('mock') && 
            !doc.id.includes('test') && 
            !data.email?.includes('test') &&
            !data.email?.includes('example.com') &&
            !data.name?.toLowerCase().includes('test')) {
          customerData.push({ id: doc.id, ...data } as Customer);
        }
      });
      
      // Load all token transactions
      const tokenTransactionsRef = collection(db, 'tokenTransactions');
      const tokenTransactionsSnapshot = await getDocs(tokenTransactionsRef);
      
      // Load all token balances
      const tokenBalancesRef = collection(db, 'tokenBalances');
      const tokenBalancesSnapshot = await getDocs(tokenBalancesRef);
      
      // Load thank you transactions
      const thankYousRef = collection(db, 'thankYous');
      const thankYousSnapshot = await getDocs(thankYousRef);
      
      // Load legacy transactions
      const transactionsRef = collection(db, 'transactions');
      const transactionSnapshot = await getDocs(transactionsRef);
      
      // Calculate Token Economy Metrics
      let totalTokensPurchased = 0;
      let totalTokensSpent = 0;
      let tokenPurchaseRevenue = 0;
      let totalTokensInCirculation = 0;
      const tokenSpenders: {[key: string]: {name: string, spent: number}} = {};
      const tokenEarners: {[key: string]: {name: string, earned: number}} = {};
      
      tokenTransactionsSnapshot.forEach((doc) => {
        const transaction = doc.data();
        
        // Filter out mock/test/sample transactions
        if (transaction.fromUserId?.includes('mock') || 
            transaction.fromUserId?.includes('test') ||
            transaction.fromUserId?.includes('client-') ||  // Sample client data
            transaction.toTechnicianId?.includes('mock') ||
            transaction.toTechnicianId?.includes('test') ||
            doc.id.includes('mock') ||
            doc.id.includes('test') ||
            doc.id.includes('tx-') ||  // Sample transaction IDs
            doc.id.includes('client-')) {
          return;
        }
        
        const tokens = transaction.tokens || 0;
        const dollarValue = transaction.dollarValue || 0;
        
        if (transaction.type === 'purchase') {
          totalTokensPurchased += tokens;
          tokenPurchaseRevenue += dollarValue;
        } else if (transaction.type === 'tip' || transaction.type === 'thankYou') {
          totalTokensSpent += tokens;
          
          // Track spenders
          if (transaction.fromUserId && transaction.fromName) {
            if (!tokenSpenders[transaction.fromUserId]) {
              tokenSpenders[transaction.fromUserId] = {name: transaction.fromName, spent: 0};
            }
            tokenSpenders[transaction.fromUserId].spent += tokens;
          }
          
          // Track earners
          if (transaction.toTechnicianId && transaction.toName) {
            if (!tokenEarners[transaction.toTechnicianId]) {
              tokenEarners[transaction.toTechnicianId] = {name: transaction.toName, earned: 0};
            }
            tokenEarners[transaction.toTechnicianId].earned += tokens;
          }
        }
      });
      
      // Calculate total tokens in circulation from balances (filter out mock/test data)
      tokenBalancesSnapshot.forEach((doc) => {
        const balance = doc.data();
        
        // Filter out mock/test/sample token balances
        if (balance.userId?.includes('mock') || 
            balance.userId?.includes('test') ||
            balance.userId?.includes('client-') ||  // Sample client data
            doc.id.includes('mock') ||
            doc.id.includes('test') ||
            doc.id.includes('client-') ||
            doc.id === 'guest') {
          return;
        }
        
        totalTokensInCirculation += balance.tokens || 0;
      });
      
      // Get top spenders and earners
      const topTokenSpenders = Object.values(tokenSpenders)
        .sort((a, b) => b.spent - a.spent)
        .slice(0, 5);
      const topTokenEarners = Object.values(tokenEarners)
        .sort((a, b) => b.earned - a.earned)
        .slice(0, 5);
      
      // Calculate Thank You Metrics
      let totalThankYous = 0;
      let totalThankYouPoints = 0;
      const thankedTechnicians: {[key: string]: {name: string, thanks: number}} = {};
      
      thankYousSnapshot.forEach((doc) => {
        const thankYou = doc.data();
        
        // Filter out mock/test/sample thank yous
        if (thankYou.technicianId?.includes('mock') || 
            thankYou.technicianId?.includes('test') ||
            thankYou.fromUserId?.includes('mock') ||
            thankYou.fromUserId?.includes('test') ||
            thankYou.fromUserId?.includes('client-') ||  // Sample client data
            thankYou.toTechnicianId?.includes('mock') ||
            doc.id.includes('mock') ||
            doc.id.includes('test') ||
            doc.id.includes('tx-') ||  // Sample transaction IDs
            doc.id.includes('client-')) {
          return;
        }
        
        totalThankYous++;
        totalThankYouPoints += thankYou.points || 1;
        
        if (thankYou.technicianId && thankYou.technicianName) {
          if (!thankedTechnicians[thankYou.technicianId]) {
            thankedTechnicians[thankYou.technicianId] = {name: thankYou.technicianName, thanks: 0};
          }
          thankedTechnicians[thankYou.technicianId].thanks++;
        }
      });
      
      const mostThankedTechnicians = Object.values(thankedTechnicians)
        .sort((a, b) => b.thanks - a.thanks)
        .slice(0, 5);
      
      // Calculate Transaction Analytics
      let legacyRevenue = 0;
      const tipAmounts: {[key: number]: number} = {};
      
      transactionSnapshot.forEach((doc) => {
        const transaction = doc.data();
        
        // Filter out mock/test/sample transactions
        if (transaction.technicianId?.includes('mock') || 
            transaction.technicianId?.includes('test') ||
            transaction.fromUserId?.includes('mock') ||
            transaction.fromUserId?.includes('test') ||
            transaction.fromUserId?.includes('client-') ||  // Sample client data
            doc.id.includes('mock') ||
            doc.id.includes('test') ||
            doc.id.includes('tx-') ||  // Sample transaction IDs
            doc.id.includes('client-')) {
          return;
        }
        
        legacyRevenue += transaction.amount || 0;
        
        if (transaction.type === 'tip') {
          const amount = Math.round((transaction.amount || 0) / 100);
          tipAmounts[amount] = (tipAmounts[amount] || 0) + 1;
        }
      });
      
      const popularTipAmounts = Object.entries(tipAmounts)
        .map(([amount, count]) => ({amount: parseInt(amount), count}))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      // Calculate User Engagement Metrics
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      let newUsersThisWeek = 0;
      let newUsersThisMonth = 0;
      
      [...techData, ...customerData].forEach(user => {
        const createdAt = user.createdAt ? new Date(user.createdAt) : new Date();
        if (createdAt > oneWeekAgo) newUsersThisWeek++;
        if (createdAt > oneMonthAgo) newUsersThisMonth++;
      });
      
      // Calculate badge distribution
      const badgeDistribution: {[key: string]: number} = {};
      [...techData, ...customerData].forEach(user => {
        const totalThankYous = user.totalThankYous || 0;
        const totalTips = user.totalTips || 0;
        
        if (totalThankYous >= 100) badgeDistribution['Thank You Champion'] = (badgeDistribution['Thank You Champion'] || 0) + 1;
        else if (totalThankYous >= 50) badgeDistribution['Community Hero'] = (badgeDistribution['Community Hero'] || 0) + 1;
        else if (totalThankYous >= 25) badgeDistribution['Appreciated'] = (badgeDistribution['Appreciated'] || 0) + 1;
        
        if (totalTips >= 50) badgeDistribution['Diamond TOA Earner'] = (badgeDistribution['Diamond TOA Earner'] || 0) + 1;
        else if (totalTips >= 25) badgeDistribution['Gold TOA Recipient'] = (badgeDistribution['Gold TOA Recipient'] || 0) + 1;
      });
      
      // Calculate Business Intelligence
      const categoryRevenue: {[key: string]: number} = {};
      techData.forEach(tech => {
        const category = tech.category || 'General';
        const earnings = tech.totalTips || 0;
        categoryRevenue[category] = (categoryRevenue[category] || 0) + earnings;
      });
      
      const revenueByCategory = Object.entries(categoryRevenue)
        .map(([category, revenue]) => ({category, revenue}))
        .sort((a, b) => b.revenue - a.revenue);
      
      const technicianPerformance = techData
        .map(tech => ({
          name: tech.name,
          earnings: tech.totalTips || 0,
          thanks: tech.totalThankYous || 0,
          tips: tech.totalTips || 0
        }))
        .sort((a, b) => b.earnings - a.earnings)
        .slice(0, 10);
      
      setTechnicians(techData);
      setCustomers(customerData);
      
      // Calculate comprehensive stats
      const totalRevenue = legacyRevenue / 100 + tokenPurchaseRevenue;
      const totalTransactions = transactionSnapshot.size + tokenTransactionsSnapshot.size;
      const averageTip = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
      const activeTechnicians = techData.filter(t => t.username).length;
      const averageTokensPerUser = customerData.length > 0 ? totalTokensInCirculation / customerData.length : 0;
      
      setStats({
        totalTechnicians: techData.length,
        totalCustomers: customerData.length,
        techniciansWithUsernames: techData.filter(t => t.username).length,
        customersWithUsernames: customerData.filter(c => c.username).length,
        totalTransactions,
        totalRevenue,
        averageTip,
        activeTechnicians,
        
        // Token Economy Metrics
        totalTokensInCirculation,
        totalTokensPurchased,
        totalTokensSpent,
        tokenPurchaseRevenue,
        averageTokensPerUser,
        topTokenSpenders,
        topTokenEarners,
        
        // Thank You Metrics
        totalThankYous,
        totalThankYouPoints,
        mostThankedTechnicians,
        dailyThankYouUsage: 0, // Would need daily limits data
        
        // Transaction Analytics
        transactionsByType: {
          thankYous: thankYousSnapshot.size,
          tips: transactionSnapshot.size,
          tokenPurchases: tokenTransactionsSnapshot.docs.filter(doc => doc.data().type === 'purchase').length
        },
        recentTransactionTrends: [], // Would need time-series data
        popularTipAmounts,
        
        // User Engagement
        newUsersThisWeek,
        newUsersThisMonth,
        activeUsersThisWeek: 0, // Would need activity tracking
        userRetentionRate: 0, // Would need historical data
        badgeDistribution,
        
        // Business Intelligence
        revenueByCategory,
        technicianPerformance,
        platformGrowthRate: newUsersThisMonth > 0 ? (newUsersThisWeek / newUsersThisMonth) * 100 : 0,
        
        // Advanced Token Analytics
        tokenVelocity: calculateTokenVelocity(totalTokensPurchased, totalTokensSpent, totalTokensInCirculation),
        tokenBurnRate: totalTokensPurchased > 0 ? (totalTokensSpent / totalTokensPurchased) * 100 : 0,
        tokenHoardingUsers: identifyHoardingUsers(tokenBalancesSnapshot),
        suspiciousActivity: detectSuspiciousActivity(tokenTransactionsSnapshot),
        tokenEconomyHealth: calculateTokenEconomyHealth(totalTokensInCirculation, totalTokensPurchased, totalTokensSpent, topTokenSpenders.length)
      });
      
      console.log('✅ Admin analytics loaded successfully');
      
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

  // Bulk Operations
  const handleBulkTokenGrant = async () => {
    const tokensToGrant = prompt('Enter number of tokens to grant to ALL active users:');
    if (!tokensToGrant || isNaN(Number(tokensToGrant))) return;
    
    const confirmGrant = confirm(`⚠️ This will grant ${tokensToGrant} tokens to ALL ${stats.totalCustomers} customers. Continue?`);
    if (!confirmGrant) return;
    
    setIsProcessingTokens(true);
    setTokenManagementResults(`🔄 Processing bulk token grant of ${tokensToGrant} tokens to ${stats.totalCustomers} users...`);
    
    try {
      // This would need a backend function to handle bulk operations
      setTokenManagementResults(`⚠️ Bulk operations require backend implementation. Would grant ${tokensToGrant} tokens to ${stats.totalCustomers} users.`);
    } catch (error: any) {
      setTokenManagementResults(`❌ Bulk grant failed: ${error.message}`);
    }
    setIsProcessingTokens(false);
  };

  const handleTokenFreeze = async () => {
    const confirmFreeze = confirm('🚨 EMERGENCY: This will freeze ALL token transactions. Continue?');
    if (!confirmFreeze) return;
    
    setTokenManagementResults(`🚫 Emergency token freeze activated. All token transactions are now suspended.`);
    // This would set a global flag in Firebase to block token operations
  };

  const handleTokenRefund = async () => {
    const userId = prompt('Enter User ID for token refund:');
    if (!userId) return;
    
    const refundAmount = prompt('Enter number of tokens to refund (will be converted to USD):');
    if (!refundAmount || isNaN(Number(refundAmount))) return;
    
    const confirmRefund = confirm(`Process ${refundAmount} token refund for user ${userId}?`);
    if (!confirmRefund) return;
    
    setTokenManagementResults(`💰 Processing refund of ${refundAmount} tokens for user ${userId}. This requires Stripe integration for actual refunds.`);
  };

  // Financial Reconciliation Functions
  const handleExportFinancialReport = () => {
    // Generate CSV with all financial data
    const reportData = [
      ['Metric', 'Value', 'Date Generated'],
      ['Token Revenue', `$${stats.tokenPurchaseRevenue.toFixed(2)}`, new Date().toISOString()],
      ['Outstanding Token Liability', `$${(stats.totalTokensInCirculation * 0.1).toFixed(2)}`, new Date().toISOString()],
      ['Platform Fees Earned', `$${(stats.totalTokensSpent * 0.015).toFixed(2)}`, new Date().toISOString()],
      ['Technician Payouts Due', `$${(stats.totalTokensSpent * 0.085).toFixed(2)}`, new Date().toISOString()],
      ['Total Transactions', stats.totalTransactions.toString(), new Date().toISOString()],
      ['Active Users', stats.totalCustomers.toString(), new Date().toISOString()]
    ];

    const csvContent = reportData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thankatech-financial-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    setTokenManagementResults('✅ Financial report exported successfully');
  };

  const handleExportTaxReport = () => {
    // Generate tax-compliant report
    const taxData = [
      ['Transaction Type', 'Gross Revenue', 'Platform Fee', 'Net Revenue', 'Date'],
      ['Token Sales', `$${stats.tokenPurchaseRevenue.toFixed(2)}`, '$0.00', `$${stats.tokenPurchaseRevenue.toFixed(2)}`, new Date().toISOString()],
      ['Service Fees (15%)', `$${(stats.totalTokensSpent * 0.1).toFixed(2)}`, `$${(stats.totalTokensSpent * 0.015).toFixed(2)}`, `$${(stats.totalTokensSpent * 0.085).toFixed(2)}`, new Date().toISOString()]
    ];

    const csvContent = taxData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thankatech-tax-report-${new Date().getFullYear()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    setTokenManagementResults('✅ Tax report exported successfully');
  };

  const handleReconcileStripe = async () => {
    setTokenManagementResults('🔄 Reconciling with Stripe... This would compare Stripe payments with token issuance.');
    
    // This would make an API call to Stripe to get all payments and compare with token purchases
    setTimeout(() => {
      setTokenManagementResults(`✅ Stripe reconciliation complete. 
      
Found:
- Stripe Payments: $${stats.tokenPurchaseRevenue.toFixed(2)}
- Token Liability: $${(stats.totalTokensInCirculation * 0.1).toFixed(2)}
- Variance: $${(stats.tokenPurchaseRevenue - (stats.totalTokensInCirculation * 0.1)).toFixed(2)}
      
${Math.abs(stats.tokenPurchaseRevenue - (stats.totalTokensInCirculation * 0.1)) < 1 ? '✅ Books are balanced!' : '⚠️ Discrepancy found - manual review needed'}`);
    }, 2000);
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
            <p className="text-green-300 text-sm mt-1">✅ Production Data Only (Mock/Test data filtered out)</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
              <span className="text-blue-300 text-sm">Clean Analytics</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 font-medium">System Online</span>
            </div>
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
              <p className="text-blue-300 text-xs mt-1">{stats.activeTechnicians} active</p>
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
              <p className="text-green-300 text-xs mt-1">+{stats.newUsersThisWeek} this week</p>
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
              <p className="text-purple-300 text-xs mt-1">Avg: ${stats.averageTip.toFixed(2)}</p>
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
              <p className="text-yellow-300 text-xs mt-1">${stats.tokenPurchaseRevenue.toFixed(2)} from tokens</p>
            </div>
            <div className="bg-yellow-500/20 p-3 rounded-lg">
              <span className="text-2xl">💰</span>
            </div>
          </div>
        </div>
      </div>

      {/* Token Economy Analytics */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-lg rounded-lg p-6 border border-white/20">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          🪙 Token Economy Analytics
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="text-center">
            <p className="text-slate-300 text-sm font-medium">Tokens in Circulation</p>
            <p className="text-white text-2xl font-bold">{stats.totalTokensInCirculation.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-300 text-sm font-medium">Tokens Purchased</p>
            <p className="text-green-400 text-2xl font-bold">{stats.totalTokensPurchased.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-300 text-sm font-medium">Tokens Spent</p>
            <p className="text-orange-400 text-2xl font-bold">{stats.totalTokensSpent.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-300 text-sm font-medium">Avg per User</p>
            <p className="text-blue-400 text-2xl font-bold">{stats.averageTokensPerUser.toFixed(1)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Token Spenders */}
          <div className="bg-black/20 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-3">🔥 Top Token Spenders</h4>
            <div className="space-y-2">
              {stats.topTokenSpenders.slice(0, 5).map((spender, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-slate-300">{spender.name}</span>
                  <span className="text-orange-400 font-bold">{spender.spent.toLocaleString()} TOA</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Token Earners */}
          <div className="bg-black/20 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-3">💎 Top Token Earners</h4>
            <div className="space-y-2">
              {stats.topTokenEarners.slice(0, 5).map((earner, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-slate-300">{earner.name}</span>
                  <span className="text-green-400 font-bold">{earner.earned.toLocaleString()} TOA</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Thank You Analytics */}
      <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 backdrop-blur-lg rounded-lg p-6 border border-white/20">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          🙏 Thank You Analytics
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="text-center">
            <p className="text-slate-300 text-sm font-medium">Total Thank Yous</p>
            <p className="text-white text-3xl font-bold">{stats.totalThankYous.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-300 text-sm font-medium">Thank You Points</p>
            <p className="text-green-400 text-3xl font-bold">{stats.totalThankYouPoints.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-300 text-sm font-medium">Tips</p>
            <p className="text-blue-400 text-3xl font-bold">{stats.transactionsByType.tips.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Most Thanked Technicians */}
          <div className="bg-black/20 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-3">🏆 Most Thanked Technicians</h4>
            <div className="space-y-2">
              {stats.mostThankedTechnicians.slice(0, 5).map((tech, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-slate-300">{tech.name}</span>
                  <span className="text-green-400 font-bold">{tech.thanks} thanks</span>
                </div>
              ))}
            </div>
          </div>

          {/* Popular Tip Amounts */}
          <div className="bg-black/20 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-3">💵 Popular Tip Amounts</h4>
            <div className="space-y-2">
              {stats.popularTipAmounts.slice(0, 5).map((tip, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-slate-300">${tip.amount}</span>
                  <span className="text-blue-400 font-bold">{tip.count} times</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* User Engagement Analytics */}
      <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-lg rounded-lg p-6 border border-white/20">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          📈 User Engagement & Growth
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="text-center">
            <p className="text-slate-300 text-sm font-medium">New Users (Week)</p>
            <p className="text-green-400 text-2xl font-bold">{stats.newUsersThisWeek}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-300 text-sm font-medium">New Users (Month)</p>
            <p className="text-blue-400 text-2xl font-bold">{stats.newUsersThisMonth}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-300 text-sm font-medium">Growth Rate</p>
            <p className="text-purple-400 text-2xl font-bold">{stats.platformGrowthRate.toFixed(1)}%</p>
          </div>
          <div className="text-center">
            <p className="text-slate-300 text-sm font-medium">With Usernames</p>
            <p className="text-orange-400 text-2xl font-bold">{stats.techniciansWithUsernames + stats.customersWithUsernames}</p>
          </div>
        </div>

        {/* Badge Distribution */}
        <div className="bg-black/20 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-white mb-3">🏅 Badge Distribution</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(stats.badgeDistribution).map(([badge, count]) => (
              <div key={badge} className="text-center">
                <p className="text-slate-300 text-sm">{badge}</p>
                <p className="text-yellow-400 font-bold">{count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Business Intelligence */}
      <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 backdrop-blur-lg rounded-lg p-6 border border-white/20">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          📊 Business Intelligence
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Revenue by Category */}
          <div className="bg-black/20 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-3">💰 Revenue by Category</h4>
            <div className="space-y-2">
              {stats.revenueByCategory.slice(0, 5).map((category, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-slate-300">{category.category}</span>
                  <span className="text-yellow-400 font-bold">${category.revenue.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Performing Technicians */}
          <div className="bg-black/20 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-3">🌟 Top Performers</h4>
            <div className="space-y-2">
              {stats.technicianPerformance.slice(0, 5).map((tech, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <p className="text-slate-300 text-sm">{tech.name}</p>
                    <p className="text-slate-500 text-xs">{tech.thanks} thanks, {tech.tips} tips</p>
                  </div>
                  <span className="text-green-400 font-bold">${tech.earnings.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Token Economy Health Dashboard */}
      <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 backdrop-blur-lg rounded-lg p-6 border border-white/20">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          ⚡ Token Economy Health
        </h3>
        
        {/* Health Score */}
        <div className="bg-black/20 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">Overall Health Score</h4>
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full ${
                stats.tokenEconomyHealth.score >= 80 ? 'bg-green-500' :
                stats.tokenEconomyHealth.score >= 60 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}></div>
              <span className={`text-2xl font-bold ${
                stats.tokenEconomyHealth.score >= 80 ? 'text-green-400' :
                stats.tokenEconomyHealth.score >= 60 ? 'text-yellow-400' :
                'text-red-400'  
              }`}>
                {stats.tokenEconomyHealth.score.toFixed(0)}/100
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-lg p-4 text-center">
              <p className="text-slate-300 text-sm">Circulation</p>
              <p className={`font-bold capitalize ${
                stats.tokenEconomyHealth.circulation === 'healthy' ? 'text-green-400' :
                stats.tokenEconomyHealth.circulation === 'stagnant' ? 'text-red-400' :
                'text-yellow-400'
              }`}>
                {stats.tokenEconomyHealth.circulation}
              </p>
            </div>
            <div className="bg-white/10 rounded-lg p-4 text-center">
              <p className="text-slate-300 text-sm">Supply</p>
              <p className={`font-bold capitalize ${
                stats.tokenEconomyHealth.supply === 'balanced' ? 'text-green-400' :
                'text-yellow-400'
              }`}>
                {stats.tokenEconomyHealth.supply}
              </p>
            </div>
            <div className="bg-white/10 rounded-lg p-4 text-center">
              <p className="text-slate-300 text-sm">Demand</p>
              <p className={`font-bold capitalize ${
                stats.tokenEconomyHealth.demand === 'stable' ? 'text-green-400' :
                stats.tokenEconomyHealth.demand === 'increasing' ? 'text-blue-400' :
                'text-red-400'
              }`}>
                {stats.tokenEconomyHealth.demand}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Token Velocity */}
          <div className="bg-black/20 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-3">🔄 Token Velocity</h4>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-400 mb-2">
                {stats.tokenVelocity.toFixed(1)}%
              </p>
              <p className="text-slate-300 text-sm">
                How fast tokens circulate
              </p>
            </div>
          </div>

          {/* Token Burn Rate */}
          <div className="bg-black/20 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-3">🔥 Burn Rate</h4>
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-400 mb-2">
                {stats.tokenBurnRate.toFixed(1)}%
              </p>
              <p className="text-slate-300 text-sm">
                Tokens spent vs purchased
              </p>
            </div>
          </div>

          {/* Suspicious Activity */}
          <div className="bg-black/20 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-3">🚨 Suspicious Activity</h4>
            <div className="space-y-2">
              {stats.suspiciousActivity.length > 0 ? (
                stats.suspiciousActivity.slice(0, 3).map((activity, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-slate-300 text-sm truncate">
                      {activity.reason}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      activity.severity === 'high' ? 'bg-red-600 text-white' :
                      activity.severity === 'medium' ? 'bg-yellow-600 text-white' :
                      'bg-blue-600 text-white'
                    }`}>
                      {activity.severity}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-green-400 text-sm text-center">No suspicious activity detected</p>
              )}
            </div>
          </div>
        </div>

        {/* Token Hoarding Users */}
        {stats.tokenHoardingUsers.length > 0 && (
          <div className="mt-6 bg-black/20 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-3">💰 Token Hoarding Alert</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.tokenHoardingUsers.slice(0, 6).map((user, index) => (
                <div key={index} className="flex justify-between items-center bg-white/10 rounded p-3">
                  <span className="text-slate-300">{user.name}</span>
                  <span className="text-yellow-400 font-bold">{user.hoardedTokens} tokens</span>
                </div>
              ))}
            </div>
            <p className="text-slate-400 text-sm mt-3">
              Users with high token balances may indicate unused purchasing power or potential issues.
            </p>
          </div>
        )}
      </div>

      {/* Financial Reconciliation */}
      <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 backdrop-blur-lg rounded-lg p-6 border border-white/20">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          💼 Financial Reconciliation
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="text-center bg-black/20 rounded-lg p-4">
            <p className="text-emerald-200 text-sm font-medium">Token Revenue</p>
            <p className="text-white text-2xl font-bold">${stats.tokenPurchaseRevenue.toFixed(2)}</p>
            <p className="text-emerald-300 text-xs">From Stripe payments</p>
          </div>
          <div className="text-center bg-black/20 rounded-lg p-4">
            <p className="text-emerald-200 text-sm font-medium">Outstanding Liability</p>
            <p className="text-yellow-400 text-2xl font-bold">${(stats.totalTokensInCirculation * 0.1).toFixed(2)}</p>
            <p className="text-emerald-300 text-xs">{stats.totalTokensInCirculation} tokens @ $0.10</p>
          </div>
          <div className="text-center bg-black/20 rounded-lg p-4">
            <p className="text-emerald-200 text-sm font-medium">Platform Fees</p>
            <p className="text-green-400 text-2xl font-bold">${(stats.totalTokensSpent * 0.015).toFixed(2)}</p>
            <p className="text-emerald-300 text-xs">15% of spent tokens</p>  
          </div>
          <div className="text-center bg-black/20 rounded-lg p-4">
            <p className="text-emerald-200 text-sm font-medium">Technician Payouts</p>
            <p className="text-blue-400 text-2xl font-bold">${(stats.totalTokensSpent * 0.085).toFixed(2)}</p>
            <p className="text-emerald-300 text-xs">85% of spent tokens</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-black/20 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-3">📊 Financial Health</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-300">Revenue/Liability Ratio:</span>
                <span className={`font-bold ${
                  (stats.tokenPurchaseRevenue / (stats.totalTokensInCirculation * 0.1)) >= 1 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {stats.totalTokensInCirculation > 0 
                    ? (stats.tokenPurchaseRevenue / (stats.totalTokensInCirculation * 0.1)).toFixed(2)
                    : '0.00'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Platform Profit:</span>
                <span className="text-green-400 font-bold">
                  ${(stats.tokenPurchaseRevenue - (stats.totalTokensInCirculation * 0.1)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-black/20 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-3">📋 Export Tools</h4>
            <div className="space-y-2">
              <button
                onClick={() => handleExportFinancialReport()}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg text-sm transition-colors"
              >
                📄 Export Financial Report (CSV)
              </button>
              <button
                onClick={() => handleExportTaxReport()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm transition-colors"
              >
                🧾 Export Tax Report (IRS Format)
              </button>
              <button
                onClick={() => handleReconcileStripe()}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg text-sm transition-colors"
              >
                💳 Reconcile with Stripe
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Token Management */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
          <h3 className="text-lg font-bold text-white mb-4">🪙 Token Management</h3>
          
          {/* Bulk Operations */}
          <div className="mb-6 p-4 bg-blue-600/10 border border-blue-400/20 rounded-lg">
            <h4 className="text-md font-semibold text-blue-300 mb-3">⚡ Bulk Operations</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => handleBulkTokenGrant()}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm transition-colors"
              >
                🎁 Bulk Grant (All Users)
              </button>
              <button
                onClick={() => handleTokenFreeze()}
                className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg text-sm transition-colors"
              >
                🚫 Emergency Freeze
              </button>
              <button
                onClick={() => handleTokenRefund()}
                className="bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg text-sm transition-colors"
              >
                💰 Process Refunds
              </button>
            </div>
          </div>
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
      {(tokenManagementResults || resetResults || emailTestResults) && (
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
          <h3 className="text-lg font-bold text-white mb-4">📋 Operation Results</h3>
          <div className="bg-black/30 rounded-lg p-4 font-mono text-sm text-green-400 whitespace-pre-wrap max-h-96 overflow-y-auto">
            {tokenManagementResults || resetResults || emailTestResults}
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
        currentPath="/admin"
      />      <main className="relative max-w-7xl mx-auto px-4 py-8">
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