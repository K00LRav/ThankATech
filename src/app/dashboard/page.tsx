'use client';

import { useEffect, useState } from 'react';

// Force dynamic rendering for this page since it uses Firebase Auth
export const dynamic = 'force-dynamic';
import { useRouter } from 'next/navigation';
import { User } from 'firebase/auth';
import { auth, db, COLLECTIONS } from '@/lib/firebase';
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

  // Use earnings hook for technicians
  const { earnings, loading: earningsLoading } = useTechnicianEarnings(userProfile?.userType === 'technician' ? userProfile?.id || null : null);

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

  const loadUserProfile = async (userId: string, authUser?: User) => {
    try {

      
      // First, check if this is an admin user in the admins collection
      const adminsQuery = query(collection(db, COLLECTIONS.ADMINS), where('authUid', '==', userId));
      const adminSnapshot = await getDocs(adminsQuery);
      console.log('� Admins collection results:', adminSnapshot.size, 'documents found');
      
      if (!adminSnapshot.empty) {
        const adminDoc = adminSnapshot.docs[0];
        const adminData = adminDoc.data();
        console.log('� Admin user found in admins collection:', adminData.email);
        console.log('� Redirecting to admin panel...');
        router.push('/admin');
        return;
      }
      
      const clientsQuery = query(collection(db, COLLECTIONS.CLIENTS), where('authUid', '==', userId));
      const clientSnapshot = await getDocs(clientsQuery);
      console.log('👥 Clients collection results:', clientSnapshot.size, 'documents found');
      
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
        
        // Load transactions based on user type - use the Firebase Auth UID for transactions
        await loadTransactions(userId, profile.userType);
        return;
      }

      // Try to find user in technicians collection
      const techsQuery = query(collection(db, COLLECTIONS.TECHNICIANS), where('authUid', '==', userId));
      const techSnapshot = await getDocs(techsQuery);
      console.log('🔧 Technicians collection results:', techSnapshot.size, 'documents found');
      
      if (!techSnapshot.empty) {
        const techDoc = techSnapshot.docs[0];
        const techData = techDoc.data();
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
        
        // Load transactions based on user type - use the Firebase Auth UID for transactions
        await loadTransactions(userId, profile.userType);
        return;
      }

      // Finally check users collection for existing admin/special users
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
      if (userDoc.exists()) {
        const profile = { id: userId, ...userDoc.data() } as UserProfile;
        
        // Check if this is an admin user by userType in database
        if (profile.userType === 'admin') {
          router.push('/admin');
          return;
        }
        
        setUserProfile(profile);
        setEditedProfile(profile);
        
        // Load transactions based on user type
        await loadTransactions(userId, profile.userType);
        return;
      }
      
      // Fallback: Try searching by email (for legacy users or those missing authUid)
      const userEmail = authUser?.email || user?.email;
      if (userEmail) {
        console.log('🔄 Fallback: Searching by email for legacy users...');
        
        // Search admins by email first
        const adminsByEmailQuery = query(collection(db, COLLECTIONS.ADMINS), where('email', '==', userEmail));
        const adminsByEmailSnapshot = await getDocs(adminsByEmailQuery);
        console.log('👑 Admins by email results:', adminsByEmailSnapshot.size, 'documents found');
        
        if (!adminsByEmailSnapshot.empty) {
          const adminDoc = adminsByEmailSnapshot.docs[0];
          const adminData = adminDoc.data();
          
          // Update the document with the current authUid for future lookups
          console.log('📝 Updating admin document with authUid:', userId);
          await updateDoc(doc(db, COLLECTIONS.ADMINS, adminDoc.id), { authUid: userId });
          
          console.log('🔐 Admin user found by email, redirecting to admin panel...');
          router.push('/admin');
          return;
        }
        
        // Search clients by email
        const clientsByEmailQuery = query(collection(db, COLLECTIONS.CLIENTS), where('email', '==', userEmail));
        const clientsByEmailSnapshot = await getDocs(clientsByEmailQuery);
        console.log('📧 Clients by email results:', clientsByEmailSnapshot.size, 'documents found');
        
        if (!clientsByEmailSnapshot.empty) {
          const clientDoc = clientsByEmailSnapshot.docs[0];
          const clientData = clientDoc.data();
          
          // Update the document with the current authUid for future lookups
          console.log('📝 Updating client document with authUid:', userId);
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
        console.log('🔧 Technicians by email results:', techsByEmailSnapshot.size, 'documents found');
        
        if (!techsByEmailSnapshot.empty) {
          const techDoc = techsByEmailSnapshot.docs[0];
          const techData = techDoc.data();
          
          // Update the document with the current authUid for future lookups
          console.log('📝 Updating technician document with authUid:', userId);
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
          await loadTransactions(userId, profile.userType);
          return;
        }
      }
      
      // Still no user found - this is likely a Google sign-in user who hasn't completed registration
      console.error('❌ User document not found in any collection (clients, technicians, users)');
      console.log('🔍 Checked collections for userId:', userId);
      console.log('📧 Checked collections for email:', authUser?.email || user?.email);
      console.log('💡 This might be a Google sign-in user who hasn\'t completed registration yet');
      
      // Sign out the user and redirect to registration
      console.log('🚪 Signing out user to allow re-registration...');
      await signOut(auth);
      router.push('/');
      
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadTransactions = async (userId: string, userType: string) => {
    try {
      // Load NEW tokenTransactions (ThankYou points and TOA tokens)
      let tokenTransactionsQuery;
      
      if (userType === 'technician') {
        // Load transactions received by this technician
        tokenTransactionsQuery = query(
          collection(db, 'tokenTransactions'),
          where('toTechnicianId', '==', userId),
          orderBy('timestamp', 'desc'),
          firestoreLimit(20)
        );
      } else {
        // Load transactions sent by this client + token purchases
        tokenTransactionsQuery = query(
          collection(db, 'tokenTransactions'),
          where('fromUserId', '==', userId),
          orderBy('timestamp', 'desc'),
          firestoreLimit(20)
        );
      }

      const tokenSnapshot = await getDocs(tokenTransactionsQuery);
      const tokenTransactions = await Promise.all(
        tokenSnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data() as any;
          
          // If names are missing, fetch them dynamically for better UX
          let fromName = data.fromName;
          let toName = data.toName;
          
          if (!fromName && data.fromUserId) {
            try {
              const userDocRef = doc(db, 'users', data.fromUserId);
              const userDoc = await getDoc(userDocRef);
              fromName = userDoc.exists() ? (userDoc.data() as any)?.name : null;
            } catch (error) {
              console.log('Could not fetch user name:', error);
            }
          }
          
          if (!toName && data.toTechnicianId) {
            try {
              const techDocRef = doc(db, 'technicians', data.toTechnicianId);
              const techDoc = await getDoc(techDocRef);
              toName = techDoc.exists() ? (techDoc.data() as any)?.name : null;
            } catch (error) {
              console.log('Could not fetch technician name:', error);
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

      // Also load LEGACY transactions for backward compatibility
      let legacyTransactionsQuery;
      
      if (userType === 'technician') {
        legacyTransactionsQuery = query(
          collection(db, 'transactions'),
          where('technicianId', '==', userId),
          where('type', '==', 'tip'),
          orderBy('timestamp', 'desc'),
          firestoreLimit(10)
        );
      } else {
        legacyTransactionsQuery = query(
          collection(db, 'transactions'),
          where('fromUserId', '==', userId),
          where('type', '==', 'tip'),
          orderBy('timestamp', 'desc'),
          firestoreLimit(10)
        );
      }

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
      console.error('Error loading transactions:', error);
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

  const handleSaveProfile = async () => {
    if (!userProfile?.id || !userProfile?.userType) return;

    try {
      // Use the correct collection based on user type
      const collectionName = userProfile.userType === 'technician' ? COLLECTIONS.TECHNICIANS : COLLECTIONS.CLIENTS;
      await updateDoc(doc(db, collectionName, userProfile.id), editedProfile);
      setUserProfile({ ...userProfile, ...editedProfile });
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error saving profile. Please try again.');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!userProfile?.id || deleteConfirmText !== 'DELETE') return;

    setIsDeleting(true);
    try {
      // Delete user document
      await deleteDoc(doc(db, 'users', userProfile.id));
      
      // Delete user account
      if (user) {
        await user.delete();
      }
      
      router.push('/');
    } catch (error) {
      console.error('Error deleting account:', error);
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
                    <span className="text-2xl"></span>
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
              
              <div className="bg-gradient-to-br from-amber-500/20 to-yellow-600/20 backdrop-blur-md rounded-xl border border-amber-400/30 p-6 hover:from-amber-500/30 hover:to-yellow-600/30 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-200 text-sm font-medium">Tokens Purchased</p>
                    <p className="text-white text-2xl font-bold">{userProfile.tokenBalance || 0}</p>
                  </div>
                  <div className="bg-amber-500/30 p-3 rounded-lg border border-amber-400/40">
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

        {/* Recent Activity */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          <h2 className="text-xl font-bold text-white mb-6">Recent Activity</h2>
          
          {tipTransactions.length > 0 ? (
            <div className="space-y-4">
              {tipTransactions.slice(0, 8).map((transaction, index) => {
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
                        </div>
                        {transaction.message && (
                          <p className="text-slate-300 text-xs mt-1 italic">"{transaction.message}"</p>
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
          onPayoutSuccess={() => {
            setShowPayoutModal(false);
          }}
        />
      )}
    </div>
  );
}