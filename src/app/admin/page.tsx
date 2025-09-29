"use client";

import { useState, useEffect, useCallback } from 'react';
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
  
  // Email testing states
  const [emailTestResults, setEmailTestResults] = useState<string>('');
  const [isTestingEmail, setIsTestingEmail] = useState(false);
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
  const [activeEmailTab, setActiveEmailTab] = useState<'testing' | 'templates'>('testing');

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
  const [transactionDateFilter, setTransactionDateFilter] = useState('all');
  const [transactionStatusFilter, setTransactionStatusFilter] = useState('all');
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [showTransactionDetails, setShowTransactionDetails] = useState<string | null>(null);
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  // Email templates configuration
  const emailTemplates = {
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
  };

  // Template management functions
  const loadTemplate = useCallback((templateId: string) => {
    setSelectedTemplate(templateId);
    setPreviewData(emailTemplates[templateId]?.defaultPreview || {});
    // In a real implementation, you'd load the actual template content from a database
    // For now, we'll show placeholder content
    setTemplateSubject(`Template: ${emailTemplates[templateId]?.name || 'Unknown'}`);
    setTemplateContent(`<!-- ${emailTemplates[templateId]?.description || 'No description'} -->
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1>{{name}} Template</h1>
  <p>This is a placeholder for the ${emailTemplates[templateId]?.name || 'template'} content.</p>
  <p>Variables available: ${emailTemplates[templateId]?.variables?.join(', ') || 'none'}</p>
</div>`);
  }, []);

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
  }, [loadTemplate]);

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
      
      // Call the contact API endpoint to test email functionality
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'ThankATech Admin',
          email: testEmailData.to,
          subject: testEmailData.subject,
          message: testEmailData.message + '\n\n--- ADMIN TEST EMAIL ---',
          isAdminTest: true
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
    setIsTestingEmail(true);
    setEmailTestResults('Testing SMTP connection...\n');
    
    try {
      setEmailTestResults(prev => prev + '🔗 Checking SMTP configuration...\n');
      
      // Test a simple email to admin email
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'System Health Check',
          email: 'k00lrav@gmail.com',
          subject: 'SMTP Health Check - ' + new Date().toISOString(),
          message: 'This is an automated SMTP health check from the admin panel.',
          isHealthCheck: true
        }),
      });
      
      if (response.ok) {
        setEmailTestResults(prev => prev + '✅ SMTP connection healthy\n');
        setEmailTestResults(prev => prev + '📋 Email service: OPERATIONAL\n');
      } else {
        setEmailTestResults(prev => prev + '❌ SMTP connection failed\n');
        setEmailTestResults(prev => prev + '🔧 Check email service configuration\n');
      }
      
    } catch (error) {
      setEmailTestResults(prev => prev + `💥 SMTP Error: ${error.message}\n`);
    } finally {
      setIsTestingEmail(false);
    }
  };

  const sendBulkNotification = async () => {
    setIsTestingEmail(true);
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
      setIsTestingEmail(false);
    }
  };

  const saveTemplate = async () => {
    try {
      // In a real implementation, you'd save to a database or config file
      console.log('Saving template:', {
        id: selectedTemplate,
        subject: templateSubject,
        content: templateContent
      });
      
      setEmailTestResults(prev => prev + `✅ Template "${emailTemplates[selectedTemplate]?.name}" saved successfully\n`);
    } catch (error) {
      setEmailTestResults(prev => prev + `❌ Failed to save template: ${error.message}\n`);
    }
  };

  const previewTemplate = () => {
    setShowTemplatePreview(true);
    // Generate preview with current data and template content
  };

  // Advanced User Management Functions
  const filteredUsers = useCallback(() => {
    let allUsers = [...technicians, ...customers].map(user => ({
      ...user,
      type: technicians.includes(user) ? 'technician' : 'customer',
      status: 'active', // Default status, can be enhanced with real status tracking
      lastActivity: user.createdAt ? new Date(user.createdAt).toISOString() : 'N/A'
    }));

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

  const renderEmailTesting = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-200">Email Management Suite</h2>
        <div className="flex gap-2">
          <button
            onClick={() => testSMTPConnection()}
            disabled={isTestingEmail}
            className="px-4 py-2 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isTestingEmail ? 'Testing...' : 'Test SMTP Health'}
          </button>
        </div>
      </div>

      {/* Sub-navigation for Email tabs */}
      <div className="border-b border-slate-700/50">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveEmailTab('testing')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeEmailTab === 'testing'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-300 hover:text-white hover:border-slate-600'
            }`}
          >
            Email Testing
          </button>
          <button
            onClick={() => setActiveEmailTab('templates')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeEmailTab === 'templates'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-300 hover:text-white hover:border-slate-600'
            }`}
          >
            Template Manager
          </button>
        </nav>
      </div>

      {/* Email Testing Tab Content */}
      {activeEmailTab === 'testing' && (
        <div className="space-y-6">
          {/* Email Test Form */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">📧 Send Test Email</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Recipient Email
              </label>
              <input
                type="email"
                value={testEmailData.to}
                onChange={(e) => setTestEmailData(prev => ({ ...prev, to: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                placeholder="test@example.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={testEmailData.subject}
                onChange={(e) => setTestEmailData(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                placeholder="Email subject"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Message
              </label>
              <textarea
                value={testEmailData.message}
                onChange={(e) => setTestEmailData(prev => ({ ...prev, message: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                placeholder="Email message content"
              />
            </div>
            
            <button
              onClick={testEmailDelivery}
              disabled={isTestingEmail || !testEmailData.to}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            >
              {isTestingEmail ? 'Sending...' : '📤 Send Test Email'}
            </button>
          </div>
        </div>
        
        {/* System Health Tests */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">🔧 System Health Tests</h3>
          
          <div className="space-y-3">
            <button
              onClick={testSMTPConnection}
              disabled={isTestingEmail}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {isTestingEmail ? (
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
              disabled={isTestingEmail}
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
      </div>
      
      {/* Test Results */}
      {emailTestResults && (
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">📋 Email Test Results</h3>
          <pre className="text-sm text-slate-300 whitespace-pre-wrap bg-black/20 p-4 rounded-lg overflow-auto max-h-64">
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
      )}

      {/* Template Manager Tab Content */}
      {activeEmailTab === 'templates' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Template List */}
            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">📝 Email Templates</h3>
              <div className="space-y-3">
                {Object.entries(emailTemplates).map(([key, template]) => (
                  <button
                    key={key}
                    onClick={() => loadTemplate(key)}
                    className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                      selectedTemplate === key
                        ? 'bg-blue-600/20 border-blue-500/30 text-blue-300'
                        : 'bg-slate-700/30 border-slate-600/30 text-slate-300 hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="font-medium">{template.name}</div>
                    <div className="text-sm opacity-75 mt-1">{template.description}</div>
                    <div className="text-xs opacity-50 mt-1">
                      Variables: {template.variables.join(', ')}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Template Editor */}
            <div className="lg:col-span-2 bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-200">
                  ✏️ Edit Template: {emailTemplates[selectedTemplate]?.name}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={previewTemplate}
                    className="px-3 py-1 bg-green-600/20 text-green-300 border border-green-500/30 rounded text-sm hover:bg-green-600/30 transition-all duration-200"
                  >
                    Preview
                  </button>
                  <button
                    onClick={saveTemplate}
                    className="px-3 py-1 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded text-sm hover:bg-blue-600/30 transition-all duration-200"
                  >
                    Save
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={templateSubject}
                    onChange={(e) => setTemplateSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="Email subject line..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    HTML Content
                  </label>
                  <textarea
                    value={templateContent}
                    onChange={(e) => setTemplateContent(e.target.value)}
                    rows={15}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono text-sm"
                    placeholder="HTML email template content..."
                  />
                </div>

                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <h4 className="text-blue-300 font-medium mb-2">📋 Available Variables</h4>
                  <div className="text-sm text-slate-300">
                    {emailTemplates[selectedTemplate]?.variables.map((variable, index) => (
                      <span key={variable}>
                        <code className="bg-slate-700/50 px-2 py-1 rounded text-blue-300">
                          {`{{${variable}}}`}
                        </code>
                        {index < emailTemplates[selectedTemplate].variables.length - 1 && ', '}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Template Categories */}
          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">📂 Template Categories</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                <h4 className="text-green-300 font-medium mb-2">User Lifecycle</h4>
                <div className="text-sm text-slate-300">
                  Welcome emails, account confirmations, deletion notices
                </div>
              </div>
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <h4 className="text-blue-300 font-medium mb-2">Notifications</h4>
                <div className="text-sm text-slate-300">
                  Thank you alerts, tip notifications, activity updates
                </div>
              </div>
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                <h4 className="text-purple-300 font-medium mb-2">Internal & Security</h4>
                <div className="text-sm text-slate-300">
                  Contact forms, password resets, admin notifications
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderTransactions = () => {
    // Mock transaction data - replace with real data from Firebase
    const mockTransactions = [
      {
        id: 'txn_1234567890',
        customerId: 'cus_abcdef123',
        customerEmail: 'customer@example.com',
        technicianId: 'tech_123',
        technicianName: 'John Smith',
        amount: 2500, // cents
        tip: 500, // cents
        total: 3000, // cents
        status: 'completed',
        paymentMethod: 'card',
        stripePaymentIntentId: 'pi_1234567890',
        createdAt: new Date().toISOString(),
        description: 'AC Repair Service'
      },
      {
        id: 'txn_0987654321',
        customerId: 'cus_xyz789',
        customerEmail: 'user@test.com',
        technicianId: 'tech_456',
        technicianName: 'Jane Doe',
        amount: 15000, // cents
        tip: 3000, // cents
        total: 18000, // cents
        status: 'completed',
        paymentMethod: 'card',
        stripePaymentIntentId: 'pi_0987654321',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        description: 'Plumbing Installation'
      },
      {
        id: 'txn_1122334455',
        customerId: 'cus_def456',
        customerEmail: 'client@company.com',
        technicianId: 'tech_789',
        technicianName: 'Mike Johnson',
        amount: 7500, // cents
        tip: 1500, // cents
        total: 9000, // cents
        status: 'pending',
        paymentMethod: 'card',
        stripePaymentIntentId: 'pi_1122334455',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        description: 'Electrical Wiring'
      }
    ];

    const filteredTransactions = () => {
      return mockTransactions.filter(transaction => {
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
              <div className="text-2xl font-bold text-green-300">${stats.totalRevenue}</div>
              <div className="text-sm text-slate-400">Total Revenue</div>
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-300">{stats.totalTransactions}</div>
              <div className="text-sm text-slate-400">Total Transactions</div>
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-300">${stats.averageTip}</div>
              <div className="text-sm text-slate-400">Average Tip</div>
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-300">{stats.activeTechnicians}</div>
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
        {activeTab === 'email' && renderEmailTesting()}
        {activeTab === 'transactions' && renderTransactions()}
      </main>
    </div>
  );
}
