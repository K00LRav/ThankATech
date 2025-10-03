'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { 
  doc, 
  getDoc, 
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

// Types
interface UserProfile {
  id: string;
  name: string;
  email: string;
  userType: 'client' | 'technician';
  phone?: string;
  businessAddress?: string;
  businessPhone?: string;
  about?: string;
  username?: string;
  tokenBalance?: number;
  points?: number;
}

interface Transaction {
  id: string;
  amount: number;
  timestamp: any;
  fromName?: string;
  toName?: string;
  technicianName?: string;
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
  const [showPayoutModal, setShowPayoutModal] = useState(false);

  // Use earnings hook for technicians
  const { earnings, loading: earningsLoading } = useTechnicianEarnings(userProfile?.userType === 'technician' ? userProfile?.id || null : null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await loadUserProfile(currentUser.uid);
      } else {
        router.push('/');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadUserProfile = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const profile = { id: userId, ...userDoc.data() } as UserProfile;
        setUserProfile(profile);
        setEditedProfile(profile);
        
        // Load transactions based on user type
        await loadTransactions(userId, profile.userType);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadTransactions = async (userId: string, userType: string) => {
    try {
      let transactionsQuery;
      
      if (userType === 'technician') {
        // Load tips received by this technician
        transactionsQuery = query(
          collection(db, 'transactions'),
          where('technicianId', '==', userId),
          where('type', '==', 'tip'),
          orderBy('timestamp', 'desc'),
          firestoreLimit(10)
        );
      } else {
        // Load tips sent by this client
        transactionsQuery = query(
          collection(db, 'transactions'),
          where('fromUserId', '==', userId),
          where('type', '==', 'tip'),
          orderBy('timestamp', 'desc'),
          firestoreLimit(10)
        );
      }

      const snapshot = await getDocs(transactionsQuery);
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as object)
      })) as Transaction[];
      
      setTipTransactions(transactions);
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

  const handleSaveProfile = async () => {
    if (!userProfile?.id) return;

    try {
      await updateDoc(doc(db, 'users', userProfile.id), editedProfile);
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
              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-300 text-sm font-medium">Total Earned</p>
                    <p className="text-white text-2xl font-bold">{formatCurrency(earnings.totalEarnings)}</p>
                  </div>
                  <div className="bg-green-500/20 p-3 rounded-lg">
                    <span className="text-2xl">💰</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-300 text-sm font-medium">Tips Received</p>
                    <p className="text-white text-2xl font-bold">{formatCurrency(earnings.totalEarnings * 0.7)}</p>
                  </div>
                  <div className="bg-blue-500/20 p-3 rounded-lg">
                    <span className="text-2xl">🎯</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-300 text-sm font-medium">Service Earnings</p>
                    <p className="text-white text-2xl font-bold">{formatCurrency(earnings.totalEarnings * 0.3)}</p>
                  </div>
                  <div className="bg-purple-500/20 p-3 rounded-lg">
                    <span className="text-2xl">🔧</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-300 text-sm font-medium">Available Balance</p>
                    <p className="text-white text-2xl font-bold">{formatCurrency(earnings.availableBalance)}</p>
                  </div>
                  <div className="bg-yellow-500/20 p-3 rounded-lg">
                    <span className="text-2xl">💳</span>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {userProfile.userType === 'client' && (
            <>
              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-300 text-sm font-medium">Tips Sent</p>
                    <p className="text-white text-2xl font-bold">{tipTransactions.length}</p>
                  </div>
                  <div className="bg-green-500/20 p-3 rounded-lg">
                    <span className="text-2xl">💝</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-300 text-sm font-medium">Total Tipped</p>
                    <p className="text-white text-2xl font-bold">
                      {formatCurrency(tipTransactions.reduce((sum, tip) => sum + tip.amount, 0))}
                    </p>
                  </div>
                  <div className="bg-blue-500/20 p-3 rounded-lg">
                    <span className="text-2xl">🎁</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-300 text-sm font-medium">Tokens Purchased</p>
                    <p className="text-white text-2xl font-bold">{userProfile.tokenBalance || 0}</p>
                  </div>
                  <div className="bg-purple-500/20 p-3 rounded-lg">
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
              {tipTransactions.slice(0, 5).map((transaction, index) => (
                <div key={index} className="flex items-center justify-between py-3 px-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-500/20 p-2 rounded-lg">
                      <span className="text-lg">
                        {userProfile.userType === 'technician' ? '💰' : '🎁'}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {userProfile.userType === 'technician' 
                          ? `Tip received from ${transaction.fromName || 'Client'}`
                          : `Tip sent to ${transaction.toName || transaction.technicianName || 'Technician'}`
                        }
                      </p>
                      <p className="text-slate-400 text-sm">
                        {new Date(transaction.timestamp?.toDate ? transaction.timestamp.toDate() : transaction.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{formatCurrency(transaction.amount)}</p>
                    <p className={`text-xs ${userProfile.userType === 'technician' ? 'text-green-400' : 'text-blue-400'}`}>
                      {userProfile.userType === 'technician' ? 'Received' : 'Sent'}
                    </p>
                  </div>
                </div>
              ))}
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