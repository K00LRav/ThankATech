'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '@/lib/stripe';
import { auth, db, migrateTechnicianProfile, getTechnicianTransactions, getCustomerTransactions } from '@/lib/firebase';
import { onAuthStateChanged, signOut, Auth } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit, Firestore, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import Image from 'next/image';
import PayoutModal from '@/components/PayoutModal';
import { useTechnicianEarnings } from '@/hooks/useTechnicianEarnings';
import '@/lib/adminUtils'; // Load admin utilities for development

interface UserProfile {
  id: string;
  name: string;
  email: string;
  uniqueId?: string;
  username?: string;
  userType: 'technician' | 'customer';
  businessName?: string;
  category?: string;
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
  // Technician-specific fields
  experience?: string;
  certifications?: string;
  businessPhone?: string;
  businessEmail?: string;
  serviceArea?: string;
  hourlyRate?: string;
  availability?: string;
  // Customer-specific fields
  favoriteCategories?: string[];
  totalTipsSent?: number;
  totalThankYousSent?: number;
  favoriteTechnicians?: string[];
  totalSpent?: number;
  createdAt?: number;
}

interface Transaction {
  id: string;
  amount: number;
  customerName?: string;
  technicianName?: string;
  date: string;
  time?: string;
  createdAt?: string | Date;
  status: 'completed' | 'pending';
  platformFee: number;
  technicianPayout?: number;
}

