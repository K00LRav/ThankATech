'use client';

import { useEffect, useState } from 'react';

// Force dynamic rendering for this page since it uses Firebase Auth
export const dynamic = 'force-dynamic';
import { useRouter } from 'next/navigation';
import { User } from 'firebase/auth';
import { auth, db, COLLECTIONS } from '@/lib/firebase';
import { logger } from '@/lib/logger';
import { 
  doc, 
  getDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy,
  limit as firestoreLimit
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import Link from 'next/link';
import { useTechnicianEarnings } from '@/hooks/useTechnicianEarnings';
import PayoutModal from '@/components/PayoutModal';
import UniversalHeader from '@/components/UniversalHeader';
import ProfilePhotoUpload from '@/components/ProfilePhotoUpload';
import TokenPurchaseModal from '@/components/TokenPurchaseModal';
import TokenTransactionHistory from '@/components/TokenTransactionHistory';
import PointsConversionWidget from '@/components/PointsConversionWidget';
import { getUserTokenBalance } from '@/lib/token-firebase';
import { formatTokens } from '@/lib/tokens';

// Admin email for admin access detection
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@thankatech.com';

// Types
interface UserProfile {
  id: string;
  name: string;
  email: string;
  userType: 'client' | 'technician' | 'admin';
  phone?: string;
  businessAddress?: string;
  businessPhone?: string;
  about?: string;
  username?: string;
  tokenBalance?: number;
  points?: number;
  photoURL?: string;
}

interface Transaction {
  id: string;
  amount: number;
  timestamp: any;
  fromName?: string;
  toName?: string;
  technicianName?: string;
  type?: string;
  pointsAwarded?: number;
  tokens?: number;
  message?: string;
  // Payout fields
  status?: string;
  transferId?: string;
  stripeAccountId?: string;
}

// Enhanced Header Component specifically for Dashboard
function DashboardHeader({ user, userProfile, onSignOut }: { 
  user: User | null; 
  userProfile: UserProfile | null; 
  onSignOut: () => void;
}) {
  return (
    <UniversalHeader
      currentUser={userProfile ? {
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email,
        photoURL: user?.photoURL || undefined,
        userType: userProfile.userType === 'technician' ? 'technician' : 'client',
        points: userProfile.points
      } : undefined}
      onSignOut={onSignOut}
      currentPath="/dashboard"
    />
  );
}

// Main Dashboard Component
export default function ModernDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [tipTransactions, setTipTransactions] = useState<Transaction[]>([]);
  const [thankYouTransactions, setThankYouTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showTokenPurchaseModal, setShowTokenPurchaseModal] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<any>(null);
  const [activityFilter, setActivityFilter] = useState<'all' | 'tokens' | 'thank_you' | 'purchases'>('all');
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);

  // Use earnings hook for technicians
  const { earnings, loading: earningsLoading, refetch: refetchEarnings } = useTechnicianEarnings(userProfile?.userType === 'technician' ? userProfile?.id || null : null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await loadUserProfile(currentUser.uid, currentUser);
      } else {
        router.push('/');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Handle token purchase verification from Stripe
  useEffect(() => {
    const verifyTokenPurchase = async () => {
      if (typeof window === 'undefined' || !user) return;
      
      const urlParams = new URLSearchParams(window.location.search);
      const tokenPurchaseSuccess = urlParams.get('token_purchase');
      const sessionId = urlParams.get('session_id');
      
      if (tokenPurchaseSuccess === 'success' && sessionId) {
        logger.info('Verifying token purchase:', sessionId);
        
        try {
          // First check if this session has already been processed
          const existingTransactionQuery = query(
            collection(db, COLLECTIONS.TOKEN_TRANSACTIONS),
            where('stripeSessionId', '==', sessionId),
            where('type', '==', 'token_purchase')
          );
          const existingSnapshot = await getDocs(existingTransactionQuery);
          
          if (!existingSnapshot.empty) {
            logger.info('Session already processed, skipping duplicate purchase');
            // Clean up URL and reload balance
            window.history.replaceState({}, '', '/dashboard');
            await loadTokenBalance(user.uid);
            return;
          }
          
          const response = await fetch('/api/verify-token-purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              sessionId, 
              userId: user.uid 
            }),
          });

          if (response.ok) {
            const data = await response.json();
            logger.info('Token purchase verified:', data);
            
            // If the backend says client should update, add the tokens
            if (data.requiresClientUpdate && data.tokens) {
              const { addTokensToBalance } = await import('@/lib/token-firebase');
              await addTokensToBalance(user.uid, data.tokens, data.amount || 0, sessionId);
              
              // Reload token balance
              await loadTokenBalance(user.uid);
              
              // Show success message
              alert(`✅ Success! ${data.tokens} TOA tokens added to your balance!`);
            }
          } else {
            logger.error('Token purchase verification failed');
          }
        } catch (error) {
          logger.error('Error verifying token purchase:', error);
        } finally {
          // Clean up URL parameters
          window.history.replaceState({}, '', '/dashboard');
        }
      }
    };

    verifyTokenPurchase();
  }, [user]);

  const loadUserProfile = async (userId: string, authUser?: User) => {
    try {

      
      // First, check if this is an admin user in the admins collection
      const adminsQuery = query(collection(db, COLLECTIONS.ADMINS), where('authUid', '==', userId));
      const adminSnapshot = await getDocs(adminsQuery);
      
      if (!adminSnapshot.empty) {
        const adminDoc = adminSnapshot.docs[0];
        const adminData = adminDoc.data();
        router.push('/admin');
        return;
      }
      
      const clientsQuery = query(collection(db, COLLECTIONS.CLIENTS), where('authUid', '==', userId));
      const clientSnapshot = await getDocs(clientsQuery);
      
      if (!clientSnapshot.empty) {
        const clientDoc = clientSnapshot.docs[0];
        const clientData = clientDoc.data();
        const profile = { 
          id: clientDoc.id, 
          name: clientData.name || clientData.displayName || 'User',
          email: clientData.email,
          userType: 'client' as const,
          points: clientData.points || 0,
          ...clientData 
        } as UserProfile;
        
        setUserProfile(profile);
        setEditedProfile(profile);
        
        // Load transactions based on user type - clients use authUid
        await loadTransactions(userId, profile.userType);
        
        // Load token balance for clients
        await loadTokenBalance(userId);
        return;
      }

      // Try to find user in technicians collection
      const techsQuery = query(collection(db, COLLECTIONS.TECHNICIANS), where('authUid', '==', userId));
      const techSnapshot = await getDocs(techsQuery);
      
      if (!techSnapshot.empty) {
        const techDoc = techSnapshot.docs[0];
        const techData = techDoc.data();
        const profile = { 
          id: techDoc.id, 
          name: techData.name || techData.displayName || 'Technician',
          email: techData.email,
          userType: 'technician',
          ...techData,
          points: 0 // Will be updated from transaction calculation (must be after spread)
        } as UserProfile;
        
        setUserProfile(profile);
        setEditedProfile(profile);
        
        // Load token balance for technicians (wallet for purchasing/sending)
        await loadTokenBalance(userId);
        
        // Load token stats for technicians (earnings from received tokens)
        // Use the DOCUMENT ID not the authUid for technician queries
        if (profile.userType === 'technician') {
          await loadTechnicianTokenStats(techDoc.id);
        }
        return;
      }

      // Fallback: Try searching by email (for legacy users or those missing authUid)
      const userEmail = authUser?.email || user?.email;
      if (userEmail) {
        // Search admins by email first
        const adminsByEmailQuery = query(collection(db, COLLECTIONS.ADMINS), where('email', '==', userEmail));
        const adminsByEmailSnapshot = await getDocs(adminsByEmailQuery);
        
        if (!adminsByEmailSnapshot.empty) {
          const adminDoc = adminsByEmailSnapshot.docs[0];
          const adminData = adminDoc.data();
          
          // Update the document with the current authUid for future lookups
          await updateDoc(doc(db, COLLECTIONS.ADMINS, adminDoc.id), { authUid: userId });
          
          router.push('/admin');
          return;
        }
        
        // Search clients by email
        const clientsByEmailQuery = query(collection(db, COLLECTIONS.CLIENTS), where('email', '==', userEmail));
        const clientsByEmailSnapshot = await getDocs(clientsByEmailQuery);
        
        if (!clientsByEmailSnapshot.empty) {
          const clientDoc = clientsByEmailSnapshot.docs[0];
          const clientData = clientDoc.data();
          
          // Update the document with the current authUid for future lookups
          await updateDoc(doc(db, COLLECTIONS.CLIENTS, clientDoc.id), { authUid: userId });
          
          const profile = { 
            id: clientDoc.id, 
            name: clientData.name || clientData.displayName || 'User',
            email: clientData.email,
            userType: 'client' as const,
            points: clientData.points || 0,
            ...clientData 
          } as UserProfile;
          
          setUserProfile(profile);
          setEditedProfile(profile);
          await loadTransactions(userId, profile.userType);
          return;
        }
        
        // Search technicians by email
        const techsByEmailQuery = query(collection(db, COLLECTIONS.TECHNICIANS), where('email', '==', userEmail));
        const techsByEmailSnapshot = await getDocs(techsByEmailQuery);
        
        if (!techsByEmailSnapshot.empty) {
          const techDoc = techsByEmailSnapshot.docs[0];
          const techData = techDoc.data();
          
          // Update the document with the current authUid for future lookups
          await updateDoc(doc(db, COLLECTIONS.TECHNICIANS, techDoc.id), { authUid: userId });
          
          const profile = { 
            id: techDoc.id, 
            name: techData.name || techData.displayName || 'Technician',
            email: techData.email,
            userType: 'technician',
            points: techData.points || 0,
            ...techData 
          } as UserProfile;
          
          setUserProfile(profile);
          setEditedProfile(profile);
          
          // Load token balance for technicians (wallet)
          await loadTokenBalance(userId);
          
          // Load token stats for technicians (earnings from received tokens)
          // Use the DOCUMENT ID not the authUid
          await loadTechnicianTokenStats(techDoc.id);
          return;
        }
      }
      
      // User not found in any collection - likely incomplete Google sign-in registration
      logger.warn('User authenticated but no profile found. Redirecting to complete registration.');
      
      // Don't sign them out - they're legitimately authenticated
      // Instead, redirect to homepage where Registration component will detect incomplete registration
      router.push('/?register=true');
      
    } catch (error) {
      logger.error('Error loading user profile:', error);
      // Only sign out on actual errors, not missing profiles
      if (error instanceof Error && error.message.includes('auth')) {
        await signOut(auth);
        router.push('/');
      }
    }
  };

  const loadTokenBalance = async (userId: string) => {
    try {
      const balance = await getUserTokenBalance(userId);
      setTokenBalance(balance);
    } catch (error) {
      logger.error('Error loading token balance:', error);
    }
  };

  const loadTechnicianTokenStats = async (technicianId: string) => {
    try {
      // Use the clean, centralized technician dashboard loader
      const { loadTechnicianDashboard } = await import('@/lib/technician-dashboard');
      const dashboardData = await loadTechnicianDashboard(technicianId);
      
      // Update token balance with comprehensive earnings data
      setTokenBalance(prev => ({
        ...prev,
        totalTokensReceived: dashboardData.totalTokensReceived,
        totalTokenEarnings: dashboardData.totalEarnings,
        availableBalance: dashboardData.availableBalance,
        transactionCount: dashboardData.transactionCount
      }));
      
      // Update activity feed with all transactions and payouts
      setTipTransactions(dashboardData.allActivity);
      setAllTransactions(dashboardData.allActivity);
      
      // Update profile points
      setUserProfile(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          points: dashboardData.totalPoints,
          totalThankYousReceived: dashboardData.totalThankYous
        };
      });
      
      // Update Firestore with calculated points to keep cached value in sync
      try {
        const { updateDoc, doc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'technicians', technicianId), {
          points: dashboardData.totalPoints,
          totalThankYousReceived: dashboardData.totalThankYous,
          updatedAt: new Date()
        });
      } catch (firestoreError) {
        // Silent fail - dashboard still works even if Firestore update fails
        logger.error('Failed to sync points to Firestore:', firestoreError);
      }
      
    } catch (error) {
      logger.error('Error loading technician dashboard:', error);
    }
  };

  const loadTransactions = async (userId: string, userType: string) => {
    try {
      // This function is now ONLY for clients
      // Technicians use loadTechnicianTokenStats() instead
      
      // Load transactions sent by this client + token purchases
      // Remove orderBy to avoid needing Firebase index, we'll sort in memory
      const tokenTransactionsQuery = query(
        collection(db, 'tokenTransactions'),
        where('fromUserId', '==', userId),
        firestoreLimit(50) // Increased limit to get more history
      );

      const tokenSnapshot = await getDocs(tokenTransactionsQuery);
      const tokenTransactions = await Promise.all(
        tokenSnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data() as any;
          
          // If names are missing, fetch them dynamically for better UX
          let fromName = data.fromName;
          let toName = data.toName;
          
          if (!fromName && data.fromUserId) {
            try {
              // Try clients collection first
              let userDoc = await getDoc(doc(db, COLLECTIONS.CLIENTS, data.fromUserId));
              if (!userDoc.exists()) {
                // Try technicians collection
                userDoc = await getDoc(doc(db, COLLECTIONS.TECHNICIANS, data.fromUserId));
              }
              if (!userDoc.exists()) {
                // Try admins collection
                userDoc = await getDoc(doc(db, COLLECTIONS.ADMINS, data.fromUserId));
              }
              fromName = userDoc.exists() ? (userDoc.data() as any)?.name : null;
            } catch (error) {
              // Silently handle name fetch errors
            }
          }
          
          if (!toName && data.toTechnicianId) {
            try {
              const techDocRef = doc(db, 'technicians', data.toTechnicianId);
              const techDoc = await getDoc(techDocRef);
              toName = techDoc.exists() ? (techDoc.data() as any)?.name : null;
            } catch (error) {
              // Silently handle name fetch errors
            }
          }
          
          return {
            id: docSnapshot.id,
            amount: data.dollarValue || 0,
            timestamp: data.timestamp,
            type: data.type || 'unknown',
            fromName: fromName || 'Customer',
            toName: toName || 'Technician', 
            technicianName: toName || 'Technician',
            pointsAwarded: data.pointsAwarded || 0,
            tokens: data.tokens || 0,
            message: data.message || ''
          };
        })
      );

      // Also load LEGACY transactions for backward compatibility (clients only)
      const legacyTransactionsQuery = query(
        collection(db, 'transactions'),
        where('fromUserId', '==', userId),
        where('type', '==', 'tip'),
        orderBy('timestamp', 'desc'),
        firestoreLimit(10)
      );

      const legacySnapshot = await getDocs(legacyTransactionsQuery);
      const legacyTransactions = legacySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as object)
      })) as Transaction[];

      // Combine and sort all transactions by timestamp
      const allTransactions = [...tokenTransactions, ...legacyTransactions].sort((a, b) => {
        const aTime = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
        const bTime = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
        return bTime.getTime() - aTime.getTime();
      });

      setTipTransactions(allTransactions.slice(0, 15)); // Show most recent 15 transactions
      setAllTransactions(allTransactions);
    } catch (error) {
      logger.error('Error loading transactions:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setEditedProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePhotoUploaded = (photoURL: string) => {
    // Update the profile with new photo
    setUserProfile(prev => prev ? { ...prev, photoURL } : prev);
    setEditedProfile(prev => ({ ...prev, photoURL }));
  };

  const handleTokenPurchaseSuccess = (tokens: number) => {
    // Refresh token balance after purchase
    if (user?.uid) {
      loadTokenBalance(user.uid);
    }
  };

  const handleSaveProfile = async () => {
    if (!userProfile?.id || !userProfile?.userType) return;

    try {
      // Use the correct collection based on user type
      const collectionName = userProfile.userType === 'technician' ? COLLECTIONS.TECHNICIANS : COLLECTIONS.CLIENTS;
      await updateDoc(doc(db, collectionName, userProfile.id), editedProfile);
      setUserProfile({ ...userProfile, ...editedProfile });
      setIsEditingProfile(false);
    } catch (error) {
      logger.error('Error saving profile:', error);
      alert('Error saving profile. Please try again.');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      logger.error('Error signing out:', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!userProfile?.id || deleteConfirmText !== 'DELETE') return;

    setIsDeleting(true);
    try {
      // Delete user document from appropriate collection
      if (userProfile.userType === 'technician') {
        await deleteDoc(doc(db, COLLECTIONS.TECHNICIANS, userProfile.id));
      } else if (userProfile.userType === 'admin') {
        await deleteDoc(doc(db, COLLECTIONS.ADMINS, userProfile.id));
      } else {
        await deleteDoc(doc(db, COLLECTIONS.CLIENTS, userProfile.id));
      }
      
      // Delete user account
      if (user) {
        await user.delete();
      }
      
      router.push('/');
    } catch (error) {
      logger.error('Error deleting account:', error);
      alert('Error deleting account. Please try again.');
      setIsDeleting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-center">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20 text-center">
          <p className="text-white mb-4">Error loading profile</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Beautiful Animated Background - Like Profile Page */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-blue-700/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-500/20 to-blue-800/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-blue-300/10 to-blue-600/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <DashboardHeader 
        user={user} 
        userProfile={userProfile} 
        onSignOut={handleSignOut} 
      />
      
      {/* Single Page Layout - Beautiful & Unified */}
      <main className="relative max-w-6xl mx-auto px-4 py-8 space-y-8">
        
        {/* Hero Section - Welcome & Quick Stats */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Welcome back, {userProfile.name?.split(' ')[0] || 'User'}! 👋
              </h1>
              <p className="text-blue-200 mt-1">
                {userProfile.userType === 'technician' 
                  ? 'Manage your business and track your earnings' 
                  : 'Your activity dashboard and account overview'
                }
              </p>
            </div>
            {userProfile.userType === 'technician' && earnings && (
              <div className="flex gap-4">
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg px-4 py-3 text-center">
                  <p className="text-green-300 text-sm font-medium">Available</p>
                  <p className="text-green-400 text-xl font-bold">{formatCurrency(earnings.availableBalance)}</p>
                </div>
                <button
                  onClick={() => setShowPayoutModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Request Payout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid - Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {userProfile.userType === 'technician' && earnings && (
            <>
              <div className="bg-gradient-to-br from-emerald-500/20 to-teal-600/20 backdrop-blur-lg rounded-xl border border-emerald-400/30 p-6 hover:from-emerald-500/30 hover:to-teal-600/30 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-200 text-sm font-medium">ThankYou Points</p>
                    <p className="text-white text-2xl font-bold">{userProfile.points || 0}</p>
                  </div>
                  <div className="bg-emerald-500/30 p-3 rounded-lg border border-emerald-400/40">
                    <span className="text-2xl">⚡</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-emerald-500/20 to-green-600/20 backdrop-blur-lg rounded-xl border border-emerald-400/30 p-6 hover:from-emerald-500/30 hover:to-green-600/30 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-200 text-sm font-medium">Thank Yous Received</p>
                    <p className="text-white text-2xl font-bold">
                      {tipTransactions.filter(t => t.type === 'thank_you').length}
                    </p>
                  </div>
                  <div className="bg-emerald-500/30 p-3 rounded-lg border border-emerald-400/40">
                    <span className="text-2xl">🙏</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-amber-500/20 to-yellow-600/20 backdrop-blur-md rounded-xl border border-amber-400/30 p-6 hover:from-amber-500/30 hover:to-yellow-600/30 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-200 text-sm font-medium">TOA Earnings</p>
                    <p className="text-white text-2xl font-bold">{formatCurrency(earnings.totalEarnings)}</p>
                  </div>
                  <div className="bg-amber-500/30 p-3 rounded-lg border border-amber-400/40">
                    <span className="text-2xl">💰</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-500/20 to-cyan-600/20 backdrop-blur-lg rounded-xl border border-blue-400/30 p-6 hover:from-blue-500/30 hover:to-cyan-600/30 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-200 text-sm font-medium">Available Payout</p>
                    <p className="text-white text-2xl font-bold">{formatCurrency(earnings.availableBalance)}</p>
                  </div>
                  <div className="bg-blue-500/30 p-3 rounded-lg border border-blue-400/40">
                    <span className="text-2xl">💳</span>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {userProfile.userType === 'client' && (
            <>
              <div className="bg-gradient-to-br from-emerald-500/20 to-teal-600/20 backdrop-blur-lg rounded-xl border border-emerald-400/30 p-6 hover:from-emerald-500/30 hover:to-teal-600/30 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-200 text-sm font-medium">ThankYou Points</p>
                    <p className="text-white text-2xl font-bold">{userProfile.points || 0}</p>
                  </div>
                  <div className="bg-emerald-500/30 p-3 rounded-lg border border-emerald-400/40">
                    <span className="text-2xl">⚡</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-300 text-sm font-medium">Thank Yous Sent</p>
                    <p className="text-white text-2xl font-bold">
                      {tipTransactions.filter(t => t.type === 'thank_you').length}
                    </p>
                  </div>
                  <div className="bg-green-500/20 p-3 rounded-lg">
                    <span className="text-2xl">🙏</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-amber-500/20 to-yellow-600/20 backdrop-blur-md rounded-xl border border-amber-400/30 p-6 hover:from-amber-500/30 hover:to-yellow-600/30 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-200 text-sm font-medium">TOA Tokens Sent</p>
                    <p className="text-white text-2xl font-bold">
                      {tipTransactions.filter(t => t.type === 'toa_token' || t.type === 'toa').reduce((sum, t) => sum + (t.tokens || 0), 0)}
                    </p>
                  </div>
                  <div className="bg-amber-500/30 p-3 rounded-lg border border-amber-400/40">
                    <span className="text-2xl">💰</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-500/20 to-blue-600/20 backdrop-blur-md rounded-xl border border-purple-400/30 p-6 hover:from-purple-500/30 hover:to-blue-600/30 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-200 text-sm font-medium">Current TOA Balance</p>
                    <p className="text-white text-2xl font-bold">
                      {tokenBalance ? formatTokens(tokenBalance.tokens) : 'Loading...'}
                    </p>
                    <button
                      onClick={() => setShowTokenPurchaseModal(true)}
                      className="mt-2 text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg transition-colors"
                    >
                      🛒 Buy More Tokens
                    </button>
                  </div>
                  <div className="bg-purple-500/30 p-3 rounded-lg border border-purple-400/40">
                    <span className="text-2xl">🪙</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-300 text-sm font-medium">Account Status</p>
                    <p className="text-white text-2xl font-bold">Active</p>
                  </div>
                  <div className="bg-green-500/20 p-3 rounded-lg">
                    <span className="text-2xl">✅</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Points Conversion Widget - For all users */}
        {userProfile && tokenBalance && user && (
          <PointsConversionWidget
            userId={user.uid}
            currentPoints={userProfile.points || 0}
            onConversionComplete={() => loadUserProfile(user.uid, user)}
          />
        )}

        {/* Token Management - Technician (Dual Display: Wallet + Earnings) */}
        {userProfile.userType === 'technician' && tokenBalance && (
          <div className="space-y-6">
            {/* Spending Wallet Section */}
            <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-lg rounded-xl border border-white/20 p-6">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                💳 TOA Spending Wallet
                <span className="text-sm font-normal text-slate-300">(Purchase & Send to Others)</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Current Balance */}
                <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                  <h4 className="text-lg font-semibold text-white mb-4">Current Balance</h4>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-purple-400 mb-2">
                      {formatTokens(tokenBalance.tokens)}
                    </p>
                    <p className="text-slate-300 text-sm mb-4">
                      Available for sending
                    </p>
                    <button
                      onClick={() => setShowTokenPurchaseModal(true)}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                    >
                      🛒 Purchase More Tokens
                    </button>
                  </div>
                </div>

                {/* Purchase History */}
                <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                  <h4 className="text-lg font-semibold text-white mb-4">Purchase Summary</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-300">Total Purchased:</span>
                      <span className="text-green-400 font-bold">
                        {formatTokens(tokenBalance.totalPurchased || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Total Spent:</span>
                      <span className="text-orange-400 font-bold">
                        {formatTokens(tokenBalance.totalSpent || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-white/20">
                      <span className="text-white font-medium">Remaining:</span>
                      <span className="text-purple-400 font-bold">
                        {formatTokens(tokenBalance.tokens)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Receiving Activity for Technicians */}
                <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                  <h4 className="text-lg font-semibold text-white mb-4">Receiving Stats</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-300">TOA Received:</span>
                      <span className="text-green-400 font-bold">
                        {tipTransactions.filter(t => (t.type === 'toa_token' || t.type === 'toa') && t.type).reduce((sum, t) => sum + (t.tokens || 0), 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Transactions:</span>
                      <span className="text-amber-400 font-bold">
                        {tipTransactions.filter(t => t.type === 'toa_token' || t.type === 'toa').length}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-white/20">
                      <span className="text-white font-medium">Available to Send:</span>
                      <span className="text-cyan-400 font-bold">
                        {formatTokens(tokenBalance.tokens)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Earnings Section */}
            <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 backdrop-blur-lg rounded-xl border border-white/20 p-6">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                💰 TOA Earnings & Income
                <span className="text-sm font-normal text-slate-300">(Received from Clients & Technicians)</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Tokens Received */}
                <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                  <h4 className="text-lg font-semibold text-white mb-4">Total TOA Received</h4>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-amber-400 mb-2">
                      {tokenBalance.totalTokensReceived || 0}
                    </p>
                    <p className="text-slate-300 text-sm">
                      From {tipTransactions.filter(t => t.type === 'toa_token' || t.type === 'toa').length} transactions
                    </p>
                  </div>
                </div>

                {/* Token Earnings (Dollar Value) */}
                <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                  <h4 className="text-lg font-semibold text-white mb-4">Dollar Earnings</h4>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-400 mb-2">
                      {formatCurrency(tokenBalance.totalTokenEarnings || 0)}
                    </p>
                    <p className="text-slate-300 text-sm">
                      85% payout rate
                    </p>
                  </div>
                </div>

                {/* Average per Transaction */}
                <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                  <h4 className="text-lg font-semibold text-white mb-4">Average TOA</h4>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-400 mb-2">
                      {tokenBalance.transactionCount > 0 
                        ? Math.round(tokenBalance.totalTokensReceived / tokenBalance.transactionCount)
                        : 0
                      }
                    </p>
                    <p className="text-slate-300 text-sm">
                      Tokens per transaction
                    </p>
                  </div>
                </div>
              </div>
            
            {/* Token Transaction History Preview */}
            <div className="mt-6 bg-white/5 backdrop-blur-sm rounded-lg p-4">
              <h4 className="text-md font-semibold text-white mb-3">Recent Token Transactions</h4>
              <div className="space-y-2">
                {tipTransactions
                  .filter(t => t.type === 'toa_token' || t.type === 'toa')
                  .slice(0, 3)
                  .map((transaction, index) => (
                    <div key={index} className="flex justify-between items-center py-2 px-3 bg-white/5 rounded-lg">
                      <div>
                        <p className="text-white text-sm font-medium">
                          {transaction.tokens} TOA from {transaction.fromName || 'Client'}
                        </p>
                        <p className="text-slate-400 text-xs">
                          {new Date(transaction.timestamp?.toDate ? transaction.timestamp.toDate() : transaction.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-bold text-sm">
                          {formatCurrency(transaction.amount || 0)}
                        </p>
                      </div>
                    </div>
                  ))}
                {tipTransactions.filter(t => t.type === 'toa_token' || t.type === 'toa').length === 0 && (
                  <p className="text-slate-400 text-center py-4">No token transactions yet</p>
                )}
              </div>
            </div>
            </div>
          </div>
        )}

        {/* Token Management - Client Only */}
        {userProfile.userType === 'client' && tokenBalance && (
          <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-lg rounded-xl border border-white/20 p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              🪙 Token Management
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Current Balance */}
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                <h4 className="text-lg font-semibold text-white mb-4">Current Balance</h4>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-400 mb-2">
                    {formatTokens(tokenBalance.tokens)}
                  </p>
                  <p className="text-slate-300 text-sm">
                    Available for sending
                  </p>
                  <button
                    onClick={() => setShowTokenPurchaseModal(true)}
                    className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                  >
                    🛒 Purchase More Tokens
                  </button>
                </div>
              </div>

              {/* Purchase History */}
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                <h4 className="text-lg font-semibold text-white mb-4">Purchase Summary</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Total Purchased:</span>
                    <span className="text-green-400 font-bold">
                      {formatTokens(tokenBalance.totalPurchased)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Total Spent:</span>
                    <span className="text-orange-400 font-bold">
                      {formatTokens(tokenBalance.totalSpent)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-white/20">
                    <span className="text-white font-medium">Remaining:</span>
                    <span className="text-purple-400 font-bold">
                      {formatTokens(tokenBalance.tokens)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Token Activity */}
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                <h4 className="text-lg font-semibold text-white mb-4">Quick Stats</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-300">TOA Sent:</span>
                    <span className="text-blue-400 font-bold">
                      {tipTransactions.filter(t => t.type === 'toa_token' || t.type === 'toa').reduce((sum, t) => sum + (t.tokens || 0), 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Thank Yous:</span>
                    <span className="text-green-400 font-bold">
                      {tipTransactions.filter(t => t.type === 'thank_you').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Last Updated:</span>
                    <span className="text-slate-400 text-sm">
                      {tokenBalance.lastUpdated ? new Date(tokenBalance.lastUpdated.toDate()).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Recent Activity</h2>
            <div className="flex items-center gap-2">
              <select
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value as any)}
                className="bg-white/10 border border-white/20 text-white text-sm rounded-lg px-3 py-1 focus:border-blue-400 focus:outline-none"
              >
                <option value="all" className="bg-slate-800">All Activity</option>
                <option value="tokens" className="bg-slate-800">TOA Tokens</option>
                <option value="thank_you" className="bg-slate-800">Thank Yous</option>
                <option value="purchases" className="bg-slate-800">Purchases</option>
              </select>
              <button
                onClick={() => setShowTransactionHistory(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded-lg transition-colors"
              >
                View All
              </button>
            </div>
          </div>
          
          {tipTransactions.length > 0 ? (
            <div className="space-y-4">
              {tipTransactions
                .filter(transaction => {
                  if (activityFilter === 'all') return true;
                  if (activityFilter === 'tokens') return transaction.type === 'toa_token' || transaction.type === 'toa';
                  if (activityFilter === 'thank_you') return transaction.type === 'thank_you';
                  if (activityFilter === 'purchases') return transaction.type === 'token_purchase';
                  return true;
                })
                .slice(0, 8)
                .map((transaction, index) => {
                // Determine transaction display based on type
                const getTransactionDisplay = () => {
                  const isReceived = userProfile.userType === 'technician';
                  
                  switch (transaction.type) {
                    case 'thank_you':
                      return {
                        icon: '🙏',
                        bgColor: 'bg-green-500/20',
                        title: isReceived 
                          ? `Thank you from ${transaction.fromName || 'Client'}`
                          : `Thank you sent to ${transaction.toName || transaction.technicianName || 'Technician'}`,
                        amount: formatCurrency(0), // Free thank you
                        points: `+${transaction.pointsAwarded || 1} ThankATech Point${(transaction.pointsAwarded || 1) !== 1 ? 's' : ''}`
                      };
                    case 'toa_token':
                    case 'toa':
                      return {
                        icon: '💰',
                        bgColor: 'bg-blue-500/20',
                        title: isReceived 
                          ? `TOA tokens from ${transaction.fromName || 'Client'}`
                          : `TOA sent to ${transaction.toName || transaction.technicianName || 'Technician'}`,
                        amount: formatCurrency(transaction.amount || 0),
                        points: transaction.pointsAwarded ? `+${transaction.pointsAwarded} ThankATech Point${transaction.pointsAwarded !== 1 ? 's' : ''}` : null
                      };
                    case 'token_purchase':
                      return {
                        icon: '🛒',
                        bgColor: 'bg-purple-500/20',
                        title: `Token Purchase`,
                        amount: formatCurrency(transaction.amount || 0),
                        points: transaction.pointsAwarded ? `+${transaction.pointsAwarded} ThankATech Point${transaction.pointsAwarded !== 1 ? 's' : ''}` : null
                      };
                    case 'payout':
                      return {
                        icon: '💸',
                        bgColor: 'bg-yellow-500/20',
                        title: `Payout to Bank (${transaction.status || 'pending'})`,
                        amount: formatCurrency(transaction.amount || 0), // Already in dollars and negative from lib
                        points: null
                      };
                    default:
                      return {
                        icon: '❤️',
                        bgColor: 'bg-red-500/20',
                        title: isReceived 
                          ? `Legacy tip from ${transaction.fromName || 'Client'}`
                          : `Legacy tip sent to ${transaction.toName || transaction.technicianName || 'Technician'}`,
                        amount: formatCurrency(transaction.amount || 0),
                        points: null
                      };
                  }
                };

                const display = getTransactionDisplay();
                const timestamp = new Date(transaction.timestamp?.toDate ? transaction.timestamp.toDate() : transaction.timestamp);

                return (
                  <div key={transaction.id} className="flex items-center justify-between py-4 px-5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`${display.bgColor} p-3 rounded-xl`}>
                        <span className="text-xl">{display.icon}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-semibold text-sm sm:text-base">
                          {display.title}
                        </p>
                        <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-400 mt-1">
                          <span>📅 {timestamp.toLocaleDateString()}</span>
                          <span>🕐 {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {transaction.tokens && (
                            <span className="bg-purple-600/20 px-2 py-1 rounded text-purple-300">
                              {transaction.tokens} TOA
                            </span>
                          )}
                        </div>
                        {transaction.message && (
                          <p className="text-slate-300 text-xs mt-1 italic line-clamp-2">"{transaction.message}"</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold text-sm sm:text-base">{display.amount}</p>
                      {display.points && (
                        <p className="text-blue-400 text-xs font-medium">{display.points}</p>
                      )}
                      <p className={`text-xs ${userProfile.userType === 'technician' ? 'text-green-400' : 'text-blue-400'} mt-1`}>
                        {userProfile.userType === 'technician' ? 'Received' : 'Sent'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="bg-slate-600/50 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <p className="text-slate-300 mb-2">No recent activity</p>
              <p className="text-slate-400 text-sm">
                {userProfile.userType === 'technician' 
                  ? 'Tips and earnings will appear here once you start receiving them.'
                  : 'Your tip history will appear here once you start sending tips.'
                }
              </p>
            </div>
          )}
        </div>

        {/* Account Settings - Single Unified Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Account Settings</h2>
            <button
              onClick={isEditingProfile ? handleSaveProfile : () => setIsEditingProfile(true)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isEditingProfile 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isEditingProfile ? '💾 Save Changes' : '✏️ Edit Profile'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="space-y-6">
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">Personal Information</h3>
                
                {/* Profile Photo Upload */}
                <div className="mb-6 flex justify-center">
                  <ProfilePhotoUpload
                    userId={userProfile?.id || ''}
                    userType={userProfile?.userType === 'admin' ? 'client' : (userProfile?.userType || 'client')}
                    currentPhotoURL={userProfile?.photoURL}
                    userName={userProfile?.name}
                    onPhotoUploaded={handlePhotoUploaded}
                    size={100}
                  />
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={editedProfile.name || ''}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                        placeholder="Your full name"
                      />
                    ) : (
                      <input
                        type="text"
                        value={userProfile.name || 'Not set'}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                        readOnly
                      />
                    )}
                  </div>

                  {userProfile.userType === 'technician' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Username</label>
                      {isEditingProfile ? (
                        <div>
                          <input
                            type="text"
                            value={editedProfile.username || ''}
                            onChange={(e) => handleInputChange('username', e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                            placeholder="Choose a unique username"
                          />
                          <p className="text-xs text-slate-400 mt-1">
                            This will be your public profile URL: thankatech.com/{editedProfile.username || 'username'}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <input
                            type="text"
                            value={userProfile.username || 'Not set'}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                            readOnly
                          />
                          {userProfile.username && (
                            <p className="text-xs text-blue-400 mt-1">
                              Public profile: thankatech.com/{userProfile.username}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Phone</label>
                    {isEditingProfile ? (
                      <input
                        type="tel"
                        value={editedProfile.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                        placeholder="Your phone number"
                      />
                    ) : (
                      <input
                        type="tel"
                        value={userProfile.phone || 'Not set'}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                        readOnly
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={userProfile.email}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                      readOnly
                    />
                    <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>  
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">User Type</label>
                    <input
                      type="text"
                      value={userProfile.userType}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white capitalize"
                      readOnly
                    />
                    <p className="text-xs text-slate-400 mt-1">Account type cannot be changed</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Business Information - Technicians Only */}
              {userProfile.userType === 'technician' && (
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4">Business Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Business Address</label>
                      {isEditingProfile ? (
                        <textarea
                          value={editedProfile.businessAddress || ''}
                          onChange={(e) => handleInputChange('businessAddress', e.target.value)}
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                          placeholder="123 Business St, City, State ZIP"
                          rows={2}
                        />
                      ) : (
                        <textarea
                          value={userProfile.businessAddress || 'Not set'}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                          readOnly
                          rows={2}
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Business Phone</label>
                      {isEditingProfile ? (
                        <input
                          type="tel"
                          value={editedProfile.businessPhone || ''}
                          onChange={(e) => handleInputChange('businessPhone', e.target.value)}
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                          placeholder="Business phone number"
                        />
                      ) : (
                        <input
                          type="tel"
                          value={userProfile.businessPhone || 'Not set'}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                          readOnly
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Professional Summary</label>
                      {isEditingProfile ? (
                        <textarea
                          value={editedProfile.about || ''}
                          onChange={(e) => handleInputChange('about', e.target.value)}
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                          placeholder="Tell clients about your services and experience..."
                          rows={4}
                        />
                      ) : (
                        <textarea
                          value={userProfile.about || 'No professional summary set'}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                          readOnly
                          rows={4}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Account Actions */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">Account Actions</h3>
                <div className="space-y-3">
                  {userProfile.userType === 'technician' && userProfile.username ? (
                    <Link
                      href={`/${userProfile.username}`}
                      className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-center"
                    >
                      👁️ View Public Profile
                    </Link>
                  ) : userProfile.userType === 'technician' ? (
                    <div className="block w-full bg-yellow-600 text-white font-medium py-2 px-4 rounded-lg text-center">
                      ⚠️ Set up username to enable public profile
                    </div>
                  ) : null}
                  <button
                    onClick={handleSignOut}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    🚪 Sign Out
                  </button>
                  
                  {/* Delete Account Section */}
                  <div className="pt-4 border-t border-white/10">
                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        🗑️ Delete Account
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                          <h4 className="text-red-300 font-semibold mb-2">⚠️ Warning</h4>
                          <p className="text-red-200 text-sm mb-3">
                            This action is permanent and cannot be undone. All your data will be deleted.
                          </p>
                          <p className="text-white text-sm mb-2 font-medium">
                            Type <span className="bg-red-900/50 px-2 py-1 rounded font-mono">DELETE</span> to confirm:
                          </p>
                          <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="Type DELETE here"
                            className="w-full bg-white/10 border border-red-500/30 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:border-red-400 focus:outline-none mb-3"
                            disabled={isDeleting}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleDeleteAccount}
                              disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-900 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
                            >
                              {isDeleting ? 'Deleting...' : 'Delete My Account'}
                            </button>
                            <button
                              onClick={() => {
                                setShowDeleteConfirm(false);
                                setDeleteConfirmText('');
                              }}
                              disabled={isDeleting}
                              className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Payout Modal */}
      {showPayoutModal && (
        <PayoutModal
          isOpen={showPayoutModal}
          onClose={() => setShowPayoutModal(false)}
          availableBalance={earnings?.availableBalance || 0}
          technicianId={userProfile.id}
          onPayoutSuccess={(amount) => {
            setShowPayoutModal(false);
            // Refresh earnings data after successful payout
            refetchEarnings();
            // Show success message
            const amountInDollars = (amount / 100).toFixed(2);
            alert(`Success! Payout of $${amountInDollars} has been initiated. Funds will arrive in 1-2 business days.`);
          }}
        />
      )}

      {/* Token Purchase Modal - Available for both clients and technicians */}
      {showTokenPurchaseModal && userProfile && (
        <TokenPurchaseModal
          isOpen={showTokenPurchaseModal}
          onClose={() => setShowTokenPurchaseModal(false)}
          userId={user?.uid || ''}
          onPurchaseSuccess={handleTokenPurchaseSuccess}
        />
      )}

      {/* Token Transaction History */}
      {showTransactionHistory && userProfile && (
        <TokenTransactionHistory
          isOpen={showTransactionHistory}
          onClose={() => setShowTransactionHistory(false)}
          userId={user?.uid || ''}
          userType={userProfile.userType === 'technician' ? 'technician' : 'client'}
        />
      )}
    </div>
  );
}
