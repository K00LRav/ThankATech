'use client';
// @ts-nocheck

import React, { useState, useEffect } from 'react';
import { auth, db, registerUser, deleteUserProfile, authHelpers, getCustomerTransactions } from '@/lib/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  photoURL?: string;
  userType: 'technician' | 'customer';
  // Customer-specific fields
  favoriteCategories?: string[];
  notificationPreferences?: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    tipReceipts: boolean;
  };
  // Technician-specific fields (for backwards compatibility)
  businessName?: string;
  category?: string;
  experience?: string;
  certifications?: string;
  description?: string;
  businessAddress?: string;
  website?: string;
  businessPhone?: string;
  businessEmail?: string;
  serviceArea?: string;
  hourlyRate?: string;
  availability?: string;
}

// Utility function to format currency
const formatCurrency = (amountInCents: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amountInCents / 100);
};

// Customer Tip History Component
const CustomerTipHistory: React.FC<{ profile: UserProfile }> = ({ profile }) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTransactions = async () => {
      if (!profile?.uid && !profile?.email) return;
      
      try {
        const tips = await getCustomerTransactions(profile.uid, profile.email);
        setTransactions(tips);
      } catch (err) {
        console.error('Error loading customer transactions:', err);
        setError('Failed to load tip history');
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, [profile?.uid, profile?.email]);

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-white/10">
        <h2 className="text-xl font-bold text-white mb-6">Recent Tips</h2>
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-200">Loading tip history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-white/10">
        <h2 className="text-xl font-bold text-white mb-6">Recent Tips</h2>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Error Loading Tips</h3>
          <p className="text-red-300 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-white/10">
        <h2 className="text-xl font-bold text-white mb-6">Recent Tips</h2>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No tips yet</h3>
          <p className="text-blue-200 mb-4">When you tip technicians, your history will appear here.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-900 transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Find Technicians
          </Link>
        </div>
      </div>
    );
  }

  const totalTipped = transactions.reduce((sum, tip) => sum + tip.amount, 0);

  return (
    <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Recent Tips</h2>
        <div className="text-right">
          <p className="text-sm text-blue-200">Total Tipped</p>
          <p className="text-lg font-bold text-white">{formatCurrency(totalTipped)}</p>
        </div>
      </div>
      
      <div className="space-y-4">
        {transactions.slice(0, 5).map((tip) => (
          <div key={tip.id} className="bg-slate-700/50 rounded-lg p-4 border border-blue-500/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium">{tip.technicianName}</p>
                  <p className="text-blue-200 text-sm">{tip.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-bold">{formatCurrency(tip.amount)}</p>
                <p className="text-green-400 text-sm capitalize">{tip.status}</p>
              </div>
            </div>
          </div>
        ))}
        
        {transactions.length > 5 && (
          <div className="text-center pt-4">
            <p className="text-blue-200 text-sm">
              Showing 5 of {transactions.length} tips
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default function ProfilePage() {
  const [user, loading, error] = useAuthState(auth);
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      try {
        console.log('Loading profile for user:', user.uid);
        
        // First, try to find the user in the users collection
        let userDoc = await getDoc(doc(db, 'users', user.uid));
        let userData = null;
        
        if (userDoc.exists()) {
          userData = userDoc.data() as UserProfile;
          console.log('Profile data loaded from users collection:', userData);
        } else {
          // If not found in users, check technicians collection by email
          console.log('Not found in users collection, checking technicians collection...');
          const { query, where, getDocs, collection } = await import('firebase/firestore');
          const techniciansQuery = query(
            collection(db, 'technicians'), 
            where('email', '==', user.email)
          );
          const techniciansSnapshot = await getDocs(techniciansQuery);
          
          if (!techniciansSnapshot.empty) {
            const technicianDoc = techniciansSnapshot.docs[0];
            const technicianData = technicianDoc.data();
            console.log('Profile data loaded from technicians collection:', technicianData);
            
            // Convert technician data to user profile format
            userData = {
              uid: user.uid,
              name: technicianData.name || user.displayName || '',
              email: technicianData.email || user.email || '',
              phone: technicianData.phone || '',
              location: technicianData.location || '',
              businessName: technicianData.businessName || '',
              category: technicianData.category || '',
              experience: technicianData.experience || '',
              certifications: technicianData.certifications || '',
              description: technicianData.about || '',
              businessAddress: technicianData.businessAddress || '',
              website: technicianData.website || '',
              businessPhone: technicianData.businessPhone || '',
              businessEmail: technicianData.businessEmail || '',
              serviceArea: technicianData.serviceArea || '',
              hourlyRate: technicianData.hourlyRate || '',
              availability: technicianData.availability || '',
              // Prioritize current Google photo, then stored image
              photoURL: user.photoURL || technicianData.image || '',
              userType: 'technician'
            } as UserProfile;
          }
        }
        
        if (userData) {
          setProfile(userData);
          setFormData(userData);
        } else {
          console.log('No profile document found for user:', user.uid);
          console.log('User info:', { 
            uid: user.uid, 
            email: user.email, 
            displayName: user.displayName,
            photoURL: user.photoURL 
          });
          
          // Create a basic profile structure if none exists
          const basicProfile: Partial<UserProfile> = {
            uid: user.uid,
            name: user.displayName || '',
            email: user.email || '',
            phone: '',
            location: '',
            businessName: '',
            category: '',
            experience: '',
            certifications: '',
            description: '',
            businessAddress: '',
            website: '',
            businessPhone: '',
            businessEmail: '',
            serviceArea: '',
            hourlyRate: '',
            availability: '',
            photoURL: user.photoURL || '',
            userType: 'customer' // Default to customer for new profiles
          };
          setProfile(basicProfile as UserProfile);
          setFormData(basicProfile);
          setFormError(`Profile not found for user ${user.email}. This might be because:
          
1. You registered recently and the profile wasn't created properly
2. You're signed in with a different account than the one you registered with
3. There was an issue during registration

Please complete your profile information below and click "Save Changes" to create your profile.`);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        setFormError('Failed to load profile data: ' + (error instanceof Error ? error.message : 'Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    if (!loading) {
      loadProfile();
    }
  }, [user, loading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setSaveMessage(null);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    setFormError(null);

    try {
      // Prepare the complete profile data
      const profileData = {
        ...formData,
        uid: user.uid,
        email: user.email,
        photoURL: user.photoURL,
        updatedAt: new Date().toISOString()
      };

      // Determine which collection to use based on user type
      const collection = profile?.userType === 'technician' ? 'technicians' : 'users';
      
      // Try to update first, if that fails, create the document
      try {
        await updateDoc(doc(db, collection, user.uid), profileData);
        setSaveMessage('Profile updated successfully!');
      } catch (updateError) {
        // If update fails (document doesn't exist), create it
        console.log('Document does not exist, creating new profile...');
        await setDoc(doc(db, collection, user.uid), {
          ...profileData,
          createdAt: new Date().toISOString()
        });
        setSaveMessage('Profile created successfully!');
      }
      
      setProfile({ ...profile, ...profileData } as UserProfile);
    } catch (error) {
      console.error('Error saving profile:', error);
      setFormError('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!user || !profile) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete your ${profile.userType} profile? This action cannot be undone and will permanently delete your account and all associated data.`
    );
    
    if (!confirmed) return;
    
    try {
      setIsDeleting(true);
      setFormError(null);
      
      await deleteUserProfile(user.uid, profile.userType);
      
      // Sign out and redirect to home
      await auth.signOut();
      window.location.href = '/';
      
    } catch (error) {
      console.error('Error deleting profile:', error);
      setFormError('Failed to delete profile. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading profile...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Please sign in to edit your profile</h1>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Profile not found</h1>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-blue-700/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-500/20 to-blue-800/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-blue-300/10 to-blue-600/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Header */}
      <div className="relative bg-slate-800/50 backdrop-blur border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">
                {profile?.userType === 'technician' ? 'Edit Profile' : 'My Profile'}
              </h1>
              <p className="text-blue-200 mt-1">
                {profile?.userType === 'technician' 
                  ? 'Update your technician information' 
                  : 'Manage your account settings and preferences'
                }
              </p>
            </div>
            <div className="flex gap-3">
              {profile?.userType === 'technician' ? (
                <Link
                  href="/dashboard"
                  className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-2 rounded-xl transition-colors"
                >
                  Back to Dashboard
                </Link>
              ) : (
                <Link
                  href="/"
                  className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-2 rounded-xl transition-colors"
                >
                  Back to Home
                </Link>
              )}
              <Link
                href="/"
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-xl transition-colors"
              >
                View Technicians
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-8">
        {/* Status Messages */}
        {saveMessage && (
          <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-green-300 font-medium">{saveMessage}</p>
            </div>
          </div>
        )}

        {formError && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-300 font-medium">{formError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Profile Photo Section */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-white/10">
            <h2 className="text-xl font-bold text-white mb-4">Profile Photo</h2>
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                {formData.photoURL ? (
                  <img src={formData.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-white">
                    {formData.name?.charAt(0) || 'T'}
                  </span>
                )}
              </div>
              <div>
                <p className="text-white font-medium mb-1">Profile Picture</p>
                <p className="text-blue-200 text-sm">
                  {formData.photoURL ? 'Using Google profile photo' : 'Default avatar'}
                </p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-white/10">
            <h2 className="text-xl font-bold text-white mb-6">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-blue-200 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-blue-200 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-blue-200 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleInputChange}
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-blue-200 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location || ''}
                  onChange={handleInputChange}
                  placeholder="Atlanta, GA"
                  className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>
          </div>

          {/* Customer Preferences */}
          {profile.userType === 'customer' && (
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-6">Preferences & Settings</h2>
              <div className="space-y-6">
                {/* Notification Preferences */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Notification Preferences</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={formData.notificationPreferences?.emailNotifications ?? true}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          notificationPreferences: {
                            ...prev.notificationPreferences,
                            emailNotifications: e.target.checked,
                            smsNotifications: prev.notificationPreferences?.smsNotifications ?? false,
                            tipReceipts: prev.notificationPreferences?.tipReceipts ?? true
                          }
                        }))}
                        className="w-4 h-4 text-blue-600 bg-white/10 border-blue-500/30 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-white">Email notifications</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={formData.notificationPreferences?.smsNotifications ?? false}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          notificationPreferences: {
                            ...prev.notificationPreferences,
                            emailNotifications: prev.notificationPreferences?.emailNotifications ?? true,
                            smsNotifications: e.target.checked,
                            tipReceipts: prev.notificationPreferences?.tipReceipts ?? true
                          }
                        }))}
                        className="w-4 h-4 text-blue-600 bg-white/10 border-blue-500/30 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-white">SMS notifications</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={formData.notificationPreferences?.tipReceipts ?? true}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          notificationPreferences: {
                            ...prev.notificationPreferences,
                            emailNotifications: prev.notificationPreferences?.emailNotifications ?? true,
                            smsNotifications: prev.notificationPreferences?.smsNotifications ?? false,
                            tipReceipts: e.target.checked
                          }
                        }))}
                        className="w-4 h-4 text-blue-600 bg-white/10 border-blue-500/30 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-white">Tip receipts</span>
                    </label>
                  </div>
                </div>

                {/* Favorite Categories */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Favorite Service Categories</h3>
                  <p className="text-blue-200 text-sm mb-4">Select categories you&apos;re most interested in to see relevant technicians first.</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {['plumbing', 'electrical', 'hvac', 'automotive', 'appliance', 'handyman', 'computer', 'locksmith', 'contractor', 'roofing', 'landscaping', 'cleaning', 'painting'].map((category) => (
                      <label key={category} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.favoriteCategories?.includes(category) ?? false}
                          onChange={(e) => {
                            const currentFavorites = formData.favoriteCategories || [];
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                favoriteCategories: [...currentFavorites, category]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                favoriteCategories: currentFavorites.filter(c => c !== category)
                              }));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 bg-white/10 border-blue-500/30 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        <span className="text-white capitalize">
                          {category === 'hvac' ? 'HVAC' : 
                           category === 'automotive' ? 'Auto Mechanic' :
                           category === 'electrical' ? 'Electrician' :
                           category === 'plumbing' ? 'Plumber' :
                           category === 'computer' ? 'Computer Tech' :
                           category === 'contractor' ? 'General Contractor' :
                           category}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Methods for Customers */}
          {profile.userType === 'customer' && (
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Payment Methods</h2>
                <button className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-blue-900 transition-all duration-200 text-sm">
                  Add Payment Method
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Default Card Display */}
                <div className="bg-slate-700/50 rounded-lg p-4 border border-blue-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-white font-medium">Payment via Stripe</p>
                        <p className="text-blue-200 text-sm">Secure payment processing for tips</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-medium">Active</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-center py-4">
                  <p className="text-blue-200 text-sm">
                    Payment methods are securely managed through Stripe during the tip process.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tip History for Customers */}
          {profile.userType === 'customer' && <CustomerTipHistory profile={profile} />}

          {/* Favorite Technicians for Customers */}
          {profile.userType === 'customer' && (
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-6">Favorite Technicians</h2>
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No favorites yet</h3>
                <p className="text-blue-200 mb-4">Save your favorite technicians for quick access and easy tipping.</p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-900 transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Browse Technicians
                </Link>
              </div>
            </div>
          )}

          {/* Account Settings for Customers */}
          {profile.userType === 'customer' && (
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-6">Account Settings</h2>
              <div className="space-y-6">
                {/* Privacy Settings */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Privacy & Security</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-white font-medium">Profile Visibility</p>
                        <p className="text-blue-200 text-sm">Control who can see your profile information</p>
                      </div>
                      <select className="bg-slate-700 border border-blue-500/30 rounded-lg text-white px-3 py-2 text-sm">
                        <option value="private">Private</option>
                        <option value="public">Public</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-white font-medium">Data Export</p>
                        <p className="text-blue-200 text-sm">Download your account data</p>
                      </div>
                      <button className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                        Export Data
                      </button>
                    </div>
                  </div>
                </div>


              </div>
            </div>
          )}

          {/* Business Information */}
          {profile.userType === 'technician' && (
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-6">Business Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="businessName" className="block text-sm font-medium text-blue-200 mb-2">
                    Business Name
                  </label>
                  <input
                    type="text"
                    id="businessName"
                    name="businessName"
                    value={formData.businessName || ''}
                    onChange={handleInputChange}
                    placeholder="ABC Plumbing Services"
                    className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-blue-200 mb-2">
                    Category *
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category || ''}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                  >
                    <option className="bg-slate-800 text-white" value="">Select category...</option>
                    <option className="bg-slate-800 text-white" value="plumbing">Plumber</option>
                    <option className="bg-slate-800 text-white" value="electrical">Electrician</option>
                    <option className="bg-slate-800 text-white" value="hvac">HVAC Technician</option>
                    <option className="bg-slate-800 text-white" value="automotive">Auto Mechanic</option>
                    <option className="bg-slate-800 text-white" value="appliance">Appliance Repair</option>
                    <option className="bg-slate-800 text-white" value="handyman">Handyman</option>
                    <option className="bg-slate-800 text-white" value="computer">Computer Technician</option>
                    <option className="bg-slate-800 text-white" value="locksmith">Locksmith</option>
                    <option className="bg-slate-800 text-white" value="contractor">General Contractor</option>
                    <option className="bg-slate-800 text-white" value="roofing">Roofing Contractor</option>
                    <option className="bg-slate-800 text-white" value="landscaping">Landscaping</option>
                    <option className="bg-slate-800 text-white" value="cleaning">House Cleaning</option>
                    <option className="bg-slate-800 text-white" value="painting">Painting</option>
                    <option className="bg-slate-800 text-white" value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="businessPhone" className="block text-sm font-medium text-blue-200 mb-2">
                    Business Phone
                  </label>
                  <input
                    type="tel"
                    id="businessPhone"
                    name="businessPhone"
                    value={formData.businessPhone || ''}
                    onChange={handleInputChange}
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div>
                  <label htmlFor="businessEmail" className="block text-sm font-medium text-blue-200 mb-2">
                    Business Email
                  </label>
                  <input
                    type="email"
                    id="businessEmail"
                    name="businessEmail"
                    value={formData.businessEmail || ''}
                    onChange={handleInputChange}
                    placeholder="contact@yourbusiness.com"
                    className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-blue-200 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    id="website"
                    name="website"
                    value={formData.website || ''}
                    onChange={handleInputChange}
                    placeholder="https://www.yourbusiness.com"
                    className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div>
                  <label htmlFor="hourlyRate" className="block text-sm font-medium text-blue-200 mb-2">
                    Hourly Rate
                  </label>
                  <input
                    type="text"
                    id="hourlyRate"
                    name="hourlyRate"
                    value={formData.hourlyRate || ''}
                    onChange={handleInputChange}
                    placeholder="$75/hour"
                    className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="businessAddress" className="block text-sm font-medium text-blue-200 mb-2">
                    Business Address
                  </label>
                  <input
                    type="text"
                    id="businessAddress"
                    name="businessAddress"
                    value={formData.businessAddress || ''}
                    onChange={handleInputChange}
                    placeholder="123 Main St, Atlanta, GA 30309"
                    className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Professional Details */}
          {profile.userType === 'technician' && (
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-6">Professional Details</h2>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="experience" className="block text-sm font-medium text-blue-200 mb-2">
                      Years of Experience
                    </label>
                    <input
                      type="text"
                      id="experience"
                      name="experience"
                      value={formData.experience || ''}
                      onChange={handleInputChange}
                      placeholder="5 years"
                      className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label htmlFor="serviceArea" className="block text-sm font-medium text-blue-200 mb-2">
                      Service Area
                    </label>
                    <input
                      type="text"
                      id="serviceArea"
                      name="serviceArea"
                      value={formData.serviceArea || ''}
                      onChange={handleInputChange}
                      placeholder="Atlanta Metro Area, within 25 miles"
                      className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="certifications" className="block text-sm font-medium text-blue-200 mb-2">
                    Certifications & Licenses
                  </label>
                  <input
                    type="text"
                    id="certifications"
                    name="certifications"
                    value={formData.certifications || ''}
                    onChange={handleInputChange}
                    placeholder="Licensed Master Plumber, EPA Certified"
                    className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div>
                  <label htmlFor="availability" className="block text-sm font-medium text-blue-200 mb-2">
                    Availability
                  </label>
                  <input
                    type="text"
                    id="availability"
                    name="availability"
                    value={formData.availability || ''}
                    onChange={handleInputChange}
                    placeholder="Monday-Friday 8AM-6PM, Emergency calls 24/7"
                    className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-blue-200 mb-2">
                    Professional Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description || ''}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Tell customers about your services, specialties, what makes you great, your experience, and why they should choose you..."
                    className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-between items-center">
            <div>
              <button
                type="button"
                onClick={handleDeleteProfile}
                disabled={isDeleting}
                className="px-6 py-3 bg-red-600/20 border border-red-500/50 text-red-300 rounded-xl font-medium hover:bg-red-600/30 hover:text-red-200 transition-all duration-200 disabled:opacity-50"
              >
                {isDeleting ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Deleting...
                  </div>
                ) : (
                  'Delete Profile'
                )}
              </button>
            </div>
            
            <div className="flex gap-4">
              <Link
                href={profile?.userType === 'technician' ? '/dashboard' : '/'}
                className="px-8 py-3 border border-blue-500/30 rounded-xl text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all duration-200 font-medium"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSaving}
                className="px-8 py-3 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </div>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}