// Component to display a favorite technician card
function FavoriteTechnicianCard({ technicianId, rank }: { technicianId: string, rank: number }) {
  const [technician, setTechnician] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTechnician = async () => {
      try {
        const techDoc = await getDoc(doc(db as Firestore, 'technicians', technicianId));
        if (techDoc.exists()) {
          setTechnician({ id: techDoc.id, ...techDoc.data() });
        }
      } catch (error) {
        console.error('Error fetching technician:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTechnician();
  }, [technicianId]);

  if (loading) {
    return (
      <div className="bg-white/5 backdrop-blur-lg rounded-lg p-4 border border-white/10 animate-pulse">
        <div className="h-12 bg-white/10 rounded"></div>
      </div>
    );
  }

  if (!technician) return null;

  const handleTechnicianClick = () => {
    // Navigate to technician's profile page using their username
    if (technician.username) {
      const profileUrl = `/${technician.username}`;
      console.log('🔍 Opening profile page:', profileUrl);
      window.open(profileUrl, '_blank');
    } else {
      // Fallback to search if no username (for older data)
      const searchTerm = technician.name || technician.businessName || '';
      const mainPageUrl = `/?search=${encodeURIComponent(searchTerm)}`;
      console.log('🔍 Opening main page with search (no username):', searchTerm);
      window.open(mainPageUrl, '_blank');
    }
  };

  return (
    <div 
      className="bg-white/5 backdrop-blur-lg rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-all duration-300 cursor-pointer group"
      onClick={handleTechnicianClick}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-10 h-10 bg-yellow-500/20 rounded-full">
          <span className="text-yellow-400 font-bold">#{rank}</span>
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-white group-hover:text-blue-300 transition-colors">{technician.name}</h4>
          <p className="text-slate-300 text-sm">{technician.businessName || technician.category || 'Service Provider'}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <span className="text-yellow-400 text-sm font-medium">Favorite</span>
            </div>
            <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ModernDashboard() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    name: '',
    businessName: '',
    phone: '',
    website: '',
    businessAddress: '',
    about: '',
    category: '',
    experience: '',
    certifications: '',
    businessPhone: '',
    businessEmail: '',
    serviceArea: '',
    hourlyRate: '',
    availability: ''
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  
  const { earnings: realEarnings, loading: earningsLoading } = useTechnicianEarnings(userProfile?.id || null);

  // Load user and technician profile
  useEffect(() => {
    if (!(auth as Auth)) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth as Auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        try {
          let userFound = false;
          
          // First, try to fetch technician profile from technicians collection
          const techDoc = await getDoc(doc(db as Firestore, 'technicians', firebaseUser.uid));
          
          if (techDoc.exists()) {
            const techData = { id: techDoc.id, ...techDoc.data(), userType: 'technician' } as UserProfile;
            setUserProfile(techData);
            userFound = true;
          }
          
          // If not found in technicians collection, check users collection
          if (!userFound) {
            const userDoc = await getDoc(doc(db as Firestore, 'users', firebaseUser.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              
              // Accept both technicians and customers from users collection
              if (userData.userType === 'technician') {
                const techData = { 
                  id: userDoc.id, 
                  ...userData,
                  businessName: userData.businessName || '',
                  category: userData.category || '',
                  points: userData.points || 0,
                  totalThankYous: userData.totalThankYous || 0,
                  totalTips: userData.totalTips || 0,
                  totalTipAmount: userData.totalTipAmount || 0
                } as UserProfile;

                setUserProfile(techData);
                userFound = true;
              } else if (userData.userType === 'customer') {
                let customerData = { 
                  id: userDoc.id, 
                  ...userData,
                  favoriteCategories: userData.favoriteCategories || [],
                  totalTipsSent: userData.totalTipsSent || 0,
                  totalThankYousSent: userData.totalThankYousSent || 0,
                  favoriteTechnicians: userData.favoriteTechnicians || [],
                  totalSpent: userData.totalSpent || 0
                } as UserProfile;

                // Always calculate tip counts from actual transactions for customers
                if (userData.userType === 'customer') {
                    console.log('� Calculating customer totals from transaction history...');
                    
                    // Count tips sent (each transaction = 1 tip sent)
                    const tipsQuery = query(
                      collection(db as Firestore, 'tips'),
                      where('customerId', '==', userDoc.id)
                    );
                    const tipsSnapshot = await getDocs(tipsQuery);
                    
                    // Count thank yous sent
                    const thankYousQuery = query(
                      collection(db as Firestore, 'thank_yous'),
                      where('userId', '==', userDoc.id)
                    );
                    const thankYousSnapshot = await getDocs(thankYousQuery);

                    // Calculate from actual transaction data
                    const actualTipCount = tipsSnapshot.size; // Each transaction = 1 tip
                    let actualTotalSpent = 0;
                    const technicianTipCounts = new Map(); // Track tips per technician
                    
                    tipsSnapshot.forEach((doc) => {
                      const tip = doc.data();
                      actualTotalSpent += tip.amount || 0;
                      
                      // Count tips per technician for favorites
                      const techId = tip.technicianId;
                      if (techId) {
                        technicianTipCounts.set(techId, (technicianTipCounts.get(techId) || 0) + 1);
                      }
                    });
                    
                    // Calculate favorites (technicians tipped most often)
                    const favorites = Array.from(technicianTipCounts.entries())
                      .sort((a, b) => b[1] - a[1]) // Sort by tip count descending
                      .slice(0, 5) // Top 5 favorites
                      .map(([techId, count]) => ({ technicianId: techId, tipCount: count }));
                    
                    const actualThankYous = thankYousSnapshot.size;

                    // Always use calculated values for customers
                    customerData = {
                      ...customerData,
                      totalTipsSent: actualTipCount,
                      totalSpent: actualTotalSpent / 100, // Convert from cents to dollars
                      totalThankYousSent: actualThankYous,
                      favoriteTechnicians: favorites.map(f => f.technicianId)
                    };

                    console.log(`✅ Customer totals: ${actualTipCount} tips sent, $${actualTotalSpent/100} spent, ${actualThankYous} thank yous, ${favorites.length} favorites`);
                }

                setUserProfile(customerData);
                userFound = true; // Using same flag to indicate user found
              }
            }
          }

          // If still not found, search in both collections by email as fallback
          if (!userFound && firebaseUser.email) {
            
            // Search technicians collection
            const techQuery = query(
              collection(db as Firestore, 'technicians'),
              where('email', '==', firebaseUser.email),
              limit(1)
            );
            const techSnapshot = await getDocs(techQuery);
            
            if (!techSnapshot.empty) {
              const techDoc = techSnapshot.docs[0];
              const techData = { id: techDoc.id, ...techDoc.data(), userType: 'technician' } as UserProfile;
              setUserProfile(techData);
              userFound = true;
            } else {
              // Search users collection for both technicians and customers
              const userQuery = query(
                collection(db as Firestore, 'users'),
                where('email', '==', firebaseUser.email),
                limit(1)
              );
              const userSnapshot = await getDocs(userQuery);
              
              if (!userSnapshot.empty) {
                const userDoc = userSnapshot.docs[0];
                const userData = userDoc.data();
                
                if (userData.userType === 'technician') {
                  const techData = { 
                    id: userDoc.id, 
                    ...userData,
                    businessName: userData.businessName || '',
                    category: userData.category || ''
                  } as UserProfile;
                  setUserProfile(techData);
                  userFound = true;
                } else if (userData.userType === 'customer') {
                  let customerData = { 
                    id: userDoc.id, 
                    ...userData,
                    favoriteCategories: userData.favoriteCategories || [],
                    totalTipsSent: userData.totalTipsSent || 0,
                    totalThankYousSent: userData.totalThankYousSent || 0,
                    favoriteTechnicians: userData.favoriteTechnicians || [],
                    totalSpent: userData.totalSpent || 0
                  } as UserProfile;

                    // Always calculate tip counts from actual transactions for customers
                  if (userData.userType === 'customer') {
                      console.log('� Calculating customer totals from transaction history (fallback)...');
                      
                      // Count tips sent (each transaction = 1 tip sent)
                      const tipsQuery = query(
                        collection(db as Firestore, 'tips'),
                        where('customerId', '==', userDoc.id)
                      );
                      const tipsSnapshot = await getDocs(tipsQuery);
                      
                      // Count thank yous sent
                      const thankYousQuery = query(
                        collection(db as Firestore, 'thank_yous'),
                        where('userId', '==', userDoc.id)
                      );
                      const thankYousSnapshot = await getDocs(thankYousQuery);

                      // Calculate from actual transaction data
                      const actualTipCount = tipsSnapshot.size; // Each transaction = 1 tip
                      let actualTotalSpent = 0;
                      const technicianTipCounts = new Map(); // Track tips per technician
                      
                      tipsSnapshot.forEach((doc) => {
                        const tip = doc.data();
                        actualTotalSpent += tip.amount || 0;
                        
                        // Count tips per technician for favorites
                        const techId = tip.technicianId;
                        if (techId) {
                          technicianTipCounts.set(techId, (technicianTipCounts.get(techId) || 0) + 1);
                        }
                      });
                      
                      // Calculate favorites (technicians tipped most often)
                      const favorites = Array.from(technicianTipCounts.entries())
                        .sort((a, b) => b[1] - a[1]) // Sort by tip count descending
                        .slice(0, 5) // Top 5 favorites
                        .map(([techId, count]) => ({ technicianId: techId, tipCount: count }));
                      
                      const actualThankYous = thankYousSnapshot.size;

                      // Always use calculated values for customers
                      customerData = {
                        ...customerData,
                        totalTipsSent: actualTipCount,
                        totalSpent: actualTotalSpent / 100, // Convert from cents to dollars
                        totalThankYousSent: actualThankYous,
                        favoriteTechnicians: favorites.map(f => f.technicianId)
                      };

                      console.log(`✅ Customer totals (fallback): ${actualTipCount} tips sent, $${actualTotalSpent/100} spent, ${actualThankYous} thank yous, ${favorites.length} favorites`);
                  }

                  setUserProfile(customerData);
                  userFound = true;
                }
              }
            }
          }
          
          // Debug logging and migration attempt
          if (!userFound) {
            // Try to migrate from users collection
            try {
              const migratedProfile = await migrateTechnicianProfile(firebaseUser.uid);
              if (migratedProfile && 'name' in migratedProfile) {
                const techProfile = migratedProfile as UserProfile;
                setUserProfile(techProfile);
                userFound = true;
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
        setUserProfile(null);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load transactions when user profile is available
  useEffect(() => {
    const loadTransactions = async () => {
      if (userProfile) {
        try {
          let realTransactions = [];
          
          if (userProfile.userType === 'technician') {
            realTransactions = await getTechnicianTransactions(
              userProfile.id, 
              userProfile.email, 
              (userProfile as any).uniqueId
            );
          } else if (userProfile.userType === 'customer') {
            realTransactions = await getCustomerTransactions(
              userProfile.id, 
              userProfile.email
            );
          }
          
          setTransactions(realTransactions);
        } catch (error) {
          console.error('❌ Error loading transactions:', error);
          setTransactions([]);
        }
      }
    };

    loadTransactions();
  }, [userProfile]);

  // Update form data when user profile changes
  useEffect(() => {
    if (userProfile) {
      setProfileFormData({
        name: userProfile.name || '',
        businessName: userProfile.businessName || '',
        phone: userProfile.phone || '',
        website: userProfile.website || '',
        businessAddress: userProfile.businessAddress || '',
        about: userProfile.about || '',
        category: userProfile.category || '',
        experience: userProfile.experience || '',
        certifications: userProfile.certifications || '',
        businessPhone: userProfile.businessPhone || '',
        businessEmail: userProfile.businessEmail || '',
        serviceArea: userProfile.serviceArea || '',
        hourlyRate: userProfile.hourlyRate || '',
        availability: userProfile.availability || ''
      });
    }
  }, [userProfile]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !user) return;

    setIsUpdatingProfile(true);
    try {
      // Determine which collection to update
      const isInTechniciansCollection = await getDoc(doc(db as Firestore, 'technicians', user.uid));
      const collectionName = isInTechniciansCollection.exists() ? 'technicians' : 'users';
      
      // Update the profile in Firebase
      await updateDoc(doc(db as Firestore, collectionName, user.uid), {
        name: profileFormData.name,
        businessName: profileFormData.businessName,
        phone: profileFormData.phone,
        website: profileFormData.website,
        businessAddress: profileFormData.businessAddress,
        about: profileFormData.about,
        category: profileFormData.category,
        updatedAt: new Date()
      });

      // Update local state
      setUserProfile(prev => prev ? {
        ...prev,
        ...profileFormData
      } : null);

      setIsEditingProfile(false);
      
      // Show success message (you could add a toast notification here)
      console.log('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      // Show error message (you could add a toast notification here)
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const sidebarItems = userProfile?.userType === 'customer' ? [
    { id: 'overview', label: 'Overview', icon: 'home' },
    { id: 'tips', label: 'My Tips', icon: 'heart' },
    { id: 'favorites', label: 'Favorites', icon: 'star' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ] : [
    { id: 'overview', label: 'Overview', icon: 'home' },
    { id: 'profile', label: 'Profile', icon: 'user' },
    { id: 'transactions', label: 'Transactions', icon: 'credit-card' },
    { id: 'payouts', label: 'Payouts', icon: 'dollar-sign' },
    { id: 'statistics', label: 'Statistics', icon: 'bar-chart' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  const renderIcon = (iconName: string) => {
    const iconClass = "w-5 h-5";
    switch (iconName) {
      case 'home':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
      case 'user':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
      case 'credit-card':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
      case 'dollar-sign':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>;
      case 'bar-chart':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
      case 'settings':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
      case 'heart':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>;
      case 'star':
        return <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>;
      default:
        return <div className={iconClass}></div>;
    }
  };

  const renderOverviewContent = () => (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {userProfile?.userType === 'customer' ? (
          <>
            {/* Customer Stats */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-2xl hover:shadow-blue-500/20 hover:bg-white/15 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <span className="text-2xl font-bold text-red-400">
                  {userProfile?.totalTipsSent || 0}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Tips Sent</h3>
              <p className="text-slate-400 text-sm">Number of tips sent</p>
            </div>

            <div 
              className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-2xl hover:shadow-blue-500/20 hover:bg-white/15 transition-all duration-300 cursor-pointer"
              onClick={() => setActiveTab('favorites')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <span className="text-2xl font-bold text-yellow-400">
                  {userProfile?.favoriteTechnicians?.length || 0}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Favorites</h3>
              <p className="text-slate-300 text-sm">Saved technicians</p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-2xl hover:shadow-blue-500/20 hover:bg-white/15 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-2xl font-bold text-blue-400">
                  {userProfile?.totalSpent ? formatCurrency(userProfile.totalSpent * 100) : '$0'}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Total Spent</h3>
              <p className="text-slate-400 text-sm">On tips & services</p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-2xl hover:shadow-blue-500/20 hover:bg-white/15 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-2xl font-bold text-purple-400">
                  {new Date(userProfile?.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Member Since</h3>
              <p className="text-slate-300 text-sm">Account created</p>
            </div>
          </>
        ) : (
          <>
            {/* Technician Stats */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-2xl hover:shadow-blue-500/20 hover:bg-white/15 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <span className="text-2xl font-bold text-green-400">
                  {formatCurrency(realEarnings.totalEarnings * 100)}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Total Earnings</h3>
              <p className="text-slate-300 text-sm">{realEarnings.tipCount || 0} tips received</p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-2xl hover:shadow-blue-500/20 hover:bg-white/15 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <span className="text-2xl font-bold text-blue-400">
                  {formatCurrency(realEarnings.availableBalance * 100)}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Available</h3>
              <p className="text-slate-300 text-sm">Ready to withdraw</p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-2xl hover:shadow-blue-500/20 hover:bg-white/15 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span className="text-2xl font-bold text-purple-400">{userProfile?.totalThankYous || 0}</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Thank Yous</h3>
              <p className="text-slate-300 text-sm">Customer appreciation</p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-2xl hover:shadow-blue-500/20 hover:bg-white/15 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-2xl font-bold text-yellow-400">
                  {formatCurrency(realEarnings.pendingBalance * 100)}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Pending</h3>
              <p className="text-slate-300 text-sm">Processing (2-3 days)</p>
            </div>
          </>
        )}
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Earnings Chart Placeholder */}
        <div className="lg:col-span-2 bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-2xl">
          <h3 className="text-lg font-semibold text-white mb-4">
            {userProfile?.userType === 'customer' ? 'Spending Overview' : 'Earnings Overview'}
          </h3>
          <div className="h-64 bg-gradient-to-br from-slate-700/30 to-blue-900/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-slate-600/30">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-slate-300">Chart visualization would go here</p>
              <p className="text-slate-400 text-sm mt-1">Interactive earnings chart</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-2xl">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => setShowPayoutModal(true)}
              disabled={realEarnings.availableBalance < 1.00}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {realEarnings.availableBalance > 0
                ? `Withdraw ${formatCurrency(realEarnings.availableBalance * 100)}`
                : 'No funds available'
              }
            </button>
            
            <button
              onClick={() => setActiveTab('profile')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Update Profile
            </button>
            
            {userProfile?.userType === 'technician' && (
              <Link
                href="/"
                className="block w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors text-center"
              >
                View Public Profile
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Recent Tips</h3>
            <button
              onClick={() => setActiveTab('transactions')}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium"
            >
              View All →
            </button>
          </div>
        </div>
        
        <div className="divide-y divide-white/10">
          {transactions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-slate-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <p className="text-slate-300">No tips received yet</p>
              <p className="text-slate-400 text-sm mt-1">Your tip history will appear here</p>
            </div>
          ) : (
            transactions.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {userProfile?.userType === 'customer' 
                        ? (transaction.technicianName || 'Unknown Technician')
                        : (transaction.customerName || 'Anonymous Customer')
                      }
                    </p>
                    <p className="text-sm text-slate-400">{transaction.date}</p>
                    <p className="text-xs text-slate-500">
                      {transaction.time || (transaction.createdAt ? new Date(transaction.createdAt).toLocaleTimeString() : new Date().toLocaleTimeString())}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${userProfile?.userType === 'customer' ? 'text-red-400' : 'text-green-400'}`}>
                    {userProfile?.userType === 'customer' ? '-' : '+'}
                    {formatCurrency(userProfile?.userType === 'customer' ? transaction.amount : (transaction.technicianPayout || (transaction.amount - transaction.platformFee)))}
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
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderProfileContent = () => (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Profile Management</h3>
          {!isEditingProfile && (
            <button
              onClick={() => setIsEditingProfile(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Profile
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 mb-6">
          {userProfile?.photoURL ? (
            <Image 
              src={userProfile.photoURL} 
              alt={userProfile.name}
              width={80}
              height={80}
              className="w-20 h-20 rounded-full border-2 border-blue-400"
            />
          ) : (
            <div className="w-20 h-20 bg-slate-600 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
          <div>
            <h4 className="text-xl font-bold text-white">{userProfile?.name || 'Your Name'}</h4>
            <p className="text-slate-300">{userProfile?.businessName || 'Business Name'}</p>
            <p className="text-slate-400 text-sm capitalize">{userProfile?.category || 'Category'}</p>
          </div>
        </div>
      </div>

      {/* Editable Profile Form */}
      {isEditingProfile ? (
        <form onSubmit={handleProfileUpdate} className="space-y-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Edit Profile Information</h3>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProfile(false);
                    // Reset form data to original values
                    if (userProfile) {
                      setProfileFormData({
                        name: userProfile.name || '',
                        businessName: userProfile.businessName || '',
                        phone: userProfile.phone || '',
                        website: userProfile.website || '',
                        businessAddress: userProfile.businessAddress || '',
                        about: userProfile.about || '',
                        category: userProfile.category || '',
                        experience: userProfile.experience || '',
                        certifications: userProfile.certifications || '',
                        businessPhone: userProfile.businessPhone || '',
                        businessEmail: userProfile.businessEmail || '',
                        serviceArea: userProfile.serviceArea || '',
                        hourlyRate: userProfile.hourlyRate || '',
                        availability: userProfile.availability || ''
                      });
                    }
                  }}
                  className="px-4 py-2 text-slate-400 hover:text-white border border-slate-600 hover:border-slate-500 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  {isUpdatingProfile ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={profileFormData.name}
                    onChange={(e) => setProfileFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-white/10 backdrop-blur-lg text-white border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:bg-white/15"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Business Name</label>
                  <input
                    type="text"
                    value={profileFormData.businessName}
                    onChange={(e) => setProfileFormData(prev => ({ ...prev, businessName: e.target.value }))}
                    className="w-full bg-white/10 backdrop-blur-lg text-white border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:bg-white/15"
                    placeholder="Enter your business name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
                  <select
                    value={profileFormData.category}
                    onChange={(e) => setProfileFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-white/10 backdrop-blur-lg text-white border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:bg-white/15"
                  >
                    <option value="">Select a category</option>
                    <option value="plumbing">Plumbing</option>
                    <option value="electrical">Electrical</option>
                    <option value="hvac">HVAC</option>
                    <option value="carpentry">Carpentry</option>
                    <option value="painting">Painting</option>
                    <option value="roofing">Roofing</option>
                    <option value="landscaping">Landscaping</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="automotive">Automotive</option>
                    <option value="telecommunications">Telecommunications</option>
                  </select>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={profileFormData.phone}
                    onChange={(e) => setProfileFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-white/10 backdrop-blur-lg text-white border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:bg-white/15"
                    placeholder="Enter your phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Website</label>
                  <input
                    type="url"
                    value={profileFormData.website}
                    onChange={(e) => setProfileFormData(prev => ({ ...prev, website: e.target.value }))}
                    className="w-full bg-white/10 backdrop-blur-lg text-white border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:bg-white/15"
                    placeholder="https://yourwebsite.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Business Address</label>
                  <input
                    type="text"
                    value={profileFormData.businessAddress}
                    onChange={(e) => setProfileFormData(prev => ({ ...prev, businessAddress: e.target.value }))}
                    className="w-full bg-white/10 backdrop-blur-lg text-white border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:bg-white/15"
                    placeholder="Enter your business address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Business Phone</label>
                  <input
                    type="tel"
                    value={profileFormData.businessPhone}
                    onChange={(e) => setProfileFormData(prev => ({ ...prev, businessPhone: e.target.value }))}
                    className="w-full bg-white/10 backdrop-blur-lg text-white border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:bg-white/15"
                    placeholder="Business phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Business Email</label>
                  <input
                    type="email"
                    value={profileFormData.businessEmail}
                    onChange={(e) => setProfileFormData(prev => ({ ...prev, businessEmail: e.target.value }))}
                    className="w-full bg-white/10 backdrop-blur-lg text-white border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:bg-white/15"
                    placeholder="business@company.com"
                  />
                </div>
              </div>
            </div>

            {/* Professional Details Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Years of Experience</label>
                  <input
                    type="text"
                    value={profileFormData.experience}
                    onChange={(e) => setProfileFormData(prev => ({ ...prev, experience: e.target.value }))}
                    className="w-full bg-white/10 backdrop-blur-lg text-white border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:bg-white/15"
                    placeholder="e.g., 5 years"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Certifications/Licenses</label>
                  <input
                    type="text"
                    value={profileFormData.certifications}
                    onChange={(e) => setProfileFormData(prev => ({ ...prev, certifications: e.target.value }))}
                    className="w-full bg-white/10 backdrop-blur-lg text-white border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:bg-white/15"
                    placeholder="Licensed Master Plumber, EPA Certified"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Service Area</label>
                  <input
                    type="text"
                    value={profileFormData.serviceArea}
                    onChange={(e) => setProfileFormData(prev => ({ ...prev, serviceArea: e.target.value }))}
                    className="w-full bg-white/10 backdrop-blur-lg text-white border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:bg-white/15"
                    placeholder="Atlanta Metro - 25 mile radius"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Hourly Rate</label>
                  <input
                    type="text"
                    value={profileFormData.hourlyRate}
                    onChange={(e) => setProfileFormData(prev => ({ ...prev, hourlyRate: e.target.value }))}
                    className="w-full bg-white/10 backdrop-blur-lg text-white border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:bg-white/15"
                    placeholder="$50-$85/hour"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">Availability</label>
              <input
                type="text"
                value={profileFormData.availability}
                onChange={(e) => setProfileFormData(prev => ({ ...prev, availability: e.target.value }))}
                className="w-full bg-white/10 backdrop-blur-lg text-white border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:bg-white/15"
                placeholder="Monday-Friday 8AM-6PM, Emergency calls 24/7"
              />
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">About Your Business</label>
              <textarea
                value={profileFormData.about}
                onChange={(e) => setProfileFormData(prev => ({ ...prev, about: e.target.value }))}
                rows={4}
                className="w-full bg-white/10 backdrop-blur-lg text-white border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:bg-white/15"
                placeholder="Describe your business, services, and expertise..."
              />
            </div>
          </div>
        </form>
      ) : (
        /* Read-only Profile View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-400">Email</label>
                <p className="text-white">{userProfile?.email || 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm text-slate-400">Phone</label>
                <p className="text-white">{userProfile?.phone || 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm text-slate-400">Website</label>
                <p className="text-white break-all">{userProfile?.website || 'Not set'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">Business Details</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-400">Business Address</label>
                <p className="text-white">{userProfile?.businessAddress || 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm text-slate-400">About</label>
                <p className="text-white text-sm">{userProfile?.about || 'No description provided'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderTransactionsContent = () => (
    <div className="space-y-6">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 shadow-2xl">
        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-blue-900/20 to-slate-800/20">
          <h3 className="text-lg font-semibold text-white">
            {userProfile?.userType === 'customer' ? 'Tips Sent' : 'Tips Received'}
          </h3>
        </div>
        
        <div className="divide-y divide-white/10">
          {transactions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-slate-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <p className="text-slate-300">No transactions yet</p>
              <p className="text-slate-400 text-sm mt-1">Your transaction history will appear here</p>
            </div>
          ) : (
            transactions.map((transaction) => (
              <div key={transaction.id} className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {userProfile?.userType === 'customer' 
                        ? (transaction.technicianName || 'Unknown Technician')
                        : (transaction.customerName || 'Anonymous Customer')
                      }
                    </p>
                    <p className="text-sm text-slate-400">{transaction.date}</p>
                    <p className="text-xs text-slate-500">
                      {transaction.time || (transaction.createdAt ? new Date(transaction.createdAt).toLocaleTimeString() : new Date().toLocaleTimeString())}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${userProfile?.userType === 'customer' ? 'text-red-400' : 'text-green-400'}`}>
                    {userProfile?.userType === 'customer' ? '-' : '+'}
                    {formatCurrency(userProfile?.userType === 'customer' ? transaction.amount : (transaction.technicianPayout || (transaction.amount - transaction.platformFee)))}
                  </p>
                  <p className="text-sm text-slate-400">
                    {userProfile?.userType === 'customer' 
                      ? `Total: ${formatCurrency(transaction.amount)} (includes $0.99 fee)`
                      : `${formatCurrency(transaction.amount)} - ${formatCurrency(transaction.platformFee)} fee`
                    }
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
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderPayoutsContent = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-2xl">
          <h3 className="text-lg font-semibold text-white mb-2">Available Balance</h3>
          <p className="text-3xl font-bold text-green-400">
            {formatCurrency(realEarnings.availableBalance * 100)}
          </p>
          <button
            onClick={() => setShowPayoutModal(true)}
            disabled={realEarnings.availableBalance < 1.00}
            className="w-full mt-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Withdraw Now
          </button>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-2xl">
          <h3 className="text-lg font-semibold text-white mb-2">Pending</h3>
          <p className="text-3xl font-bold text-yellow-400">
            {formatCurrency(realEarnings.pendingBalance * 100)}
          </p>
          <p className="text-slate-300 text-sm mt-2">Processing in 2-3 days</p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-2xl">
          <h3 className="text-lg font-semibold text-white mb-2">Total Paid Out</h3>
          <p className="text-3xl font-bold text-blue-400">$0.00</p>
          <p className="text-slate-400 text-sm mt-2">All-time payouts</p>
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 shadow-2xl">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">Payout History</h3>
        </div>
        
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-slate-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <p className="text-slate-300">No payouts yet</p>
          <p className="text-slate-400 text-sm mt-1">Your payout history will appear here</p>
        </div>
      </div>
    </div>
  );

  const handleDeleteProfile = async () => {
    if (deleteConfirmationText !== 'DELETE') {
      alert('Please type "DELETE" to confirm account deletion.');
      return;
    }

    setIsDeleting(true);
    try {
      // Delete user document from Firestore
      if (userProfile?.id) {
        await updateDoc(doc(db as Firestore, userProfile.userType === 'customer' ? 'users' : 'technicians', userProfile.id), {
          deleted: true,
          deletedAt: Date.now()
        });
      }

      // Sign out and redirect
      await signOut(auth);
      window.location.href = '/';
    } catch (error) {
      console.error('Error deleting profile:', error);
      alert('Error deleting profile. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmation(false);
      setDeleteConfirmationText('');
    }
  };

  const renderSettingsContent = () => (
    <div className="space-y-6">
      {/* Account Settings */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Account Settings</h3>
        </div>

        <div className="space-y-4">
          {/* Notifications */}
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <h4 className="font-medium text-white mb-2">Notifications</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-3">
                <input type="checkbox" className="rounded bg-white/10 border-white/20 text-blue-500" defaultChecked />
                <span className="text-slate-300">Email notifications for new {userProfile?.userType === 'customer' ? 'service updates' : 'tips received'}</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="rounded bg-white/10 border-white/20 text-blue-500" defaultChecked />
                <span className="text-slate-300">Marketing and promotional emails</span>
              </label>
            </div>
          </div>

          {/* Privacy */}
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <h4 className="font-medium text-white mb-2">Privacy</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-3">
                <input type="checkbox" className="rounded bg-white/10 border-white/20 text-blue-500" defaultChecked />
                <span className="text-slate-300">Make profile {userProfile?.userType === 'customer' ? 'visible to technicians' : 'visible to customers'}</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="rounded bg-white/10 border-white/20 text-blue-500" />
                <span className="text-slate-300">Allow analytics data collection</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-500/10 backdrop-blur-lg rounded-xl p-6 border border-red-500/20 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-red-400">Danger Zone</h3>
            <p className="text-slate-300 text-sm mt-1">Irreversible actions that will permanently affect your account</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-red-500/5 rounded-lg border border-red-500/20">
            <h4 className="font-medium text-red-400 mb-2">Delete Account</h4>
            <p className="text-slate-300 text-sm mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
              {userProfile?.userType === 'technician' && ' All your tips and earnings will be processed before deletion.'}
            </p>
            <button
              onClick={() => setShowDeleteConfirmation(true)}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.982 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Confirm Account Deletion</h3>
            </div>
            <p className="text-slate-300 mb-4">
              This will permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <p className="text-slate-300 mb-4">
              Type <span className="font-bold text-red-400">DELETE</span> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              className="w-full bg-white/10 backdrop-blur-lg text-white border border-white/20 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-400"
              placeholder="Type DELETE here"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirmation(false);
                  setDeleteConfirmationText('');
                }}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProfile}
                disabled={isDeleting || deleteConfirmationText !== 'DELETE'}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewContent();
      case 'profile':
        return renderProfileContent();
      case 'transactions':
        return renderTransactionsContent();
      case 'payouts':
        return renderPayoutsContent();
      case 'statistics':
        return (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20 shadow-2xl text-center">
            <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Statistics</h3>
            <p className="text-slate-300">Detailed analytics coming soon</p>
          </div>
        );
      case 'tips':
        return (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <span className="text-2xl font-bold text-red-400">
                    {userProfile?.totalTipsSent || 0}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">Tips Sent</h3>
                <p className="text-slate-400 text-sm">Total tips given</p>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <span className="text-2xl font-bold text-blue-400">
                    {userProfile?.totalSpent ? formatCurrency(userProfile.totalSpent * 100) : '$0.00'}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">Total Spent</h3>
                <p className="text-slate-400 text-sm">On tips & appreciation</p>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                  </div>
                  <span className="text-2xl font-bold text-green-400">
                    {userProfile?.totalThankYousSent || 0}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">Thank Yous</h3>
                <p className="text-slate-400 text-sm">Sent to technicians</p>
              </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 shadow-2xl">
              <div className="p-6 border-b border-white/10 bg-gradient-to-r from-red-900/20 to-slate-800/20">
                <h3 className="text-lg font-semibold text-white">Tips & Thank Yous History</h3>
              </div>
              
              <div className="divide-y divide-white/10">
                {transactions.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-slate-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <p className="text-slate-300">No tips sent yet</p>
                    <p className="text-slate-400 text-sm mt-1">Start appreciating technicians by browsing the home page</p>
                    <Link
                      href="/"
                      className="inline-flex items-center gap-2 mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Find Technicians
                    </Link>
                  </div>
                ) : (
                  transactions.map((transaction) => (
                    <div key={transaction.id} className="p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-white">Tip to {transaction.technicianName}</p>
                          <p className="text-sm text-slate-400">{transaction.date}</p>
                          <p className="text-xs text-slate-500">
                            {transaction.time || (transaction.createdAt ? new Date(transaction.createdAt).toLocaleTimeString() : new Date().toLocaleTimeString())}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-400">
                          -{formatCurrency(transaction.amount)}
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
                  ))
                )}
              </div>
            </div>
          </div>
        );
      case 'favorites':
        return (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Your Favorite Technicians</h3>
                  <p className="text-slate-300 text-sm">Based on your tipping frequency</p>
                </div>
              </div>

              <div className="space-y-4">
                {userProfile?.favoriteTechnicians && userProfile.favoriteTechnicians.length > 0 ? (
                  userProfile.favoriteTechnicians.map((techId, index) => (
                    <FavoriteTechnicianCard key={techId} technicianId={techId} rank={index + 1} />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-white mb-2">No Favorites Yet</h4>
                    <p className="text-slate-300">Start tipping technicians to build your favorites list!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'settings':
        return renderSettingsContent();
      default:
        return renderOverviewContent();
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20 max-w-md mx-4">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Dashboard Access Required</h1>
          <p className="text-slate-300 mb-6">Please sign in to access your dashboard.</p>
          <Link 
            href="/" 
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Go to Home & Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20 max-w-md mx-4">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.982 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Technician Profile Required</h1>
          <p className="text-slate-300 mb-6">You need to register as a technician to use this dashboard.</p>
          <Link 
            href="/" 
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white/10 backdrop-blur-xl border-r border-white/20 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">TT</span>
            </div>
            <h1 className="text-white font-bold text-lg">Dashboard</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User Profile Section */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            {userProfile?.photoURL ? (
              <Image 
                src={userProfile.photoURL} 
                alt={userProfile.name}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full border-2 border-blue-400"
              />
            ) : (
              <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">
                {userProfile?.name || user?.displayName || 'User'}
              </p>
              <p className="text-slate-400 text-sm truncate">
                {userProfile?.businessName || 'Professional'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6">
          <ul className="space-y-2">
            {sidebarItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors ${
                    activeTab === item.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {renderIcon(item.icon)}
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom section */}
        <div className="p-4 border-t border-white/10 space-y-2">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-white/10 hover:text-white rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Back to Home
          </Link>
          <button
            onClick={async () => {
              try {
                await signOut(auth);
                window.location.href = '/';
              } catch (error) {
                console.error('Error signing out:', error);
              }
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {/* Top Bar */}
        <div className="bg-white/10 backdrop-blur-xl border-b border-white/20 h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h2 className="text-xl font-semibold text-white capitalize">{activeTab}</h2>
              <p className="text-slate-400 text-sm">
                {activeTab === 'overview' && (userProfile?.userType === 'customer' ? 'Your activity overview' : 'Your performance overview')}
                {activeTab === 'profile' && 'Manage your profile information'}
                {activeTab === 'transactions' && 'View your transaction history'}
                {activeTab === 'payouts' && 'Manage your earnings and payouts'}
                {activeTab === 'statistics' && 'Detailed performance analytics'}
                {activeTab === 'tips' && 'View your tip history and sent thank yous'}
                {activeTab === 'favorites' && 'Your saved and favorite service providers'}
                {activeTab === 'settings' && 'Account and notification settings'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                className="bg-white/10 backdrop-blur-lg text-white placeholder-slate-300 border border-white/20 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:bg-white/15"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 1115 0z" />
                </svg>
              </div>
              <span className="text-slate-300 text-sm font-medium">{user?.displayName || 'John Smith'}</span>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 overflow-auto">
          {renderContent()}
        </div>
      </div>

      {/* Payout Modal */}
      {showPayoutModal && (
        <PayoutModal
          isOpen={showPayoutModal}
          onClose={() => setShowPayoutModal(false)}
          availableBalance={realEarnings.availableBalance}
          technicianId={user?.uid || ''}
          onPayoutSuccess={(amount) => {
            setShowPayoutModal(false);
          }}
        />
      )}

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}