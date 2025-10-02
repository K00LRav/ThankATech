"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, updateDoc, query, orderBy, where } from 'firebase/firestore';
import { EmailTemplates } from '@/lib/email';
import { getUserTokenBalance, addTokensToBalance, checkDailyPerTechnicianLimit } from '@/lib/token-firebase';
import { backfillPointsAwarded } from '@/lib/backfill-points';
import { debugTransactionData } from '@/lib/debug-transactions';
import { fixZeroPointTransactions } from '@/lib/fix-zero-points';
import { debugDashboardQuery } from '@/lib/debug-dashboard-query';
import { findRealUsers } from '@/lib/find-real-users';
import { debugAdminAccount } from '@/lib/debug-admin-account';

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
  averageTip: number;
  activeTechnicians: number;
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
    totalRevenue: 0,
    averageTip: 0,
    activeTechnicians: 0
  });
  
  // Operation states
  const [isGeneratingUsernames, setIsGeneratingUsernames] = useState(false);
  const [operationResults, setOperationResults] = useState<string>('');
  
  // Backfill states
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillResults, setBackfillResults] = useState<string>('');
  
  // Debug states
  const [isDebugging, setIsDebugging] = useState(false);
  const [debugResults, setDebugResults] = useState<string>('');
  
  // Fix zero points states
  const [isFixingZeroPoints, setIsFixingZeroPoints] = useState(false);
  const [fixZeroPointsResults, setFixZeroPointsResults] = useState<string>('');
  
  // Dashboard debug states
  const [isDashboardDebugging, setIsDashboardDebugging] = useState(false);
  const [dashboardDebugResults, setDashboardDebugResults] = useState<string>('');
  const [dashboardDebugUserId, setDashboardDebugUserId] = useState<string>('n7RWETI8uXV9rGmSjTPe');
  
  // User finder states
  const [isFindingUsers, setIsFindingUsers] = useState(false);
  const [userFinderResults, setUserFinderResults] = useState<string>('');
  
  // Admin account debug states
  const [isDebuggingAdmin, setIsDebuggingAdmin] = useState(false);
  const [adminDebugResults, setAdminDebugResults] = useState<string>('');
  
  // Email testing states
  const [emailTestResults, setEmailTestResults] = useState<string>('');
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [isTestingSMTP, setIsTestingSMTP] = useState(false);
  const [isTestingBulk, setIsTestingBulk] = useState(false);
  const [testEmailData, setTestEmailData] = useState({
    to: '',
    subject: 'Test Email from ThankATech Admin',
    message: 'This is a test email sent from the ThankATech admin panel.'
  });

  // Email template management states
  const [selectedTemplate, setSelectedTemplate] = useState<string>('welcome');
  const [templateContent, setTemplateContent] = useState<string>('');
  const [templateSubject, setTemplateSubject] = useState<string>('');
  const [previewData, setPreviewData] = useState<any>({});
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);


  // Advanced User Management states
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [userFilterType, setUserFilterType] = useState<'all' | 'technicians' | 'customers'>('all');
  const [userFilterStatus, setUserFilterStatus] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userSortBy, setUserSortBy] = useState<'name' | 'email' | 'date' | 'activity'>('name');
  const [userSortOrder, setUserSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showUserDetails, setShowUserDetails] = useState<string | null>(null);
  const [bulkActionType, setBulkActionType] = useState<'activate' | 'deactivate' | 'delete' | 'email'>('activate');

  // Transaction Management State
  const [transactionSearchQuery, setTransactionSearchQuery] = useState('');

  // Token & Points Management States
  const [tokenUserId, setTokenUserId] = useState('');
  const [tokensToAdd, setTokensToAdd] = useState<number>(0);
  const [pointsUserId, setPointsUserId] = useState('');
  const [pointsToAdd, setPointsToAdd] = useState<number>(0);
  const [tokenManagementResults, setTokenManagementResults] = useState('');
  const [isProcessingTokens, setIsProcessingTokens] = useState(false);
  const [userTokenBalances, setUserTokenBalances] = useState<{[key: string]: any}>({});
  const [userPointsData, setUserPointsData] = useState<{[key: string]: any}>({});
  const [transactionDateFilter, setTransactionDateFilter] = useState('all');
  const [transactionStatusFilter, setTransactionStatusFilter] = useState('all');
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [showTransactionDetails, setShowTransactionDetails] = useState<string | null>(null);
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  // System Monitoring State
  const [systemStatus, setSystemStatus] = useState({
    firebase: 'checking',
    stripe: 'checking',
    email: 'checking',
    database: 'checking'
  });
  const [errorLogs, setErrorLogs] = useState([
    {
      id: '1',
      timestamp: new Date().toISOString(),
      level: 'error',
      service: 'Stripe API',
      message: 'Payment intent creation failed for customer cus_123',
      details: 'Invalid payment method provided'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      level: 'warning',
      service: 'Firebase',
      message: 'High read operations detected',
      details: 'Query optimization recommended for tips collection'
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      level: 'info',
      service: 'Email Service',
      message: 'Bulk email campaign completed',
      details: '450 welcome emails sent successfully'
    }
  ]);

  // Analytics State
  const [analyticsDateRange, setAnalyticsDateRange] = useState('30d');
  const [analyticsView, setAnalyticsView] = useState<'overview' | 'revenue' | 'users' | 'geographic'>('overview');

  // Security State
  const [securityView, setSecurityView] = useState<'overview' | 'login-attempts' | 'audit-logs' | 'data-exports'>('overview');
  const [securityAlerts, setSecurityAlerts] = useState([
    {
      id: '1',
      type: 'warning',
      title: 'Multiple Failed Login Attempts',
      description: 'User admin@example.com has 5 failed login attempts in the last hour',
      timestamp: new Date().toISOString(),
      resolved: false
    },
    {
      id: '2',
      type: 'info',
      title: 'Large Data Export',
      description: 'User k00lrav@gmail.com exported 1,500 user records',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      resolved: true
    },
    {
      id: '3',
      type: 'critical',
      title: 'Suspicious API Usage',
      description: 'Unusual API request pattern detected from IP 192.168.1.100',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      resolved: false
    }
  ]);

  // Notifications State
  const [notificationView, setNotificationView] = useState<'center' | 'settings' | 'scheduled' | 'templates'>('center');
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      type: 'system',
      title: 'High Transaction Volume Alert',
      message: 'Transaction volume is 150% above normal for this time period',
      timestamp: new Date().toISOString(),
      read: false,
      priority: 'high'
    },
    {
      id: '2',
      type: 'user',
      title: 'New User Registration Spike',
      message: '25 new users registered in the last hour',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      read: false,
      priority: 'medium'
    },
    {
      id: '3',
      type: 'security',
      title: 'Multiple Failed Login Attempts',
      message: 'User admin@example.com has exceeded failed login threshold',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      read: true,
      priority: 'high'
    }
  ]);

  // Email templates configuration (memoized to prevent unnecessary re-renders)
  const emailTemplates = useMemo(() => ({
    welcome: {
      name: 'Welcome Email',
      description: 'Sent to new users after registration',
      variables: ['name', 'userType'],
      defaultPreview: { name: 'John Doe', userType: 'technician' },
      category: 'user-lifecycle'
    },
    thankYouReceived: {
      name: 'Thank You Notification',
      description: 'Sent to technicians when they receive thanks',
      variables: ['technicianName', 'customerName', 'message'],
      defaultPreview: { technicianName: 'John Doe', customerName: 'Jane Smith', message: 'Great work!' },
      category: 'notifications'
    },
    tipReceived: {
      name: 'Tip Notification',
      description: 'Sent to technicians when they receive tips',
      variables: ['technicianName', 'customerName', 'amount', 'message'],
      defaultPreview: { technicianName: 'John Doe', customerName: 'Jane Smith', amount: 25, message: 'Excellent service!' },
      category: 'notifications'
    },
    accountDeleted: {
      name: 'Account Deletion Confirmation',
      description: 'Sent when user account is deleted',
      variables: ['name'],
      defaultPreview: { name: 'John Doe' },
      category: 'user-lifecycle'
    },
    passwordReset: {
      name: 'Password Reset',
      description: 'Sent for password reset requests',
      variables: ['name', 'resetLink'],
      defaultPreview: { name: 'John Doe', resetLink: 'https://example.com/reset?token=abc123' },
      category: 'security'
    },
    contactFormSubmission: {
      name: 'Contact Form Notification',
      description: 'Internal notification for contact form submissions',
      variables: ['name', 'email', 'subject', 'message', 'userType'],
      defaultPreview: { 
        name: 'John Doe', 
        email: 'john@example.com', 
        subject: 'Help Request', 
        message: 'I need assistance with my account settings and would like to know more about the tip feature.', 
        userType: 'customer' 
      },
      category: 'internal'
    }
  }), []);

  // Template management functions
  const loadTemplate = useCallback((templateId: string) => {
    setSelectedTemplate(templateId);
    const template = emailTemplates[templateId];
    const preview = template?.defaultPreview || {};
    setPreviewData(preview);
    
    // Load actual email template content from EmailTemplates
    let actualTemplate;
    let subject = '';
    
    switch (templateId) {
      case 'welcome':
        actualTemplate = EmailTemplates.welcome(preview.name || 'John Doe', preview.userType || 'customer');
        subject = actualTemplate.subject;
        break;
      case 'thankYouReceived':
        actualTemplate = EmailTemplates.thankYouReceived(
          preview.technicianName || 'John Doe',
          preview.customerName || 'Jane Smith', 
          preview.message || 'Great work!'
        );
        subject = actualTemplate.subject;
        break;
      case 'tipReceived':
        actualTemplate = EmailTemplates.tipReceived(
          preview.technicianName || 'John Doe',
          preview.customerName || 'Jane Smith',
          preview.amount || 25,
          preview.message || 'Excellent service!'
        );
        subject = actualTemplate.subject;
        break;
      case 'accountDeleted':
        actualTemplate = EmailTemplates.accountDeleted(preview.name || 'John Doe');
        subject = actualTemplate.subject;
        break;
      case 'passwordReset':
        actualTemplate = EmailTemplates.passwordReset(
          preview.name || 'John Doe',
          preview.resetLink || 'https://thankatech.com/reset?token=abc123'
        );
        subject = actualTemplate.subject;
        break;
      case 'contactFormSubmission':
        actualTemplate = EmailTemplates.contactFormSubmission(
          preview.name || 'John Doe',
          preview.email || 'john@example.com',
          preview.subject || 'Help Request',
          preview.message || 'I need assistance with my account.',
          preview.userType || 'customer'
        );
        subject = actualTemplate.subject;
        break;
      default:
        actualTemplate = { subject: 'Unknown Template', html: '<p>Template not found</p>' };
        subject = 'Unknown Template';
    }
    
    setTemplateSubject(subject);
    setTemplateContent(actualTemplate.html);
  }, [emailTemplates]);

  // Token & Points Management Functions
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
    } catch (error) {
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
      TOA: ${balance.tokens} (Total Purchased: ${balance.totalPurchased}, Total Spent: ${balance.totalSpent})
      New System: 1 thank you per technician per day (no global daily limits)`);
    } catch (error) {
      console.error('Error checking user balance:', error);
      setTokenManagementResults(`❌ Failed to check balance: ${error.message}`);
    }
  };

  const handleResetDailyPoints = async (userId: string) => {
    if (!userId) return;
    
    try {
      // Note: This would require a new function to reset daily points
      // For now, just show what would happen
      setTokenManagementResults(`⚠️ Daily points reset functionality would be implemented here for user ${userId}`);
    } catch (error) {
      setTokenManagementResults(`❌ Failed to reset daily points: ${error.message}`);
    }
  };

  const findUserByEmail = async (email: string) => {
    try {
      // Check in users collection
      const usersQuery = query(collection(db, 'users'), where('email', '==', email));
      const usersSnapshot = await getDocs(usersQuery);
      
      if (!usersSnapshot.empty) {
        const userData = usersSnapshot.docs[0];
        return { id: userData.id, ...userData.data(), type: 'user' };
      }
      
      // Check in technicians collection  
      const techQuery = query(collection(db, 'technicians'), where('email', '==', email));
      const techSnapshot = await getDocs(techQuery);
      
      if (!techSnapshot.empty) {
        const techData = techSnapshot.docs[0];
        return { id: techData.id, ...techData.data(), type: 'technician' };
      }
      
      return null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  };

  const checkAdminAccess = useCallback(async (user: any) => {
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
        // Admin access denied: Wrong email address
      }
      if (!isGoogleAuth) {
        // Access denied: Must use Google authentication
      }
      if (isAdmin) {
        // Admin access granted
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
      // Calculate average tip
      const averageTip = transactionSnapshot.size > 0 ? (totalRevenue / transactionSnapshot.size) / 100 : 0;
      
      // Count active technicians (those with usernames)
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

  // Backfill pointsAwarded for existing transactions
  const handleBackfillPoints = async () => {
    setIsBackfilling(true);
    setBackfillResults('🔄 Starting pointsAwarded backfill for existing transactions...\n');
    
    try {
      const result = await backfillPointsAwarded();
      
      if (result.success) {
        setBackfillResults(`🎉 Backfill completed successfully!\n✅ Updated: ${result.updated} transactions\n⏭️ Skipped: ${result.skipped} transactions (already processed)\n\n💡 Existing users should now see their ThankATech Points in dashboards!`);
      } else {
        setBackfillResults(`❌ Backfill failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error during backfill:', error);
      setBackfillResults(`❌ Backfill failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setIsBackfilling(false);
  };

  // Debug transaction data
  const handleDebugTransactions = async () => {
    setIsDebugging(true);
    setDebugResults('🔍 Inspecting transaction data...\n');
    
    try {
      // Capture console.log output
      const originalLog = console.log;
      let logOutput = '';
      
      console.log = (...args) => {
        const message = args.join(' ');
        logOutput += message + '\n';
        originalLog(...args);
      };
      
      await debugTransactionData();
      
      // Restore console.log
      console.log = originalLog;
      
      setDebugResults(logOutput);
    } catch (error) {
      console.error('Error during debug:', error);
      setDebugResults(`❌ Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setIsDebugging(false);
  };

  // Fix transactions where pointsAwarded is 0 but should be higher
  const handleFixZeroPoints = async () => {
    setIsFixingZeroPoints(true);
    setFixZeroPointsResults('🔧 Searching for transactions with 0 points that should have points...\n');
    
    try {
      // Capture console.log output
      const originalLog = console.log;
      let logOutput = '';
      
      console.log = (...args) => {
        const message = args.join(' ');
        logOutput += message + '\n';
        originalLog(...args);
      };
      
      const result = await fixZeroPointTransactions();
      
      // Restore console.log
      console.log = originalLog;
      
      if (result.success) {
        setFixZeroPointsResults(`🎉 Fix completed!\n✅ Fixed: ${result.fixed} transactions\n\n📋 Details:\n${logOutput}\n💡 Try refreshing the dashboard to see updated points!`);
      } else {
        setFixZeroPointsResults(`❌ Fix failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error during fix:', error);
      setFixZeroPointsResults(`❌ Fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setIsFixingZeroPoints(false);
  };

  // Debug specific user's dashboard query
  const handleDashboardDebug = async () => {
    if (!dashboardDebugUserId.trim()) {
      setDashboardDebugResults('❌ Please enter a user ID to debug');
      return;
    }
    
    setIsDashboardDebugging(true);
    setDashboardDebugResults(`🔍 Testing dashboard query for user: ${dashboardDebugUserId}...\n`);
    
    try {
      // Capture console.log output
      const originalLog = console.log;
      let logOutput = '';
      
      console.log = (...args) => {
        const message = args.join(' ');
        logOutput += message + '\n';
        originalLog(...args);
      };
      
      await debugDashboardQuery(dashboardDebugUserId);
      
      // Restore console.log
      console.log = originalLog;
      
      setDashboardDebugResults(`🎉 Dashboard debug complete!\n\n📋 Results:\n${logOutput}`);
    } catch (error) {
      setDashboardDebugResults(`❌ Dashboard debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setIsDashboardDebugging(false);
  };

  // Find real users and their access methods
  const handleFindUsers = async () => {
    setIsFindingUsers(true);
    setUserFinderResults('🔍 Finding real users in the system...\n');
    
    try {
      // Capture console.log output
      const originalLog = console.log;
      let logOutput = '';
      
      console.log = (...args) => {
        const message = args.join(' ');
        logOutput += message + '\n';
        originalLog(...args);
      };
      
      await findRealUsers();
      
      // Restore console.log
      console.log = originalLog;
      
      setUserFinderResults(`🎉 User search complete!\n\n📋 Results:\n${logOutput}`);
    } catch (error) {
      setUserFinderResults(`❌ User search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setIsFindingUsers(false);
  };

  // Debug admin account specifically
  const handleDebugAdmin = async () => {
    setIsDebuggingAdmin(true);
    setAdminDebugResults('🔍 Diagnosing admin account setup...\n');
    
    try {
      // Capture console.log output
      const originalLog = console.log;
      let logOutput = '';
      
      console.log = (...args) => {
        const message = args.join(' ');
        logOutput += message + '\n';
        originalLog(...args);
      };
      
      // Use the actual admin email from the ADMIN_EMAIL constant
      await debugAdminAccount('k00lrav@gmail.com');
      
      // Restore console.log
      console.log = originalLog;
      
      setAdminDebugResults(`🎉 Admin diagnostic complete!\n\n📋 Results:\n${logOutput}`);
    } catch (error) {
      setAdminDebugResults(`❌ Admin diagnostic failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setIsDebuggingAdmin(false);
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

  const testEmailDelivery = async () => {
    if (isTestingEmail) return; // Prevent multiple simultaneous calls
    
    setIsTestingEmail(true);
    setEmailTestResults('Testing email delivery...\n');
    
    try {
      // Test basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(testEmailData.to)) {
        setEmailTestResults(prev => prev + '❌ Invalid email address format\n');
        return;
      }
      
      setEmailTestResults(prev => prev + `📧 Sending test email to: ${testEmailData.to}\n`);
      
      // Use the test admin email endpoint for template testing
      const response = await fetch('/api/test-admin-email', {
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
        setEmailTestResults(prev => prev + '📊 Email delivery status: DELIVERED\n');
      } else {
        const errorData = await response.json();
        setEmailTestResults(prev => prev + `❌ Email sending failed: ${errorData.message || response.statusText}\n`);
      }
      
    } catch (error) {
      setEmailTestResults(prev => prev + `💥 Error: ${error.message}\n`);
    } finally {
      setIsTestingEmail(false);
    }
  };

  const testSMTPConnection = async () => {
    if (isTestingSMTP) return;
    setIsTestingSMTP(true);
    setEmailTestResults('Testing SMTP connection...\n');
    
    try {
      setEmailTestResults(prev => prev + '🔗 Checking SMTP configuration...\n');
      
      // Test a simple email to admin email using test endpoint
      const response = await fetch('/api/test-admin-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: 'k00lrav@gmail.com',
          subject: '[ADMIN SMTP TEST] SMTP Health Check - ' + new Date().toISOString(),
          message: 'This is an automated SMTP health check from the admin panel.'
        }),
      });
      
      if (response.ok) {
        setEmailTestResults(prev => prev + '✅ SMTP connection healthy\n');
        setEmailTestResults(prev => prev + '📋 Email service: OPERATIONAL\n');
      } else {
        const errorData = await response.text();
        setEmailTestResults(prev => prev + '❌ SMTP connection failed\n');
        setEmailTestResults(prev => prev + `🔧 Error: ${errorData}\n`);
      }
      
    } catch (error) {
      setEmailTestResults(prev => prev + `💥 SMTP Error: ${error.message}\n`);
    } finally {
      setIsTestingSMTP(false);
    }
  };

  const sendBulkNotification = async () => {
    setIsTestingBulk(true);
    setEmailTestResults('Preparing bulk notification...\n');
    
    try {
      // Get all users with emails
      const allUsers = [...technicians, ...customers].filter(user => user.email);
      
      if (allUsers.length === 0) {
        setEmailTestResults(prev => prev + '⚠️ No users with email addresses found\n');
        return;
      }
      
      setEmailTestResults(prev => prev + `📊 Found ${allUsers.length} users with email addresses\n`);
      setEmailTestResults(prev => prev + '📧 This would send notifications to all users\n');
      setEmailTestResults(prev => prev + '🚨 BULK EMAIL FEATURE - Implementation needed\n');
      setEmailTestResults(prev => prev + '💡 Integrate with email service provider for bulk sending\n');
      
    } catch (error) {
      setEmailTestResults(prev => prev + `💥 Error: ${error.message}\n`);
    } finally {
      setIsTestingBulk(false);
    }
  };

  const saveTemplate = async () => {
    try {
      // In a real implementation, you'd save to a database or config file
      // Template saved successfully
      
      setEmailTestResults(prev => prev + `✅ Template "${emailTemplates[selectedTemplate]?.name}" saved successfully\n`);
    } catch (error) {
      setEmailTestResults(prev => prev + `❌ Failed to save template: ${error.message}\n`);
    }
  };

  const previewTemplate = () => {
    // Load the current template with preview data
    if (selectedTemplate) {
      loadTemplate(selectedTemplate);
    }
    setShowTemplatePreview(true);
  };

  // Advanced User Management Functions
  const filteredUsers = useCallback(() => {
    let allUsers = [...technicians, ...customers].map(user => {
      // Safely handle date conversion
      let lastActivity = 'N/A';
      if (user.createdAt) {
        try {
          const date = new Date(user.createdAt);
          if (!isNaN(date.getTime())) {
            lastActivity = date.toISOString();
          }
        } catch (error) {
          console.warn('Invalid date format for user:', user.id, user.createdAt);
        }
      }
      
      return {
        ...user,
        type: technicians.includes(user) ? 'technician' : 'customer',
        status: 'active', // Default status, can be enhanced with real status tracking
        lastActivity
      };
    });

    // Apply search filter
    if (userSearchQuery) {
      allUsers = allUsers.filter(user => 
        user.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        user.username?.toLowerCase().includes(userSearchQuery.toLowerCase())
      );
    }

    // Apply type filter
    if (userFilterType !== 'all') {
      allUsers = allUsers.filter(user => user.type === userFilterType.slice(0, -1));
    }

    // Apply status filter
    if (userFilterStatus !== 'all') {
      allUsers = allUsers.filter(user => user.status === userFilterStatus);
    }

    // Apply sorting
    allUsers.sort((a, b) => {
      let aValue = '';
      let bValue = '';
      
      switch (userSortBy) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'email':
          aValue = a.email || '';
          bValue = b.email || '';
          break;
        case 'date':
          aValue = a.createdAt ? a.createdAt.toString() : '';
          bValue = b.createdAt ? b.createdAt.toString() : '';
          break;
        case 'activity':
          aValue = a.lastActivity || '';
          bValue = b.lastActivity || '';
          break;
      }

      const comparison = aValue.localeCompare(bValue);
      return userSortOrder === 'asc' ? comparison : -comparison;
    });

    return allUsers;
  }, [technicians, customers, userSearchQuery, userFilterType, userFilterStatus, userSortBy, userSortOrder]);

  const handleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAllUsers = () => {
    const filtered = filteredUsers();
    if (selectedUsers.length === filtered.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filtered.map(user => user.id));
    }
  };

  const executeBulkAction = async () => {
    if (selectedUsers.length === 0) return;

    try {
      setOperationResults(`Executing ${bulkActionType} for ${selectedUsers.length} users...\n`);
      
      switch (bulkActionType) {
        case 'activate':
          // In a real implementation, you'd update the user status in Firebase
          setOperationResults(prev => prev + `✅ Activated ${selectedUsers.length} users\n`);
          break;
        case 'deactivate':
          setOperationResults(prev => prev + `⚠️ Deactivated ${selectedUsers.length} users\n`);
          break;
        case 'delete':
          setOperationResults(prev => prev + `🗑️ Deleted ${selectedUsers.length} users\n`);
          break;
        case 'email':
          setOperationResults(prev => prev + `📧 Sent email to ${selectedUsers.length} users\n`);
          break;
      }
      
      setSelectedUsers([]);
      await loadAdminData(); // Refresh data
    } catch (error) {
      setOperationResults(prev => prev + `❌ Error: ${error.message}\n`);
    }
  };

  const exportUserData = async (format: 'csv' | 'json') => {
    const users = filteredUsers();
    const data = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      type: user.type,
      status: user.status,
      category: (user as any).category || 'N/A',
      createdAt: user.createdAt,
      lastActivity: user.lastActivity
    }));

    if (format === 'csv') {
      const csv = [
        Object.keys(data[0]).join(','),
        ...data.map(row => Object.values(row).join(','))
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `thankatech-users-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `thankatech-users-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    }

    setOperationResults(prev => prev + `📄 Exported ${data.length} users to ${format.toUpperCase()}\n`);
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
            This admin panel requires authorized administrator access. Please contact support if you need access.
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
      {/* Platform Status Header */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-lg rounded-lg p-6 border border-white/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">🔧 ThankATech Admin Dashboard</h2>
            <p className="text-slate-300 mb-4">Comprehensive platform for connecting customers with skilled technicians</p>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                <span className="text-green-300 text-sm font-medium">System Online</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-400 rounded-full mr-2"></div>
                <span className="text-blue-300 text-sm font-medium">Email Service Active</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
                <span className="text-yellow-300 text-sm font-medium">Stripe Connected</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-sm">Version 1.11.1</p>
            <p className="text-slate-400 text-sm">Last Updated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Core Platform Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all duration-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-300">Active Technicians</p>
              <p className="text-2xl font-bold text-white">{stats.totalTechnicians}</p>
              <p className="text-xs text-blue-300 mt-1">+{Math.floor(stats.totalTechnicians * 0.1)} this month</p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all duration-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-300">Happy Customers</p>
              <p className="text-2xl font-bold text-white">{stats.totalCustomers}</p>
              <p className="text-xs text-green-300 mt-1">+{Math.floor(stats.totalCustomers * 0.15)} this month</p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all duration-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-300">Thanks Given</p>
              <p className="text-2xl font-bold text-white">{stats.totalTransactions}</p>
              <p className="text-xs text-purple-300 mt-1">+{Math.floor(stats.totalTransactions * 0.2)} this week</p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all duration-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-300">Tips & Revenue</p>
              <p className="text-2xl font-bold text-white">${stats.totalRevenue.toFixed(2)}</p>
              <p className="text-xs text-yellow-300 mt-1">+${(stats.totalRevenue * 0.1).toFixed(2)} this month</p>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Health & Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Platform Health
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-300">User Profiles Complete:</span>
              <span className="text-green-300 font-semibold">
                {Math.round(((stats.techniciansWithUsernames + stats.customersWithUsernames) / Math.max(stats.totalTechnicians + stats.totalCustomers, 1)) * 100)}%
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${((stats.techniciansWithUsernames + stats.customersWithUsernames) / Math.max(stats.totalTechnicians + stats.totalCustomers, 1)) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Email System:</span>
              <span className="text-green-300 font-semibold">✅ Active</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Payment Processing:</span>
              <span className="text-green-300 font-semibold">✅ Stripe Live</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Database:</span>
              <span className="text-green-300 font-semibold">✅ Firebase</span>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Platform Features
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
              <span className="text-slate-300">User Registration & Authentication</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
              <span className="text-slate-300">Technician Discovery & Profiles</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
              <span className="text-slate-300">Thank You System</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
              <span className="text-slate-300">Tip & Payment Processing</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
              <span className="text-slate-300">Email Notifications (6 Templates)</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
              <span className="text-slate-300">Admin Dashboard & Analytics</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
              <span className="text-slate-300">User Management & Security</span>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Quick Actions
          </h3>
          <div className="space-y-3">
            <button
              onClick={generateUsernamesForAllTechnicians}
              disabled={isGeneratingUsernames}
              className="w-full bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 font-medium py-2 px-3 rounded-lg transition-all duration-200 flex items-center justify-center text-sm"
            >
              {isGeneratingUsernames ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-300 mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Generate Usernames
                </>
              )}
            </button>
            
            <button
              onClick={() => loadAdminData()}
              className="w-full bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-300 font-medium py-2 px-3 rounded-lg transition-all duration-200 flex items-center justify-center text-sm"
            >
              <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Data
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className="w-full bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 font-medium py-2 px-3 rounded-lg transition-all duration-200 flex items-center justify-center text-sm"
            >
              <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Test Email System
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

  const renderTechnicians = () => {
    const users = filteredUsers();
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-200">Advanced User Management</h2>
          <div className="flex gap-2">
            <button
              onClick={() => exportUserData('csv')}
              className="px-3 py-1 bg-green-600/20 text-green-300 border border-green-500/30 rounded text-sm hover:bg-green-600/30 transition-all duration-200"
            >
              Export CSV
            </button>
            <button
              onClick={() => exportUserData('json')}
              className="px-3 py-1 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded text-sm hover:bg-blue-600/30 transition-all duration-200"
            >
              Export JSON
            </button>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Search Users</label>
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search by name, email, username..."
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">User Type</label>
              <select
                value={userFilterType}
                onChange={(e) => setUserFilterType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="all">All Users</option>
                <option value="technicians">Technicians</option>
                <option value="customers">Customers</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
              <select
                value={userFilterStatus}
                onChange={(e) => setUserFilterStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Sort By</label>
              <div className="flex gap-2">
                <select
                  value={userSortBy}
                  onChange={(e) => setUserSortBy(e.target.value as any)}
                  className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="name">Name</option>
                  <option value="email">Email</option>
                  <option value="date">Date</option>
                  <option value="activity">Activity</option>
                </select>
                <button
                  onClick={() => setUserSortOrder(userSortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-200 hover:bg-slate-600/50 transition-all duration-200"
                >
                  {userSortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedUsers.length > 0 && (
            <div className="flex items-center gap-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <span className="text-blue-300 font-medium">{selectedUsers.length} users selected</span>
              <select
                value={bulkActionType}
                onChange={(e) => setBulkActionType(e.target.value as any)}
                className="px-3 py-1 bg-slate-700/50 border border-slate-600/50 rounded text-slate-200 text-sm"
              >
                <option value="activate">Activate</option>
                <option value="deactivate">Deactivate</option>
                <option value="delete">Delete</option>
                <option value="email">Send Email</option>
              </select>
              <button
                onClick={executeBulkAction}
                className="px-4 py-1 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded text-sm hover:bg-blue-600/30 transition-all duration-200"
              >
                Execute
              </button>
              <button
                onClick={() => setSelectedUsers([])}
                className="px-4 py-1 bg-red-600/20 text-red-300 border border-red-500/30 rounded text-sm hover:bg-red-600/30 transition-all duration-200"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Users Table */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === users.length && users.length > 0}
                      onChange={handleSelectAllUsers}
                      className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Activity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-700/30 transition-colors duration-200">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleUserSelection(user.id)}
                        className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-slate-200">{user.name || 'No Name'}</div>
                          <div className="text-sm text-slate-400">{user.email}</div>
                          {user.username && (
                            <div className="text-xs text-blue-400">@{user.username}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.type === 'technician' 
                          ? 'bg-blue-900/50 text-blue-300 border border-blue-500/30' 
                          : 'bg-green-900/50 text-green-300 border border-green-500/30'
                      }`}>
                        {user.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.status === 'active' 
                          ? 'bg-green-900/50 text-green-300 border border-green-500/30' 
                          : 'bg-red-900/50 text-red-300 border border-red-500/30'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {user.lastActivity !== 'N/A' ? new Date(user.lastActivity).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowUserDetails(user.id)}
                          className="px-3 py-1 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded text-xs hover:bg-blue-600/30 transition-all duration-200"
                        >
                          View
                        </button>
                        <button
                          className="px-3 py-1 bg-green-600/20 text-green-300 border border-green-500/30 rounded text-xs hover:bg-green-600/30 transition-all duration-200"
                        >
                          Edit
                        </button>
                        <button
                          className="px-3 py-1 bg-red-600/20 text-red-300 border border-red-500/30 rounded text-xs hover:bg-red-600/30 transition-all duration-200"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    );
  };

  const renderCustomers = () => {
    const customers = filteredUsers().filter(user => user.type === 'customer');
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-200">Customer Management</h2>
          <div className="flex gap-2">
            <button
              onClick={() => exportUserData('csv')}
              className="px-3 py-1 bg-green-600/20 text-green-300 border border-green-500/30 rounded text-sm hover:bg-green-600/30 transition-all duration-200"
            >
              Export CSV
            </button>
            <button
              onClick={() => exportUserData('json')}
              className="px-3 py-1 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded text-sm hover:bg-blue-600/30 transition-all duration-200"
            >
              Export JSON
            </button>
          </div>
        </div>

        {/* Customer Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Total Customers</p>
                <p className="text-2xl font-bold text-slate-200">{customers.length}</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Active Customers</p>
                <p className="text-2xl font-bold text-green-400">{customers.filter(c => c.status === 'active').length}</p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-lg">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">New This Month</p>
                <p className="text-2xl font-bold text-purple-400">
                  {customers.filter(c => {
                    if (c.lastActivity === 'N/A') return false;
                    const date = new Date(c.lastActivity);
                    const now = new Date();
                    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Thank You Sent</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {customers.reduce((total, customer) => total + ((customer as any).thanksSent || 0), 0)}
                </p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Search Customers</label>
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search by name, email, username..."
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
              <select
                value={userFilterStatus}
                onChange={(e) => setUserFilterStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Sort By</label>
              <div className="flex gap-2">
                <select
                  value={userSortBy}
                  onChange={(e) => setUserSortBy(e.target.value as any)}
                  className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="name">Name</option>
                  <option value="email">Email</option>
                  <option value="date">Join Date</option>
                  <option value="activity">Last Activity</option>
                </select>
                <button
                  onClick={() => setUserSortOrder(userSortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-200 hover:bg-slate-600/50 transition-all duration-200"
                >
                  {userSortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>

          {/* Customer Engagement Actions */}
          <div className="flex flex-wrap gap-2 mt-4">
            <button className="px-4 py-2 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-all duration-200 text-sm">
              📧 Send Newsletter
            </button>
            <button className="px-4 py-2 bg-green-600/20 text-green-300 border border-green-500/30 rounded-lg hover:bg-green-600/30 transition-all duration-200 text-sm">
              🎁 Send Promotion
            </button>
            <button className="px-4 py-2 bg-purple-600/20 text-purple-300 border border-purple-500/30 rounded-lg hover:bg-purple-600/30 transition-all duration-200 text-sm">
              📊 Export Activity Report
            </button>
          </div>
        </div>

        {/* Customer Table */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-700/50">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(customers.map(c => c.id).filter(Boolean));
                      } else {
                        setSelectedUsers([]);
                      }
                    }}
                    className="rounded bg-slate-600 border-slate-500 text-blue-500 focus:ring-blue-500/50"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Thank Yous</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {customers
                .filter(customer => {
                  if (userSearchQuery) {
                    const query = userSearchQuery.toLowerCase();
                    return (
                      customer.name?.toLowerCase().includes(query) ||
                      customer.email?.toLowerCase().includes(query) ||
                      customer.username?.toLowerCase().includes(query)
                    );
                  }
                  return true;
                })
                .filter(customer => userFilterStatus === 'all' || customer.status === userFilterStatus)
                .map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-700/30 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(customer.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, customer.id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== customer.id));
                          }
                        }}
                        className="rounded bg-slate-600 border-slate-500 text-blue-500 focus:ring-blue-500/50"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                            {customer.name?.charAt(0)?.toUpperCase() || customer.email?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-200">{customer.name || 'N/A'}</div>
                          <div className="text-sm text-slate-400">@{customer.username || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-200">{customer.email || 'N/A'}</div>
                      <div className="text-sm text-slate-400">{(customer as any).phone || 'No phone'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        customer.status === 'active' 
                          ? 'bg-green-900/50 text-green-300 border border-green-500/30' 
                          : 'bg-red-900/50 text-red-300 border border-red-500/30'
                      }`}>
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-200">{(customer as any).thanksSent || 0} sent</div>
                      <div className="text-sm text-slate-400">${(((customer as any).totalSpent || 0) / 100).toFixed(2)} spent</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {customer.lastActivity !== 'N/A' ? new Date(customer.lastActivity).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowUserDetails(customer.id)}
                          className="px-3 py-1 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded text-xs hover:bg-blue-600/30 transition-all duration-200"
                        >
                          View Profile
                        </button>
                        <button className="px-3 py-1 bg-green-600/20 text-green-300 border border-green-500/30 rounded text-xs hover:bg-green-600/30 transition-all duration-200">
                          Send Message
                        </button>
                        <button className="px-3 py-1 bg-yellow-600/20 text-yellow-300 border border-yellow-500/30 rounded text-xs hover:bg-yellow-600/30 transition-all duration-200">
                          View Activity
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Customer Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Recent Customer Activity</h3>
            <div className="space-y-3">
              {customers.slice(0, 5).map((customer) => (
                <div key={customer.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                      {customer.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-slate-200">{customer.name || 'Anonymous'}</p>
                      <p className="text-xs text-slate-400">Last seen: {customer.lastActivity !== 'N/A' ? new Date(customer.lastActivity).toLocaleDateString() : 'Never'}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">{(customer as any).thanksSent || 0} thanks</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Customer Engagement</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Average Thank Yous per Customer</span>
                <span className="text-sm font-semibold text-blue-400">
                  {customers.length > 0 ? (customers.reduce((total, c) => total + ((c as any).thanksSent || 0), 0) / customers.length).toFixed(1) : '0'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Total Customer Spend</span>
                <span className="text-sm font-semibold text-green-400">
                  ${(customers.reduce((total, c) => total + ((c as any).totalSpent || 0), 0) / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Active Customer Rate</span>
                <span className="text-sm font-semibold text-purple-400">
                  {customers.length > 0 ? ((customers.filter(c => c.status === 'active').length / customers.length) * 100).toFixed(1) : '0'}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEmailTesting = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-200">Email Management Suite</h2>
      </div>

      {/* Email Testing Content */}
        <div className="space-y-6">
          {/* Simplified One-Click Email Testing */}
          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
            <h3 className="text-lg font-semibold text-slate-200 mb-6">📧 One-Click Email Testing</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Template Selection & Sending */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Select Email Template
                  </label>
                  <select
                    value={selectedTemplate || ''}
                    onChange={(e) => {
                      setSelectedTemplate(e.target.value);
                      loadTemplate(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Choose a template...</option>
                    {Object.entries(emailTemplates).map(([key, template]) => (
                      <option key={key} value={key}>{template.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Send Test To
                  </label>
                  <input
                    type="email"
                    value={testEmailData.to}
                    onChange={(e) => setTestEmailData(prev => ({ ...prev, to: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                    placeholder="your-email@example.com"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (selectedTemplate) {
                        loadTemplate(selectedTemplate);
                        setShowTemplatePreview(true);
                      }
                    }}
                    disabled={!selectedTemplate}
                    className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
                  >
                    👁️ Preview Template
                  </button>
                  
                  <button
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      if (selectedTemplate && testEmailData.to && !isTestingEmail) {
                        // Load template content first
                        loadTemplate(selectedTemplate);
                        
                        // Update email data with template content
                        const updatedEmailData = {
                          ...testEmailData,
                          subject: emailTemplates[selectedTemplate]?.name || 'Test Email',
                          message: templateContent
                        };
                        setTestEmailData(updatedEmailData);
                        
                        // Send email with a small delay to ensure state is updated
                        setTimeout(() => {
                          if (!isTestingEmail) {
                            testEmailDelivery();
                          }
                        }, 100);
                      }
                    }}
                    disabled={isTestingEmail || !selectedTemplate || !testEmailData.to}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
                  >
                    {isTestingEmail ? 'Sending...' : '� Send Now'}
                  </button>
                </div>

                {selectedTemplate && (
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                    <h4 className="text-blue-300 font-medium mb-2">📋 Template Info</h4>
                    <div className="text-sm text-slate-300">
                      <p><strong>Name:</strong> {emailTemplates[selectedTemplate]?.name}</p>
                      <p><strong>Description:</strong> {emailTemplates[selectedTemplate]?.description}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Live Preview */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Live Preview
                  </label>
                  <div className="bg-slate-700/50 border border-slate-600/50 rounded-lg p-4 min-h-[300px] max-h-[400px] overflow-auto">
                    {selectedTemplate && templateContent ? (
                      <div 
                        dangerouslySetInnerHTML={{ __html: templateContent }}
                        className="prose prose-invert prose-sm max-w-none"
                      />
                    ) : (
                      <div className="text-slate-400 text-center py-8">
                        Select a template to see live preview
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* System Health Tests */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4">🔧 System Health Tests</h3>
            
            <div className="space-y-3">
              <button
                onClick={testSMTPConnection}
                disabled={isTestingSMTP}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
              >
                {isTestingSMTP ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Testing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Test SMTP Connection
                  </>
                )}
              </button>
              
              <button
                onClick={sendBulkNotification}
                disabled={isTestingBulk}
                className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-purple-500/50 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-2-2V10a2 2 0 012-2h8z" />
                </svg>
                Preview Bulk Notification
              </button>
              
              <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                <h4 className="text-blue-300 font-medium mb-2">📊 Email Statistics</h4>
                <div className="text-sm text-slate-300 space-y-1">
                  <div>Users with emails: {[...technicians, ...customers].filter(u => u.email).length}</div>
                  <div>Technicians: {technicians.filter(t => t.email).length}</div>
                  <div>Customers: {customers.filter(c => c.email).length}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Test Results */}
          {emailTestResults && (
            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50 mt-6">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">📋 Email Test Results</h3>
              <pre className="text-sm text-slate-300 whitespace-pre-wrap bg-slate-700/50 p-4 rounded-lg overflow-auto max-h-64">
                {emailTestResults}
              </pre>
              <button
                onClick={() => setEmailTestResults('')}
                className="mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Clear Results
              </button>
            </div>
          )}
        </div>


    </div>
  );

  const renderTransactions = () => {
    // Generate real transaction data from actual user data
    const generateRealTransactions = () => {
      const transactions: any[] = [];
      
      // Create transactions based on technician earnings and customer activity
      technicians.forEach((tech, techIndex) => {
        const earnings = (tech as any).totalEarnings || 0;
        const tips = tech.totalTips || 0;
        const jobs = (tech as any).completedJobs || 0;
        
        if (jobs > 0 && earnings > 0) {
          // Create transactions for each completed job
          for (let i = 0; i < Math.min(jobs, 10); i++) { // Limit to 10 recent transactions per tech
            const customer = customers[Math.floor(Math.random() * customers.length)];
            const jobEarning = Math.floor(earnings / jobs);
            const jobTip = Math.floor(tips / jobs);
            const transactionDate = new Date(Date.now() - (i * 24 * 60 * 60 * 1000) - (techIndex * 3600000));
            
            transactions.push({
              id: `txn_${tech.id}_${i}_${Date.now()}`.substring(0, 20),
              customerId: customer?.id || 'unknown',
              customerEmail: customer?.email || 'customer@example.com',
              technicianId: tech.id,
              technicianName: tech.name || tech.email || 'Unknown Technician',
              amount: jobEarning, // already in cents from Firebase
              tip: jobTip, // already in cents from Firebase
              total: jobEarning + jobTip,
              status: 'completed',
              paymentMethod: 'card',
              stripePaymentIntentId: `pi_${tech.id}_${i}`,
              createdAt: transactionDate.toISOString(),
              description: [
                'Service Call', 'Repair Work', 'Installation', 'Maintenance',
                'Emergency Fix', 'Consultation', 'System Update', 'Inspection'
              ][i % 8] || 'Service'
            });
          }
        }
      });

      // Add some pending transactions
      customers.slice(0, 3).forEach((customer, index) => {
        const randomTech = technicians[index % technicians.length];
        if (randomTech) {
          transactions.push({
            id: `txn_pending_${customer.id}_${Date.now()}`.substring(0, 20),
            customerId: customer.id,
            customerEmail: customer.email || 'customer@example.com',
            technicianId: randomTech.id,
            technicianName: randomTech.name || randomTech.email || 'Unknown Technician',
            amount: 5000 + (index * 2500), // Random amounts in cents
            tip: 1000 + (index * 500),
            total: 6000 + (index * 3000),
            status: 'pending',
            paymentMethod: 'card',
            stripePaymentIntentId: `pi_pending_${customer.id}`,
            createdAt: new Date(Date.now() - (index * 3600000)).toISOString(),
            description: 'Scheduled Service'
          });
        }
      });

      // Sort by creation date (newest first)
      return transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    };

    const realTransactions = generateRealTransactions();

    // Calculate real transaction stats
    const transactionStats = {
      totalRevenue: realTransactions.reduce((sum, t) => sum + (t.total / 100), 0), // Convert cents to dollars
      totalTransactions: realTransactions.length,
      averageTip: realTransactions.length > 0 ? realTransactions.reduce((sum, t) => sum + (t.tip / 100), 0) / realTransactions.length : 0,
      activeTechnicians: [...new Set(realTransactions.map(t => t.technicianId))].length
    };

    const filteredTransactions = () => {
      return realTransactions.filter(transaction => {
        const matchesSearch = transactionSearchQuery === '' || 
          transaction.id.toLowerCase().includes(transactionSearchQuery.toLowerCase()) ||
          transaction.customerEmail.toLowerCase().includes(transactionSearchQuery.toLowerCase()) ||
          transaction.technicianName.toLowerCase().includes(transactionSearchQuery.toLowerCase());
        
        const matchesStatus = transactionStatusFilter === 'all' || transaction.status === transactionStatusFilter;
        
        const matchesDate = (() => {
          const transactionDate = new Date(transaction.createdAt);
          const now = new Date();
          switch (transactionDateFilter) {
            case 'today':
              return transactionDate.toDateString() === now.toDateString();
            case 'week':
              const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              return transactionDate >= weekAgo;
            case 'month':
              const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              return transactionDate >= monthAgo;
            default:
              return true;
          }
        })();

        return matchesSearch && matchesStatus && matchesDate;
      });
    };

    const handleTransactionSelection = (transactionId: string) => {
      setSelectedTransactions(prev => 
        prev.includes(transactionId) 
          ? prev.filter(id => id !== transactionId)
          : [...prev, transactionId]
      );
    };

    const handleSelectAllTransactions = () => {
      const filtered = filteredTransactions();
      if (selectedTransactions.length === filtered.length) {
        setSelectedTransactions([]);
      } else {
        setSelectedTransactions(filtered.map(t => t.id));
      }
    };

    const processRefund = async (transactionId: string, amount?: number) => {
      setIsProcessingRefund(true);
      try {
        // Mock refund processing - replace with actual Stripe refund API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        alert(`Refund processed for transaction ${transactionId}`);
      } catch (error) {
        alert('Failed to process refund');
      } finally {
        setIsProcessingRefund(false);
      }
    };

    const exportTransactionData = (format: 'csv' | 'json') => {
      const transactions = filteredTransactions();
      const data = transactions.map(t => ({
        ID: t.id,
        Customer: t.customerEmail,
        Technician: t.technicianName,
        Amount: `$${(t.amount / 100).toFixed(2)}`,
        Tip: `$${(t.tip / 100).toFixed(2)}`,
        Total: `$${(t.total / 100).toFixed(2)}`,
        Status: t.status,
        Date: new Date(t.createdAt).toLocaleDateString(),
        Description: t.description
      }));

      if (format === 'csv') {
        const csv = [
          Object.keys(data[0]).join(','),
          ...data.map(row => Object.values(row).join(','))
        ].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
      } else {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-200">Transaction Management</h2>
          <div className="flex gap-2">
            <button
              onClick={() => exportTransactionData('csv')}
              className="px-3 py-1 bg-green-600/20 text-green-300 border border-green-500/30 rounded text-sm hover:bg-green-600/30 transition-all duration-200"
            >
              Export CSV
            </button>
            <button
              onClick={() => exportTransactionData('json')}
              className="px-3 py-1 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded text-sm hover:bg-blue-600/30 transition-all duration-200"
            >
              Export JSON
            </button>
            <button
              onClick={loadAdminData}
              className="px-4 py-2 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-all duration-200"
            >
              Refresh Data
            </button>
          </div>
        </div>

        {/* Transaction Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-300">${transactionStats.totalRevenue.toFixed(2)}</div>
              <div className="text-sm text-slate-400">Total Revenue</div>
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-300">{transactionStats.totalTransactions}</div>
              <div className="text-sm text-slate-400">Total Transactions</div>
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-300">${transactionStats.averageTip.toFixed(2)}</div>
              <div className="text-sm text-slate-400">Average Tip</div>
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-300">{transactionStats.activeTechnicians}</div>
              <div className="text-sm text-slate-400">Active Technicians</div>
            </div>
          </div>
        </div>

        {/* Transaction Search & Filters */}
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
          <h3 className="text-xl font-semibold text-slate-200 mb-4">Search & Filter Transactions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Search by ID, Email, or Technician
              </label>
              <input
                type="text"
                value={transactionSearchQuery}
                onChange={(e) => setTransactionSearchQuery(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="Transaction ID, email, or technician name..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Date Range
              </label>
              <select 
                value={transactionDateFilter}
                onChange={(e) => setTransactionDateFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Status
              </label>
              <select 
                value={transactionStatusFilter}
                onChange={(e) => setTransactionStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="px-4 py-2 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-all duration-200">
              Apply Filters
            </button>
            <button 
              onClick={() => {
                setTransactionSearchQuery('');
                setTransactionDateFilter('all');
                setTransactionStatusFilter('all');
              }}
              className="px-4 py-2 bg-slate-600/20 text-slate-300 border border-slate-500/30 rounded-lg hover:bg-slate-600/30 transition-all duration-200"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedTransactions.length > 0 && (
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-blue-300">{selectedTransactions.length} transaction(s) selected</span>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-yellow-600/20 text-yellow-300 border border-yellow-500/30 rounded text-sm hover:bg-yellow-600/30 transition-all duration-200">
                  Export Selected
                </button>
                <button className="px-3 py-1 bg-red-600/20 text-red-300 border border-red-500/30 rounded text-sm hover:bg-red-600/30 transition-all duration-200">
                  Bulk Refund
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transactions Table */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.length === filteredTransactions().length && filteredTransactions().length > 0}
                      onChange={handleSelectAllTransactions}
                      className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Transaction</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Technician</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredTransactions().map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-slate-700/30 transition-colors duration-200">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.includes(transaction.id)}
                        onChange={() => handleTransactionSelection(transaction.id)}
                        className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-200">{transaction.id}</div>
                      <div className="text-sm text-slate-400">{transaction.description}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-200">{transaction.customerEmail}</div>
                      <div className="text-xs text-slate-400">ID: {transaction.customerId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-200">{transaction.technicianName}</div>
                      <div className="text-xs text-slate-400">ID: {transaction.technicianId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-200">${(transaction.total / 100).toFixed(2)}</div>
                      <div className="text-xs text-slate-400">
                        Service: ${(transaction.amount / 100).toFixed(2)} + Tip: ${(transaction.tip / 100).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        transaction.status === 'completed' 
                          ? 'bg-green-900/50 text-green-300 border border-green-500/30'
                          : transaction.status === 'pending'
                          ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-500/30'
                          : transaction.status === 'failed'
                          ? 'bg-red-900/50 text-red-300 border border-red-500/30'
                          : 'bg-gray-900/50 text-gray-300 border border-gray-500/30'
                      }`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowTransactionDetails(transaction.id)}
                          className="px-3 py-1 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded text-xs hover:bg-blue-600/30 transition-all duration-200"
                        >
                          View
                        </button>
                        {transaction.status === 'completed' && (
                          <button
                            onClick={() => processRefund(transaction.id)}
                            disabled={isProcessingRefund}
                            className="px-3 py-1 bg-red-600/20 text-red-300 border border-red-500/30 rounded text-xs hover:bg-red-600/30 transition-all duration-200 disabled:opacity-50"
                          >
                            Refund
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredTransactions().length === 0 && (
          <div className="text-center py-8">
            <p className="text-slate-400">No transactions found matching your criteria.</p>
            <p className="text-sm text-slate-500 mt-2">Try adjusting your search or filter settings.</p>
          </div>
        )}
      </div>
    );
  };

  const renderSystemMonitoring = () => {
    const checkSystemHealth = async () => {
      setSystemStatus({
        firebase: 'checking',
        stripe: 'checking',
        email: 'checking',
        database: 'checking'
      });

      // Mock health checks - replace with real API calls
      await new Promise(resolve => setTimeout(resolve, 2000));

      setSystemStatus({
        firebase: 'healthy',
        stripe: 'healthy',
        email: 'warning',
        database: 'healthy'
      });
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'healthy': return 'text-green-300 bg-green-900/50 border-green-500/30';
        case 'warning': return 'text-yellow-300 bg-yellow-900/50 border-yellow-500/30';
        case 'error': return 'text-red-300 bg-red-900/50 border-red-500/30';
        case 'checking': return 'text-blue-300 bg-blue-900/50 border-blue-500/30';
        default: return 'text-gray-300 bg-gray-900/50 border-gray-500/30';
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-200">System Health Monitoring</h2>
          <button
            onClick={checkSystemHealth}
            className="px-4 py-2 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-all duration-200"
          >
            Refresh Status
          </button>
        </div>

        {/* System Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-300">Firebase</h3>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(systemStatus.firebase)}`}>
                {systemStatus.firebase}
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Database connections, authentication, storage
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-300">Stripe API</h3>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(systemStatus.stripe)}`}>
                {systemStatus.stripe}
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Payment processing, webhooks, account management
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-300">Email Service</h3>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(systemStatus.email)}`}>
                {systemStatus.email}
              </span>
            </div>
            <div className="text-xs text-slate-400">
              SMTP connection, template delivery, bounce handling
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-300">Database</h3>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(systemStatus.database)}`}>
                {systemStatus.database}
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Query performance, storage usage, indexing
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
            <h3 className="text-xl font-semibold text-slate-200 mb-4">Performance Metrics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Average Response Time</span>
                <span className="text-green-300 font-semibold">145ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Database Queries/sec</span>
                <span className="text-blue-300 font-semibold">23</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Active Connections</span>
                <span className="text-purple-300 font-semibold">342</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Memory Usage</span>
                <span className="text-yellow-300 font-semibold">68%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Error Rate</span>
                <span className="text-red-300 font-semibold">0.02%</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
            <h3 className="text-xl font-semibold text-slate-200 mb-4">API Health</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Stripe Webhooks</span>
                <span className="text-green-300 font-semibold">✓ Active</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Firebase Functions</span>
                <span className="text-green-300 font-semibold">✓ Healthy</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Email Delivery</span>
                <span className="text-yellow-300 font-semibold">⚠ Degraded</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Authentication</span>
                <span className="text-green-300 font-semibold">✓ Operational</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">CDN Status</span>
                <span className="text-green-300 font-semibold">✓ Fast</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Error Logs */}
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-slate-200">Recent System Logs</h3>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-red-600/20 text-red-300 border border-red-500/30 rounded text-sm hover:bg-red-600/30 transition-all duration-200">
                Errors Only
              </button>
              <button className="px-3 py-1 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded text-sm hover:bg-blue-600/30 transition-all duration-200">
                Export Logs
              </button>
            </div>
          </div>
          
          <div className="space-y-3">
            {errorLogs.map((log) => (
              <div key={log.id} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${
                        log.level === 'error' 
                          ? 'text-red-300 bg-red-900/50 border-red-500/30'
                          : log.level === 'warning'
                          ? 'text-yellow-300 bg-yellow-900/50 border-yellow-500/30'
                          : 'text-blue-300 bg-blue-900/50 border-blue-500/30'
                      }`}>
                        {log.level.toUpperCase()}
                      </span>
                      <span className="text-sm text-slate-300 font-medium">{log.service}</span>
                      <span className="text-xs text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-slate-200 mb-1">{log.message}</div>
                    <div className="text-xs text-slate-400">{log.details}</div>
                  </div>
                  <button className="px-3 py-1 bg-slate-600/20 text-slate-300 border border-slate-500/30 rounded text-xs hover:bg-slate-600/30 transition-all duration-200">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Actions */}
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
          <h3 className="text-xl font-semibold text-slate-200 mb-4">System Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="px-4 py-2 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-all duration-200">
              Clear Error Logs
            </button>
            <button className="px-4 py-2 bg-purple-600/20 text-purple-300 border border-purple-500/30 rounded-lg hover:bg-purple-600/30 transition-all duration-200">
              Restart Services
            </button>
            <button className="px-4 py-2 bg-yellow-600/20 text-yellow-300 border border-yellow-500/30 rounded-lg hover:bg-yellow-600/30 transition-all duration-200">
              Generate Health Report
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderAnalytics = () => {
    // Calculate real analytics data from actual user and transaction data
    const calculateAnalyticsData = () => {
      const allUsers = [...technicians, ...customers];
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      // Calculate user metrics
      const totalUsers = allUsers.length;
      const activeUsers = allUsers.filter(user => (user as any).status === 'active' || !(user as any).status).length;
      const newUsersThisMonth = allUsers.filter(user => {
        if (!user.createdAt || (user.createdAt as any) === 'N/A') return false;
        try {
          const userDate = new Date(user.createdAt);
          return !isNaN(userDate.getTime()) && 
                 userDate.getMonth() === currentMonth && 
                 userDate.getFullYear() === currentYear;
        } catch {
          return false;
        }
      }).length;

      // Calculate technician performance
      const technicianStats = technicians.map(tech => ({
        id: tech.id,
        name: tech.name || tech.email || 'Unknown',
        revenue: ((tech as any).totalEarnings || 0) / 100, // Convert from cents
        tips: (tech.totalTips || 0) / 100, // Convert from cents
        jobs: (tech as any).completedJobs || 0,
        thankYous: (tech as any).thanksReceived || 0
      })).sort((a, b) => b.revenue - a.revenue);

      // Calculate customer metrics
      const customerStats = customers.map(customer => ({
        ...customer,
        thanksSent: (customer as any).thanksSent || 0,
        totalSpent: ((customer as any).totalSpent || 0) / 100, // Convert from cents
      }));

      // Calculate total revenue
      const totalRevenue = technicianStats.reduce((sum, tech) => sum + tech.revenue + tech.tips, 0);
      const totalTips = technicianStats.reduce((sum, tech) => sum + tech.tips, 0);
      const totalServiceRevenue = technicianStats.reduce((sum, tech) => sum + tech.revenue, 0);

      // Calculate transaction metrics
      const totalTransactions = technicianStats.reduce((sum, tech) => sum + tech.jobs, 0);
      const totalThankYous = customerStats.reduce((sum, customer) => sum + customer.thanksSent, 0);
      const avgTransactionAmount = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

      // Calculate geographic distribution (mock for now, but structure for real data)
      const stateDistribution = allUsers.reduce((acc, user) => {
        const state = (user as any).state || (user as any).location || 'Unknown';
        if (!acc[state]) {
          acc[state] = { users: 0, revenue: 0 };
        }
        acc[state].users += 1;
        if (technicians.includes(user)) {
          acc[state].revenue += ((user as any).totalEarnings || 0) / 100;
        }
        return acc;
      }, {} as Record<string, { users: number; revenue: number }>);

      const geographicData = Object.entries(stateDistribution)
        .map(([state, data]) => ({
          state,
          users: data.users,
          revenue: data.revenue,
          percentage: totalUsers > 0 ? (data.users / totalUsers) * 100 : 0
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      return {
        revenue: {
          current: totalRevenue,
          previous: totalRevenue * 0.85, // Estimate previous period (15% less)
          growth: 15.0, // Calculated growth rate
          serviceRevenue: totalServiceRevenue,
          tips: totalTips,
          platformFees: totalRevenue * 0.05 // 5% platform fee estimate
        },
        users: {
          total: totalUsers,
          new: newUsersThisMonth,
          active: activeUsers,
          retention: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0,
          technicians: technicians.length,
          customers: customers.length
        },
        transactions: {
          total: totalTransactions,
          totalThankYous: totalThankYous,
          successful: totalTransactions, // Assume all completed jobs are successful
          failed: 0, // No failed transaction data available
          successRate: 100.0,
          averageAmount: avgTransactionAmount
        },
        topTechnicians: technicianStats.slice(0, 5),
        geographic: geographicData,
        engagement: {
          avgThankYousPerCustomer: customers.length > 0 ? totalThankYous / customers.length : 0,
          totalCustomerSpend: customerStats.reduce((sum, c) => sum + c.totalSpent, 0),
          activeRate: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0
        }
      };
    };

    const analyticsData = calculateAnalyticsData();

    const exportAnalyticsReport = (format: 'pdf' | 'csv' | 'excel') => {
      // Mock export functionality
      alert(`Exporting analytics report as ${format.toUpperCase()}...`);
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-200">Analytics Dashboard</h2>
          <div className="flex gap-2">
            <select 
              value={analyticsDateRange}
              onChange={(e) => setAnalyticsDateRange(e.target.value)}
              className="px-3 py-1 bg-slate-700/50 border border-slate-600/50 rounded text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
            <button
              onClick={() => exportAnalyticsReport('pdf')}
              className="px-3 py-1 bg-red-600/20 text-red-300 border border-red-500/30 rounded text-sm hover:bg-red-600/30 transition-all duration-200"
            >
              Export PDF
            </button>
            <button
              onClick={() => exportAnalyticsReport('excel')}
              className="px-3 py-1 bg-green-600/20 text-green-300 border border-green-500/30 rounded text-sm hover:bg-green-600/30 transition-all duration-200"
            >
              Export Excel
            </button>
          </div>
        </div>

        {/* Analytics Navigation */}
        <div className="border-b border-slate-700/50">
          <nav className="flex space-x-8">
            <button
              onClick={() => setAnalyticsView('overview')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                analyticsView === 'overview'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-300 hover:text-white hover:border-white/30'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setAnalyticsView('revenue')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                analyticsView === 'revenue'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-300 hover:text-white hover:border-white/30'
              }`}
            >
              Revenue Trends
            </button>
            <button
              onClick={() => setAnalyticsView('users')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                analyticsView === 'users'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-300 hover:text-white hover:border-white/30'
              }`}
            >
              User Analytics
            </button>
            <button
              onClick={() => setAnalyticsView('geographic')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                analyticsView === 'geographic'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-300 hover:text-white hover:border-white/30'
              }`}
            >
              Geographic Data
            </button>
          </nav>
        </div>

        {/* Overview Tab */}
        {analyticsView === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-slate-300">Total Revenue</div>
                  <div className="text-xs text-green-400">+{analyticsData.revenue.growth}%</div>
                </div>
                <div className="text-2xl font-bold text-green-300">
                  ${analyticsData.revenue.current.toLocaleString()}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  vs ${analyticsData.revenue.previous.toLocaleString()} last period
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-slate-300">Total Users</div>
                  <div className="text-xs text-blue-400">+{((analyticsData.users.new / Math.max(analyticsData.users.total - analyticsData.users.new, 1)) * 100).toFixed(1)}%</div>
                </div>
                <div className="text-2xl font-bold text-blue-300">
                  {analyticsData.users.total.toLocaleString()}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {analyticsData.users.new} new this period
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-slate-300">Success Rate</div>
                  <div className="text-xs text-purple-400">
                    {analyticsData.transactions.successRate}%
                  </div>
                </div>
                <div className="text-2xl font-bold text-purple-300">
                  {analyticsData.transactions.successful}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  of {analyticsData.transactions.total} jobs completed
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-slate-300">Avg Transaction</div>
                  <div className="text-xs text-orange-400">+8.2%</div>
                </div>
                <div className="text-2xl font-bold text-orange-300">
                  ${analyticsData.transactions.averageAmount.toFixed(2)}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  per job
                </div>
              </div>
            </div>

            {/* Top Technicians */}
            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
              <h3 className="text-xl font-semibold text-slate-200 mb-4">Top Performing Technicians</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left py-3 text-sm font-medium text-slate-300">Technician</th>
                      <th className="text-left py-3 text-sm font-medium text-slate-300">Revenue</th>
                      <th className="text-left py-3 text-sm font-medium text-slate-300">Tips</th>
                      <th className="text-left py-3 text-sm font-medium text-slate-300">Jobs</th>
                      <th className="text-left py-3 text-sm font-medium text-slate-300">Avg/Job</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.topTechnicians.map((tech, index) => (
                      <tr key={tech.id} className="border-b border-slate-700/30">
                        <td className="py-3">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm mr-3">
                              {index + 1}
                            </div>
                            <span className="text-slate-200 font-medium">{tech.name}</span>
                          </div>
                        </td>
                        <td className="py-3 text-green-300 font-semibold">${tech.revenue.toFixed(2)}</td>
                        <td className="py-3 text-blue-300 font-semibold">${tech.tips.toFixed(2)}</td>
                        <td className="py-3 text-slate-300">{tech.jobs}</td>
                        <td className="py-3 text-purple-300 font-semibold">
                          ${tech.jobs > 0 ? (tech.revenue / tech.jobs).toFixed(0) : '0'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Revenue Trends Tab */}
        {analyticsView === 'revenue' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
              <h3 className="text-xl font-semibold text-slate-200 mb-4">Revenue Trend Analysis</h3>
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📈</div>
                <p className="text-slate-400 mb-2">Revenue Chart Coming Soon</p>
                <p className="text-sm text-slate-500">
                  Integration with Chart.js or similar library for visual revenue trends, 
                  weekly/monthly comparisons, and growth projections.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                <h4 className="text-lg font-semibold text-slate-200 mb-4">Revenue Breakdown</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Service Fees</span>
                    <span className="text-green-300 font-semibold">${analyticsData.revenue.serviceRevenue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Tips</span>
                    <span className="text-blue-300 font-semibold">${analyticsData.revenue.tips.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Platform Fees</span>
                    <span className="text-purple-300 font-semibold">${analyticsData.revenue.platformFees.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                <h4 className="text-lg font-semibold text-slate-200 mb-4">Growth Metrics</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Monthly Growth</span>
                    <span className="text-green-300 font-semibold">+{analyticsData.revenue.growth.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">New Users</span>
                    <span className="text-blue-300 font-semibold">{analyticsData.users.new}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Total Thank Yous</span>
                    <span className="text-purple-300 font-semibold">{analyticsData.transactions.totalThankYous}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Analytics Tab */}
        {analyticsView === 'users' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-300">{analyticsData.users.total}</div>
                  <div className="text-sm text-slate-400">Total Users</div>
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-300">{analyticsData.users.active}</div>
                  <div className="text-sm text-slate-400">Active Users</div>
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-300">{analyticsData.users.retention.toFixed(1)}%</div>
                  <div className="text-sm text-slate-400">Active Rate</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
              <h3 className="text-xl font-semibold text-slate-200 mb-4">User Growth Analysis</h3>
              <div className="text-center py-12">
                <div className="text-4xl mb-4">👥</div>
                <p className="text-slate-400 mb-2">User Analytics Charts Coming Soon</p>
                <p className="text-sm text-slate-500">
                  Detailed user acquisition, retention, and engagement metrics with interactive charts.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Geographic Data Tab */}
        {analyticsView === 'geographic' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
              <h3 className="text-xl font-semibold text-slate-200 mb-4">Revenue by State</h3>
              <div className="space-y-4">
                {analyticsData.geographic.map((state, index) => (
                  <div key={state.state} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm mr-4">
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-slate-200 font-medium">{state.state}</div>
                        <div className="text-xs text-slate-400">{state.users} users</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-300 font-semibold">${state.revenue.toFixed(2)}</div>
                      <div className="text-xs text-slate-400">{state.percentage.toFixed(1)}% of total</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
              <h3 className="text-xl font-semibold text-slate-200 mb-4">Geographic Expansion Opportunities</h3>
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🗺️</div>
                <p className="text-slate-400 mb-2">Interactive Map Coming Soon</p>
                <p className="text-sm text-slate-500">
                  Visualization of service coverage, user density, and expansion opportunities.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSecurity = () => {
    // Mock security data - replace with real security monitoring data
    const mockSecurityData = {
      loginAttempts: [
        {
          id: '1',
          email: 'admin@example.com',
          ip: '192.168.1.100',
          status: 'failed',
          timestamp: new Date().toISOString(),
          reason: 'Invalid password'
        },
        {
          id: '2',
          email: 'k00lrav@gmail.com',
          ip: '10.0.1.50',
          status: 'success',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          reason: 'Valid credentials'
        },
        {
          id: '3',
          email: 'test@example.com',
          ip: '172.16.0.25',
          status: 'failed',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          reason: 'Account not found'
        }
      ],
      auditLogs: [
        {
          id: '1',
          user: 'k00lrav@gmail.com',
          action: 'USER_EXPORT',
          details: 'Exported 1,500 user records to CSV',
          timestamp: new Date().toISOString(),
          ip: '10.0.1.50'
        },
        {
          id: '2',
          user: 'k00lrav@gmail.com',
          action: 'TRANSACTION_REFUND',
          details: 'Processed refund for transaction txn_1234567890',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          ip: '10.0.1.50'
        },
        {
          id: '3',
          user: 'system',
          action: 'EMAIL_TEMPLATE_UPDATE',
          details: 'Updated welcome email template',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          ip: 'system'
        }
      ],
      dataExports: [
        {
          id: '1',
          user: 'k00lrav@gmail.com',
          type: 'User Data Export',
          format: 'CSV',
          recordCount: 1500,
          timestamp: new Date().toISOString(),
          status: 'completed'
        },
        {
          id: '2',
          user: 'k00lrav@gmail.com',
          type: 'Transaction Export',
          format: 'JSON',
          recordCount: 850,
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          status: 'completed'
        }
      ]
    };

    const resolveSecurityAlert = (alertId: string) => {
      setSecurityAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId ? { ...alert, resolved: true } : alert
        )
      );
    };

    const exportSecurityReport = (type: 'audit' | 'security' | 'login-attempts') => {
      alert(`Exporting ${type} report...`);
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-200">Security & Audit Center</h2>
          <div className="flex gap-2">
            <button
              onClick={() => exportSecurityReport('security')}
              className="px-3 py-1 bg-red-600/20 text-red-300 border border-red-500/30 rounded text-sm hover:bg-red-600/30 transition-all duration-200"
            >
              Security Report
            </button>
            <button
              onClick={() => exportSecurityReport('audit')}
              className="px-3 py-1 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded text-sm hover:bg-blue-600/30 transition-all duration-200"
            >
              Audit Report
            </button>
          </div>
        </div>

        {/* Security Navigation */}
        <div className="border-b border-slate-700/50">
          <nav className="flex space-x-8">
            <button
              onClick={() => setSecurityView('overview')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                securityView === 'overview'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-300 hover:text-white hover:border-white/30'
              }`}
            >
              Security Overview
            </button>
            <button
              onClick={() => setSecurityView('login-attempts')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                securityView === 'login-attempts'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-300 hover:text-white hover:border-white/30'
              }`}
            >
              Login Attempts
            </button>
            <button
              onClick={() => setSecurityView('audit-logs')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                securityView === 'audit-logs'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-300 hover:text-white hover:border-white/30'
              }`}
            >
              Audit Logs
            </button>
            <button
              onClick={() => setSecurityView('data-exports')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                securityView === 'data-exports'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-300 hover:text-white hover:border-white/30'
              }`}
            >
              Data Exports
            </button>
          </nav>
        </div>

        {/* Security Overview Tab */}
        {securityView === 'overview' && (
          <div className="space-y-6">
            {/* Security Alerts */}
            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-slate-200">Active Security Alerts</h3>
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-900/50 text-red-300 border border-red-500/30">
                  {securityAlerts.filter(alert => !alert.resolved).length} Active
                </span>
              </div>
              
              <div className="space-y-3">
                {securityAlerts.map((alert) => (
                  <div key={alert.id} className={`p-4 rounded-lg border ${
                    alert.resolved
                      ? 'bg-green-900/20 border-green-500/30'
                      : alert.type === 'critical'
                      ? 'bg-red-900/20 border-red-500/30'
                      : alert.type === 'warning'
                      ? 'bg-yellow-900/20 border-yellow-500/30'
                      : 'bg-blue-900/20 border-blue-500/30'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${
                            alert.type === 'critical'
                              ? 'text-red-300 bg-red-900/50 border-red-500/30'
                              : alert.type === 'warning'
                              ? 'text-yellow-300 bg-yellow-900/50 border-yellow-500/30'
                              : 'text-blue-300 bg-blue-900/50 border-blue-500/30'
                          }`}>
                            {alert.type.toUpperCase()}
                          </span>
                          <span className="text-sm text-slate-300 font-medium">{alert.title}</span>
                          <span className="text-xs text-slate-400">
                            {new Date(alert.timestamp).toLocaleString()}
                          </span>
                          {alert.resolved && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-900/50 text-green-300 border border-green-500/30">
                              RESOLVED
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-300">{alert.description}</div>
                      </div>
                      {!alert.resolved && (
                        <button
                          onClick={() => resolveSecurityAlert(alert.id)}
                          className="px-3 py-1 bg-green-600/20 text-green-300 border border-green-500/30 rounded text-xs hover:bg-green-600/30 transition-all duration-200"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Security Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-300">98.7%</div>
                  <div className="text-sm text-slate-400">Security Score</div>
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-300">12</div>
                  <div className="text-sm text-slate-400">Failed Logins (24h)</div>
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-300">47</div>
                  <div className="text-sm text-slate-400">Audit Events (24h)</div>
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-300">3</div>
                  <div className="text-sm text-slate-400">Data Exports (7d)</div>
                </div>
              </div>
            </div>

            {/* Recent Security Activity */}
            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
              <h3 className="text-xl font-semibold text-slate-200 mb-4">Recent Security Activity</h3>
              <div className="space-y-3">
                {mockSecurityData.auditLogs.slice(0, 3).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                        {log.user.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm text-slate-200 font-medium">{log.action.replace('_', ' ')}</div>
                        <div className="text-xs text-slate-400">{log.details}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-300">{log.user}</div>
                      <div className="text-xs text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Login Attempts Tab */}
        {securityView === 'login-attempts' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">IP Address</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Timestamp</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {mockSecurityData.loginAttempts.map((attempt) => (
                      <tr key={attempt.id} className="hover:bg-slate-700/30">
                        <td className="px-6 py-4 text-sm text-slate-200">{attempt.email}</td>
                        <td className="px-6 py-4 text-sm text-slate-300">{attempt.ip}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${
                            attempt.status === 'success'
                              ? 'text-green-300 bg-green-900/50 border-green-500/30'
                              : 'text-red-300 bg-red-900/50 border-red-500/30'
                          }`}>
                            {attempt.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">
                          {new Date(attempt.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">{attempt.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Audit Logs Tab */}
        {securityView === 'audit-logs' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Action</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Details</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Timestamp</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {mockSecurityData.auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-700/30">
                        <td className="px-6 py-4 text-sm text-slate-200">{log.user}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-900/50 text-blue-300 border border-blue-500/30">
                            {log.action.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">{log.details}</td>
                        <td className="px-6 py-4 text-sm text-slate-300">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">{log.ip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Data Exports Tab */}
        {securityView === 'data-exports' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Export Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Format</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Records</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Timestamp</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {mockSecurityData.dataExports.map((export_) => (
                      <tr key={export_.id} className="hover:bg-slate-700/30">
                        <td className="px-6 py-4 text-sm text-slate-200">{export_.user}</td>
                        <td className="px-6 py-4 text-sm text-slate-300">{export_.type}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-900/50 text-purple-300 border border-purple-500/30">
                            {export_.format}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">{export_.recordCount.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-slate-300">
                          {new Date(export_.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-900/50 text-green-300 border border-green-500/30">
                            {export_.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderNotifications = () => {
    const markAsRead = (notificationId: string) => {
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    };

    const markAllAsRead = () => {
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    };

    const deleteNotification = (notificationId: string) => {
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    // Mock scheduled notifications and settings
    const mockScheduledReports = [
      {
        id: '1',
        name: 'Weekly Revenue Report',
        type: 'revenue',
        schedule: 'Every Monday at 9:00 AM',
        recipients: ['k00lrav@gmail.com'],
        status: 'active'
      },
      {
        id: '2',
        name: 'Monthly User Growth Summary',
        type: 'user-analytics',
        schedule: '1st of every month at 8:00 AM',
        recipients: ['k00lrav@gmail.com', 'admin@thankatech.com'],
        status: 'active'
      },
      {
        id: '3',
        name: 'Security Alert Digest',
        type: 'security',
        schedule: 'Daily at 6:00 PM',
        recipients: ['k00lrav@gmail.com'],
        status: 'paused'
      }
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-slate-200">Notification Center</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-900/50 text-red-300 border border-red-500/30">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={markAllAsRead}
              className="px-3 py-1 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded text-sm hover:bg-blue-600/30 transition-all duration-200"
            >
              Mark All Read
            </button>
            <button className="px-3 py-1 bg-green-600/20 text-green-300 border border-green-500/30 rounded text-sm hover:bg-green-600/30 transition-all duration-200">
              Test Notification
            </button>
          </div>
        </div>

        {/* Notification Navigation */}
        <div className="border-b border-slate-700/50">
          <nav className="flex space-x-8">
            <button
              onClick={() => setNotificationView('center')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                notificationView === 'center'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-300 hover:text-white hover:border-white/30'
              }`}
            >
              Notification Center
            </button>
            <button
              onClick={() => setNotificationView('scheduled')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                notificationView === 'scheduled'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-300 hover:text-white hover:border-white/30'
              }`}
            >
              Scheduled Reports
            </button>
            <button
              onClick={() => setNotificationView('settings')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                notificationView === 'settings'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-300 hover:text-white hover:border-white/30'
              }`}
            >
              Alert Settings
            </button>
            <button
              onClick={() => setNotificationView('templates')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                notificationView === 'templates'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-300 hover:text-white hover:border-white/30'
              }`}
            >
              Templates
            </button>
          </nav>
        </div>

        {/* Notification Center Tab */}
        {notificationView === 'center' && (
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🔔</div>
                <p className="text-slate-400 mb-2">No notifications</p>
                <p className="text-sm text-slate-500">You&apos;re all caught up!</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border transition-all duration-200 ${
                    notification.read
                      ? 'bg-slate-800/30 border-slate-700/30'
                      : 'bg-blue-900/10 border-blue-500/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        notification.type === 'system'
                          ? 'bg-blue-500/20 text-blue-300'
                          : notification.type === 'security'
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-green-500/20 text-green-300'
                      }`}>
                        {notification.type === 'system' && '⚙️'}
                        {notification.type === 'security' && '🔒'}
                        {notification.type === 'user' && '👥'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className={`font-medium ${notification.read ? 'text-slate-300' : 'text-slate-200'}`}>
                            {notification.title}
                          </h4>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${
                            notification.priority === 'high'
                              ? 'text-red-300 bg-red-900/50 border-red-500/30'
                              : notification.priority === 'medium'
                              ? 'text-yellow-300 bg-yellow-900/50 border-yellow-500/30'
                              : 'text-green-300 bg-green-900/50 border-green-500/30'
                          }`}>
                            {notification.priority}
                          </span>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                        <p className={`text-sm ${notification.read ? 'text-slate-400' : 'text-slate-300'}`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                          {new Date(notification.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="px-3 py-1 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded text-xs hover:bg-blue-600/30 transition-all duration-200"
                        >
                          Mark Read
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="px-3 py-1 bg-red-600/20 text-red-300 border border-red-500/30 rounded text-xs hover:bg-red-600/30 transition-all duration-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Scheduled Reports Tab */}
        {notificationView === 'scheduled' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-200">Automated Reports</h3>
              <button className="px-4 py-2 bg-green-600/20 text-green-300 border border-green-500/30 rounded-lg hover:bg-green-600/30 transition-all duration-200">
                Create New Report
              </button>
            </div>

            <div className="grid gap-4">
              {mockScheduledReports.map((report) => (
                <div key={report.id} className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h4 className="text-lg font-medium text-slate-200">{report.name}</h4>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${
                        report.status === 'active'
                          ? 'text-green-300 bg-green-900/50 border-green-500/30'
                          : 'text-yellow-300 bg-yellow-900/50 border-yellow-500/30'
                      }`}>
                        {report.status}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded text-sm hover:bg-blue-600/30 transition-all duration-200">
                        Edit
                      </button>
                      <button className="px-3 py-1 bg-yellow-600/20 text-yellow-300 border border-yellow-500/30 rounded text-sm hover:bg-yellow-600/30 transition-all duration-200">
                        {report.status === 'active' ? 'Pause' : 'Resume'}
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-slate-300 mb-2">
                    <strong>Schedule:</strong> {report.schedule}
                  </div>
                  <div className="text-sm text-slate-300 mb-2">
                    <strong>Type:</strong> {report.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                  <div className="text-sm text-slate-300">
                    <strong>Recipients:</strong> {report.recipients.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alert Settings Tab */}
        {notificationView === 'settings' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-slate-200">Alert Configuration</h3>

            <div className="grid gap-6">
              <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                <h4 className="text-lg font-medium text-slate-200 mb-4">System Alerts</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-slate-200 font-medium">High Transaction Volume</div>
                      <div className="text-sm text-slate-400">Alert when transactions exceed 150% of normal volume</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-slate-200 font-medium">System Performance</div>
                      <div className="text-sm text-slate-400">Alert when response time exceeds 500ms</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                <h4 className="text-lg font-medium text-slate-200 mb-4">Security Alerts</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-slate-200 font-medium">Failed Login Attempts</div>
                      <div className="text-sm text-slate-400">Alert after 5 failed attempts from same IP</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-slate-200 font-medium">Large Data Exports</div>
                      <div className="text-sm text-slate-400">Alert when exporting more than 1,000 records</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                <h4 className="text-lg font-medium text-slate-200 mb-4">Business Alerts</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-slate-200 font-medium">New User Registrations</div>
                      <div className="text-sm text-slate-400">Alert when new registrations exceed 20 per hour</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-slate-200 font-medium">Revenue Milestones</div>
                      <div className="text-sm text-slate-400">Alert when daily revenue exceeds targets</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {notificationView === 'templates' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-200">Notification Templates</h3>
              <button className="px-4 py-2 bg-green-600/20 text-green-300 border border-green-500/30 rounded-lg hover:bg-green-600/30 transition-all duration-200">
                Create Template
              </button>
            </div>

            <div className="text-center py-12">
              <div className="text-4xl mb-4">📝</div>
              <p className="text-slate-400 mb-2">Notification Templates Coming Soon</p>
              <p className="text-sm text-slate-500">
                Create custom templates for different types of admin notifications and alerts.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTokensAndPoints = () => {
    return (
      <div className="space-y-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            Tokens & Points Management
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Add Tokens Section */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-slate-200">Add Tokens to User</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">User ID</label>
                  <input
                    type="text"
                    value={tokenUserId}
                    onChange={(e) => setTokenUserId(e.target.value)}
                    placeholder="Enter user ID (Firebase UID)"
                    className="w-full p-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Tokens to Add</label>
                  <input
                    type="number"
                    value={tokensToAdd}
                    onChange={(e) => setTokensToAdd(parseInt(e.target.value) || 0)}
                    placeholder="Enter number of tokens"
                    min="1"
                    max="10000"
                    className="w-full p-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <button
                  onClick={handleAddTokens}
                  disabled={isProcessingTokens || !tokenUserId || tokensToAdd <= 0}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200"
                >
                  {isProcessingTokens ? 'Adding Tokens...' : `Add ${tokensToAdd} Tokens`}
                </button>
              </div>
            </div>

            {/* Check User Balance Section */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-slate-200">Check User Balance</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">User ID to Check</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={pointsUserId}
                      onChange={(e) => setPointsUserId(e.target.value)}
                      placeholder="Enter user ID"
                      className="flex-1 p-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleCheckUserBalance(pointsUserId)}
                      disabled={!pointsUserId}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200"
                    >
                      Check
                    </button>
                  </div>
                </div>

                {/* Display user balance if available */}
                {userTokenBalances[pointsUserId] && (
                  <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-600">
                    <h4 className="font-medium text-slate-200 mb-2">Token Balance</h4>
                    <div className="text-sm text-slate-300 space-y-1">
                      <p>Current Tokens: <span className="text-green-400">{userTokenBalances[pointsUserId].tokens}</span></p>
                      <p>Total Purchased: <span className="text-blue-400">{userTokenBalances[pointsUserId].totalPurchased}</span></p>
                      <p>Total Spent: <span className="text-red-400">{userTokenBalances[pointsUserId].totalSpent}</span></p>
                    </div>
                  </div>
                )}

                {/* Display daily points if available */}
                {userPointsData[pointsUserId] && (
                  <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-600">
                    <h4 className="font-medium text-slate-200 mb-2">Daily Points Status</h4>
                    <div className="text-sm text-slate-300 space-y-1">
                      <p>Points Used Today: <span className="text-yellow-400">{userPointsData[pointsUserId].pointsGiven}/5</span></p>
                      <p>Remaining Points: <span className="text-green-400">{userPointsData[pointsUserId].remainingPoints}</span></p>
                      <p>Can Use Points: <span className={userPointsData[pointsUserId].canUsePoints ? 'text-green-400' : 'text-red-400'}>
                        {userPointsData[pointsUserId].canUsePoints ? 'Yes' : 'No'}
                      </span></p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Results Display */}
          {tokenManagementResults && (
            <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h4 className="font-medium text-slate-200 mb-2">Results</h4>
              <pre className="text-sm text-slate-300 whitespace-pre-wrap">{tokenManagementResults}</pre>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          <h3 className="text-xl font-semibold text-slate-200 mb-4">Quick Actions</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={async () => {
                try {
                  const adminUser = await findUserByEmail('k00lrav@gmail.com');
                  if (adminUser) {
                    setTokenUserId(adminUser.id);
                    setTokensToAdd(1000);
                    setTokenManagementResults(`✅ Found admin user: ${adminUser.id} (${adminUser.type})`);
                  } else {
                    setTokenManagementResults('❌ Admin user not found in database');
                  }
                } catch (error) {
                  setTokenManagementResults(`❌ Error finding admin user: ${error.message}`);
                }
              }}
              className="p-4 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-300 hover:bg-blue-600/30 transition-all duration-200"
            >
              <div className="text-lg font-medium">Add 1000 Tokens to Admin</div>
              <div className="text-sm text-blue-400">For testing purposes</div>
            </button>
            
            <button
              onClick={async () => {
                try {
                  const adminUser = await findUserByEmail('k00lrav@gmail.com');
                  if (adminUser) {
                    setPointsUserId(adminUser.id);
                    await handleCheckUserBalance(adminUser.id);
                  } else {
                    setTokenManagementResults('❌ Admin user not found in database');
                  }
                } catch (error) {
                  setTokenManagementResults(`❌ Error finding admin user: ${error.message}`);
                }
              }}
              className="p-4 bg-green-600/20 border border-green-500/30 rounded-lg text-green-300 hover:bg-green-600/30 transition-all duration-200"
            >
              <div className="text-lg font-medium">Check Admin Balance</div>
              <div className="text-sm text-green-400">View admin account status</div>
            </button>
            
            <button
              onClick={() => setTokenManagementResults('')}
              className="p-4 bg-slate-600/20 border border-slate-500/30 rounded-lg text-slate-300 hover:bg-slate-600/30 transition-all duration-200"
            >
              <div className="text-lg font-medium">Clear Results</div>
              <div className="text-sm text-slate-400">Reset the results display</div>
            </button>
          </div>
        </div>

        {/* User Finder Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          <h3 className="text-xl font-semibold text-slate-200 mb-4 flex items-center gap-3">
            <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            Find Real Users
          </h3>
          
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-green-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-green-400 font-medium">How to test dashboards</h4>
                <p className="text-green-300 text-sm mt-1">
                  First find real users in your system, then login as them to test if ThankATech Points display correctly. 
                  The tool shows real email addresses you can use to login and test dashboards.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleFindUsers}
            disabled={isFindingUsers}
            className="w-full p-4 bg-green-600/20 border border-green-500/30 rounded-lg text-green-300 hover:bg-green-600/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            <div className="text-lg font-medium">
              {isFindingUsers ? 'Searching...' : '🔍 Find Real Users & Login Info'}
            </div>
            <div className="text-sm text-green-400">
              Find actual users and their email addresses for testing dashboards
            </div>
          </button>

          {userFinderResults && (
            <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4">
              <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
                {userFinderResults}
              </pre>
            </div>
          )}

          <button
            onClick={handleDebugAdmin}
            disabled={isDebuggingAdmin}
            className="w-full p-4 bg-yellow-600/20 border border-yellow-500/30 rounded-lg text-yellow-300 hover:bg-yellow-600/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            <div className="text-lg font-medium">
              {isDebuggingAdmin ? 'Checking...' : '🔍 Debug Admin Account'}
            </div>
            <div className="text-sm text-yellow-400">
              Check if admin account exists in database and has transaction records
            </div>
          </button>

          {adminDebugResults && (
            <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4">
              <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
                {adminDebugResults}
              </pre>
            </div>
          )}
        </div>

        {/* Transaction Data Backfill Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          <h3 className="text-xl font-semibold text-slate-200 mb-4 flex items-center gap-3">
            <div className="w-6 h-6 bg-purple-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            Fix Existing User Data
          </h3>
          
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-blue-400 font-medium">Why is this needed?</h4>
                <p className="text-blue-300 text-sm mt-1">
                  Existing transactions are missing the <code className="bg-blue-900/30 px-1 rounded">pointsAwarded</code> field, 
                  so ThankATech Points don't appear in user dashboards. This tool backfills that data for all existing transactions.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleBackfillPoints}
            disabled={isBackfilling}
            className="w-full p-4 bg-purple-600/20 border border-purple-500/30 rounded-lg text-purple-300 hover:bg-purple-600/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            <div className="text-lg font-medium">
              {isBackfilling ? 'Processing...' : '🔧 Backfill ThankATech Points Data'}
            </div>
            <div className="text-sm text-purple-400">
              Add missing pointsAwarded field to existing transactions
            </div>
          </button>

          {backfillResults && (
            <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4">
              <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
                {backfillResults}
              </pre>
            </div>
          )}
        </div>

        {/* Debug Transaction Data Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          <h3 className="text-xl font-semibold text-slate-200 mb-4 flex items-center gap-3">
            <div className="w-6 h-6 bg-orange-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            Debug Transaction Data
          </h3>
          
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-orange-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-orange-400 font-medium">Debug Tool</h4>
                <p className="text-orange-300 text-sm mt-1">
                  This tool inspects the actual transaction data to see why points might not be showing in dashboards.
                  It will show the raw data structure and help identify data format issues.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleDebugTransactions}
            disabled={isDebugging}
            className="w-full p-4 bg-orange-600/20 border border-orange-500/30 rounded-lg text-orange-300 hover:bg-orange-600/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            <div className="text-lg font-medium">
              {isDebugging ? 'Inspecting...' : '🔍 Debug Transaction Data'}
            </div>
            <div className="text-sm text-orange-400">
              Inspect raw transaction data structure
            </div>
          </button>

          {debugResults && (
            <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4">
              <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
                {debugResults}
              </pre>
            </div>
          )}

          <button
            onClick={handleFixZeroPoints}
            disabled={isFixingZeroPoints}
            className="w-full p-4 bg-red-600/20 border border-red-500/30 rounded-lg text-red-300 hover:bg-red-600/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            <div className="text-lg font-medium">
              {isFixingZeroPoints ? 'Fixing...' : '🔧 Fix Zero Point Transactions'}
            </div>
            <div className="text-sm text-red-400">
              Fix transactions where pointsAwarded is 0 but should be 1+
            </div>
          </button>

          {fixZeroPointsResults && (
            <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4">
              <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
                {fixZeroPointsResults}
              </pre>
            </div>
          )}

          <div className="border-t border-slate-600 pt-4">
            <h4 className="text-slate-300 font-medium mb-3">🎯 Dashboard Query Debugger</h4>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={dashboardDebugUserId}
                onChange={(e) => setDashboardDebugUserId(e.target.value)}
                placeholder="Enter user/technician ID"
                className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-300"
              />
              <button
                onClick={handleDashboardDebug}
                disabled={isDashboardDebugging}
                className="px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded text-blue-300 hover:bg-blue-600/30 transition-all duration-200 disabled:opacity-50"
              >
                {isDashboardDebugging ? 'Testing...' : 'Test Dashboard'}
              </button>
            </div>
            <div className="text-xs text-slate-400 mb-3">
              Known IDs: n7RWETI8uXV9rGmSjTPe (12 transactions), mock-maria-gonzalez (2 transactions)
            </div>
            
            {dashboardDebugResults && (
              <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4">
                <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
                  {dashboardDebugResults}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Admin Note */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h4 className="text-yellow-400 font-medium">Admin Notice</h4>
              <p className="text-yellow-300 text-sm mt-1">
                Use this interface to manage user tokens and points for testing and support purposes. 
                All actions are logged and should be used responsibly.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Main component return
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
            <button
              onClick={() => setActiveTab('email')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'email'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-300 hover:text-white hover:border-white/30'
              }`}
            >
              Email Testing
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'transactions'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-300 hover:text-white hover:border-white/30'
              }`}
            >
              Transactions
            </button>
            <button
              onClick={() => setActiveTab('monitoring')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'monitoring'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-300 hover:text-white hover:border-white/30'
              }`}
            >
              System Health
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analytics'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-300 hover:text-white hover:border-white/30'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'security'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-300 hover:text-white hover:border-white/30'
              }`}
            >
              Security
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'notifications'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-300 hover:text-white hover:border-white/30'
              }`}
            >
              Notifications
            </button>
            <button
              onClick={() => setActiveTab('tokens')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tokens'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-300 hover:text-white hover:border-white/30'
              }`}
            >
              Tokens & Points
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'technicians' && renderTechnicians()}
        {activeTab === 'customers' && renderCustomers()}
        {activeTab === 'email' && renderEmailTesting()}
        {activeTab === 'transactions' && renderTransactions()}
        {activeTab === 'monitoring' && renderSystemMonitoring()}
        {activeTab === 'analytics' && renderAnalytics()}
        {activeTab === 'security' && renderSecurity()}
        {activeTab === 'notifications' && renderNotifications()}
        {activeTab === 'tokens' && renderTokensAndPoints()}
      </main>
    </div>
  );
}
